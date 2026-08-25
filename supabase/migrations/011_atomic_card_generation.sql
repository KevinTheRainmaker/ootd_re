-- 011_atomic_card_generation.sql
-- Atomic, idempotent AI card quota reservations with claim-token fencing.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.usage_logs'::regclass
      AND conname = 'usage_logs_card_generation_nonnegative'
  ) THEN
    ALTER TABLE public.usage_logs
      ADD CONSTRAINT usage_logs_card_generation_nonnegative
      CHECK (card_generation_count >= 0);
  END IF;
END;
$$;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.usage_logs
  FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.card_generation_requests (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  request_id uuid NOT NULL,
  request_fingerprint text NOT NULL
    CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  status text NOT NULL
    CHECK (status IN ('reserved', 'succeeded', 'refunded')),
  quota_month text NOT NULL
    CHECK (quota_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  reserved_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts BETWEEN 1 AND 3),
  claim_token uuid NOT NULL,
  lease_expires_at timestamptz,
  result_card_image_url text,
  result_plan_used text
    CHECK (result_plan_used IS NULL OR result_plan_used IN ('A', 'B')),
  error_code text,
  error_message text,
  succeeded_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_id),
  CHECK (
    (
      status = 'reserved'
      AND lease_expires_at IS NOT NULL
      AND result_card_image_url IS NULL
      AND result_plan_used IS NULL
      AND succeeded_at IS NULL
      AND refunded_at IS NULL
    ) OR (
      status = 'succeeded'
      AND lease_expires_at IS NULL
      AND result_card_image_url IS NOT NULL
      AND result_plan_used IS NOT NULL
      AND succeeded_at IS NOT NULL
      AND refunded_at IS NULL
    ) OR (
      status = 'refunded'
      AND lease_expires_at IS NULL
      AND result_card_image_url IS NULL
      AND result_plan_used IS NULL
      AND succeeded_at IS NULL
      AND refunded_at IS NOT NULL
    )
  )
);

CREATE INDEX IF NOT EXISTS card_generation_requests_lease_idx
  ON public.card_generation_requests(status, lease_expires_at);

ALTER TABLE public.card_generation_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.card_generation_requests
  FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.card_generation_requests
  TO service_role;

DROP TRIGGER IF EXISTS card_generation_requests_updated_at
  ON public.card_generation_requests;
CREATE TRIGGER card_generation_requests_updated_at
  BEFORE UPDATE ON public.card_generation_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.reserve_card_generation(
  p_user_id uuid,
  p_request_id uuid,
  p_request_fingerprint text
)
RETURNS TABLE(
  disposition text,
  worker_token uuid,
  current_count integer,
  monthly_limit integer,
  card_image_url text,
  plan_used text,
  error_code text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request public.card_generation_requests;
  v_token uuid := gen_random_uuid();
  v_now timestamptz := clock_timestamp();
  v_month text := to_char(timezone('Asia/Seoul', clock_timestamp()), 'YYYY-MM');
  v_limit integer;
  v_count integer;
  v_inserted boolean;
BEGIN
  IF p_request_fingerprint !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid_card_request_fingerprint' USING ERRCODE = 'P0001';
  END IF;

  SELECT CASE plan WHEN 'pro' THEN 30 ELSE 5 END
  INTO v_limit
  FROM public.users
  WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.card_generation_requests(
    user_id, request_id, request_fingerprint, status, quota_month,
    reserved_at, attempts, claim_token, lease_expires_at
  ) VALUES (
    p_user_id, p_request_id, p_request_fingerprint, 'reserved', v_month,
    v_now, 1, v_token, v_now + interval '10 minutes'
  )
  ON CONFLICT (user_id, request_id) DO NOTHING
  RETURNING * INTO v_request;
  v_inserted := FOUND;

  IF v_inserted THEN
    INSERT INTO public.usage_logs(user_id, year_month)
    VALUES (p_user_id, v_month)
    ON CONFLICT (user_id, year_month) DO NOTHING;

    UPDATE public.usage_logs
    SET card_generation_count = card_generation_count + 1,
        updated_at = v_now
    WHERE user_id = p_user_id
      AND year_month = v_month
      AND card_generation_count < v_limit
    RETURNING card_generation_count INTO v_count;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'card_generation_quota_exceeded' USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY SELECT
      'claimed'::text, v_token, v_count, v_limit,
      NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;

  SELECT * INTO v_request
  FROM public.card_generation_requests
  WHERE user_id = p_user_id AND request_id = p_request_id
  FOR UPDATE;

  IF v_request.request_fingerprint IS DISTINCT FROM p_request_fingerprint THEN
    RAISE EXCEPTION 'card_generation_idempotency_conflict' USING ERRCODE = 'P0001';
  END IF;

  SELECT card_generation_count INTO v_count
  FROM public.usage_logs
  WHERE user_id = p_user_id AND year_month = v_request.quota_month;
  v_count := COALESCE(v_count, 0);

  IF v_request.status = 'succeeded' THEN
    RETURN QUERY SELECT
      'completed'::text, NULL::uuid, v_count, v_limit,
      v_request.result_card_image_url, v_request.result_plan_used, NULL::text;
    RETURN;
  END IF;
  IF v_request.status = 'refunded' THEN
    RETURN QUERY SELECT
      'refunded'::text, NULL::uuid, v_count, v_limit,
      NULL::text, NULL::text, v_request.error_code;
    RETURN;
  END IF;
  IF v_request.lease_expires_at > v_now THEN
    RETURN QUERY SELECT
      'busy'::text, NULL::uuid, v_count, v_limit,
      NULL::text, NULL::text, NULL::text;
    RETURN;
  END IF;
  IF v_request.attempts >= 3 THEN
    RETURN QUERY SELECT
      'stalled'::text, NULL::uuid, v_count, v_limit,
      NULL::text, NULL::text, 'attempts_exhausted'::text;
    RETURN;
  END IF;

  v_token := gen_random_uuid();
  UPDATE public.card_generation_requests
  SET claim_token = v_token,
      lease_expires_at = v_now + interval '10 minutes',
      attempts = attempts + 1,
      error_code = NULL,
      error_message = NULL
  WHERE user_id = p_user_id AND request_id = p_request_id;

  RETURN QUERY SELECT
    'claimed'::text, v_token, v_count, v_limit,
    NULL::text, NULL::text, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_card_generation(
  p_user_id uuid,
  p_request_id uuid,
  p_claim_token uuid,
  p_card_image_url text,
  p_plan_used text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request public.card_generation_requests;
BEGIN
  IF p_card_image_url IS NULL
     OR length(p_card_image_url) = 0
     OR length(p_card_image_url) > 4096
     OR p_plan_used IS NULL
     OR p_plan_used NOT IN ('A', 'B') THEN
    RETURN false;
  END IF;

  SELECT * INTO v_request
  FROM public.card_generation_requests
  WHERE user_id = p_user_id AND request_id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  IF v_request.status = 'succeeded'
     AND v_request.claim_token = p_claim_token
     AND v_request.result_card_image_url = p_card_image_url
     AND v_request.result_plan_used = p_plan_used THEN
    RETURN true;
  END IF;
  IF v_request.status <> 'reserved'
     OR v_request.claim_token IS DISTINCT FROM p_claim_token THEN
    RETURN false;
  END IF;

  UPDATE public.card_generation_requests
  SET status = 'succeeded',
      lease_expires_at = NULL,
      result_card_image_url = p_card_image_url,
      result_plan_used = p_plan_used,
      succeeded_at = clock_timestamp(),
      error_code = NULL,
      error_message = NULL
  WHERE user_id = p_user_id
    AND request_id = p_request_id
    AND status = 'reserved'
    AND claim_token = p_claim_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'card_completion_state_changed' USING ERRCODE = 'P0001';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_card_generation(
  p_user_id uuid,
  p_request_id uuid,
  p_claim_token uuid,
  p_error_code text,
  p_error_message text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request public.card_generation_requests;
  v_count integer;
BEGIN
  SELECT * INTO v_request
  FROM public.card_generation_requests
  WHERE user_id = p_user_id AND request_id = p_request_id
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;

  IF v_request.status = 'refunded'
     AND v_request.claim_token = p_claim_token THEN
    RETURN true;
  END IF;
  IF v_request.status <> 'reserved'
     OR v_request.claim_token IS DISTINCT FROM p_claim_token THEN
    RETURN false;
  END IF;

  UPDATE public.usage_logs
  SET card_generation_count = card_generation_count - 1,
      updated_at = clock_timestamp()
  WHERE user_id = p_user_id
    AND year_month = v_request.quota_month
    AND card_generation_count > 0
  RETURNING card_generation_count INTO v_count;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'card_quota_reservation_corrupt' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.card_generation_requests
  SET status = 'refunded',
      lease_expires_at = NULL,
      result_card_image_url = NULL,
      result_plan_used = NULL,
      error_code = left(COALESCE(p_error_code, 'generation_failed'), 64),
      error_message = left(COALESCE(p_error_message, 'unknown'), 1000),
      refunded_at = clock_timestamp()
  WHERE user_id = p_user_id
    AND request_id = p_request_id
    AND status = 'reserved'
    AND claim_token = p_claim_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'card_refund_state_changed' USING ERRCODE = 'P0001';
  END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.refund_expired_card_generations(
  p_batch_size integer DEFAULT 100
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_request public.card_generation_requests;
  v_count integer;
  v_refunded integer := 0;
  v_now timestamptz := clock_timestamp();
BEGIN
  FOR v_request IN
    SELECT *
    FROM public.card_generation_requests
    WHERE status = 'reserved' AND lease_expires_at < v_now
    ORDER BY lease_expires_at
    LIMIT LEAST(GREATEST(COALESCE(p_batch_size, 100), 1), 1000)
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE public.usage_logs
    SET card_generation_count = card_generation_count - 1,
        updated_at = v_now
    WHERE user_id = v_request.user_id
      AND year_month = v_request.quota_month
      AND card_generation_count > 0
    RETURNING card_generation_count INTO v_count;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'card_quota_reservation_corrupt' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.card_generation_requests
    SET status = 'refunded',
        lease_expires_at = NULL,
        error_code = 'lease_expired',
        error_message = 'generation lease expired',
        refunded_at = v_now
    WHERE user_id = v_request.user_id
      AND request_id = v_request.request_id
      AND status = 'reserved'
      AND claim_token = v_request.claim_token;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'card_refund_state_changed' USING ERRCODE = 'P0001';
    END IF;
    v_refunded := v_refunded + 1;
  END LOOP;
  RETURN v_refunded;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_card_generation(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_card_generation(uuid, uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_card_generation(uuid, uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_expired_card_generations(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_card_generation(uuid, uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_card_generation(uuid, uuid, uuid, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_card_generation(uuid, uuid, uuid, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_expired_card_generations(integer)
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
