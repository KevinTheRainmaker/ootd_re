-- 009_analysis_security.sql
-- Atomic monthly analysis quota and per-user concurrency lease.

BEGIN;

ALTER TABLE public.usage_logs
  ADD COLUMN IF NOT EXISTS analysis_generation_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.ootd_analysis_leases (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  claim_token uuid,
  lease_expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ootd_analysis_leases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ootd_analysis_leases FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.ootd_analysis_leases TO service_role;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.usage_logs FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.claim_ootd_analysis(p_user_id uuid)
RETURNS TABLE(disposition text, claim_token uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lease public.ootd_analysis_leases;
  v_token uuid;
  v_plan text;
  v_limit integer;
  v_now timestamptz := clock_timestamp();
  v_month text := to_char(timezone('Asia/Seoul', clock_timestamp()), 'YYYY-MM');
BEGIN
  INSERT INTO public.ootd_analysis_leases(user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO v_lease FROM public.ootd_analysis_leases
  WHERE user_id = p_user_id FOR UPDATE;

  IF v_lease.lease_expires_at > v_now THEN
    RETURN QUERY SELECT 'busy'::text, NULL::uuid;
    RETURN;
  END IF;

  SELECT COALESCE(plan, 'free') INTO v_plan
  FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0001';
  END IF;
  v_limit := CASE WHEN v_plan = 'pro' THEN 60 ELSE 10 END;

  INSERT INTO public.usage_logs(
    user_id, year_month, card_generation_count,
    item_generation_count, analysis_generation_count
  ) VALUES (p_user_id, v_month, 0, 0, 0)
  ON CONFLICT (user_id, year_month) DO NOTHING;

  UPDATE public.usage_logs
  SET analysis_generation_count = analysis_generation_count + 1,
      updated_at = v_now
  WHERE user_id = p_user_id AND year_month = v_month
    AND analysis_generation_count < v_limit;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'analysis_quota_exceeded' USING ERRCODE = 'P0001';
  END IF;

  v_token := gen_random_uuid();
  UPDATE public.ootd_analysis_leases
  SET claim_token = v_token,
      lease_expires_at = v_now + interval '3 minutes',
      updated_at = v_now
  WHERE user_id = p_user_id;

  RETURN QUERY SELECT 'claimed'::text, v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_ootd_analysis(
  p_user_id uuid,
  p_claim_token uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  UPDATE public.ootd_analysis_leases
  SET claim_token = NULL, lease_expires_at = NULL, updated_at = clock_timestamp()
  WHERE user_id = p_user_id AND claim_token = p_claim_token
  RETURNING true;
$$;

REVOKE ALL ON FUNCTION public.claim_ootd_analysis(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_ootd_analysis(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ootd_analysis(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_ootd_analysis(uuid, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
