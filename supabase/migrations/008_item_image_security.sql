-- 008_item_image_security.sql
-- Private item assets, atomic extraction claims, and generation quota.

BEGIN;

ALTER TABLE public.ootd_items
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS crop_image_path text,
  ADD COLUMN IF NOT EXISTS bounding_box jsonb;

-- 007의 공개 URL 형식으로 이미 저장된 값이 있다면 private object path로 보존한다.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ootd_items'
      AND column_name = 'image_url'
  ) THEN
    EXECUTE $sql$
      UPDATE public.ootd_items
      SET image_path = COALESCE(
        image_path,
        NULLIF(regexp_replace(image_url, '^.*/storage/v1/object/public/items/', ''), image_url)
      )
      WHERE image_url IS NOT NULL
    $sql$;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ootd_items'
      AND column_name = 'crop_image_url'
  ) THEN
    EXECUTE $sql$
      UPDATE public.ootd_items
      SET crop_image_path = COALESCE(
        crop_image_path,
        NULLIF(regexp_replace(crop_image_url, '^.*/storage/v1/object/public/items/', ''), crop_image_url)
      )
      WHERE crop_image_url IS NOT NULL
    $sql$;
  END IF;
END $$;

-- 기존 URL 컬럼은 expand/contract 안전성을 위해 이번 migration에서는 유지한다.
-- private 전환 후 새 코드와 RPC는 path 컬럼만 사용한다.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('items', 'items', false, 10485760, ARRAY['image/png']::text[])
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

ALTER TABLE public.usage_logs
  ADD COLUMN IF NOT EXISTS item_generation_count integer NOT NULL DEFAULT 0;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.usage_logs FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS public.item_extraction_jobs (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  extraction_id uuid NOT NULL,
  crop_image_path text NOT NULL,
  request_fingerprint text NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  crop_sha256 text NOT NULL CHECK (crop_sha256 ~ '^[0-9a-f]{64}$'),
  bounding_box jsonb NOT NULL,
  category text NOT NULL CHECK (category IN (
    'top','bottom','outer','shoes','bag','accessory','hat','glasses','watch','other'
  )),
  color_hex text CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9a-f]{6}$'),
  image_path text,
  image_sha256 text CHECK (image_sha256 IS NULL OR image_sha256 ~ '^[0-9a-f]{64}$'),
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
  claim_token uuid,
  lease_expires_at timestamptz,
  quota_month text,
  quota_reserved_at timestamptz,
  error_code text,
  error_message text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, extraction_id),
  UNIQUE (extraction_id),
  UNIQUE (crop_image_path),
  UNIQUE (user_id, crop_sha256),
  CHECK (crop_image_path = user_id::text || '/' || extraction_id::text || '/crop.png'),
  CHECK ((quota_month IS NULL) = (quota_reserved_at IS NULL)),
  CHECK (
    image_path IS NULL OR (
      claim_token IS NOT NULL AND
      image_path = user_id::text || '/' || extraction_id::text ||
        '/claims/' || claim_token::text || '/cutout.png'
    )
  )
);

ALTER TABLE public.item_extraction_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.item_extraction_jobs FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.item_extraction_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.claim_item_extraction(
  p_user_id uuid,
  p_extraction_id uuid,
  p_crop_image_path text
)
RETURNS TABLE(
  disposition text,
  image_path text,
  claim_token uuid,
  category text,
  color_hex text
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_job public.item_extraction_jobs;
  v_plan text;
  v_limit integer;
  v_token uuid;
  v_now timestamptz := clock_timestamp();
  v_month text := to_char(timezone('Asia/Seoul', clock_timestamp()), 'YYYY-MM');
BEGIN
  IF p_crop_image_path IS DISTINCT FROM
     p_user_id::text || '/' || p_extraction_id::text || '/crop.png' THEN
    RAISE EXCEPTION 'extraction_conflict' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_job
  FROM public.item_extraction_jobs
  WHERE user_id = p_user_id AND extraction_id = p_extraction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'item_job_not_found' USING ERRCODE = 'P0001';
  END IF;

  IF v_job.crop_image_path IS DISTINCT FROM p_crop_image_path THEN
    RAISE EXCEPTION 'extraction_conflict' USING ERRCODE = 'P0001';
  END IF;

  IF v_job.status = 'completed' AND v_job.image_path IS NOT NULL THEN
    RETURN QUERY SELECT 'completed'::text, v_job.image_path, NULL::uuid,
      v_job.category, v_job.color_hex;
    RETURN;
  END IF;
  IF v_job.status = 'processing' AND v_job.lease_expires_at > v_now THEN
    RETURN QUERY SELECT 'busy'::text, NULL::text, NULL::uuid,
      v_job.category, v_job.color_hex;
    RETURN;
  END IF;
  IF v_job.attempts >= 3 THEN
    RAISE EXCEPTION 'item_job_attempts_exhausted' USING ERRCODE = 'P0001';
  END IF;

  IF v_job.quota_reserved_at IS NULL THEN
    SELECT COALESCE(plan, 'free') INTO v_plan
    FROM public.users WHERE id = p_user_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'user_not_found' USING ERRCODE = 'P0001';
    END IF;
    v_limit := CASE WHEN v_plan = 'pro' THEN 240 ELSE 40 END;

    INSERT INTO public.usage_logs (
      user_id, year_month, card_generation_count, item_generation_count
    ) VALUES (p_user_id, v_month, 0, 0)
    ON CONFLICT (user_id, year_month) DO NOTHING;

    UPDATE public.usage_logs
    SET item_generation_count = item_generation_count + 1,
        updated_at = v_now
    WHERE user_id = p_user_id AND year_month = v_month
      AND item_generation_count < v_limit;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'item_generation_quota_exceeded' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  v_token := gen_random_uuid();
  UPDATE public.item_extraction_jobs
  SET status = 'processing', attempts = attempts + 1,
      claim_token = v_token, lease_expires_at = v_now + interval '10 minutes',
      quota_month = COALESCE(quota_month, v_month),
      quota_reserved_at = COALESCE(quota_reserved_at, v_now),
      image_path = NULL, image_sha256 = NULL,
      error_code = NULL, error_message = NULL, completed_at = NULL,
      updated_at = v_now
  WHERE user_id = p_user_id AND extraction_id = p_extraction_id
  RETURNING * INTO v_job;

  RETURN QUERY SELECT 'claimed'::text, NULL::text, v_token,
    v_job.category, v_job.color_hex;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_item_extraction(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_item_extraction(uuid, uuid, text)
  TO service_role;

CREATE OR REPLACE FUNCTION public.complete_item_extraction(
  p_user_id uuid,
  p_extraction_id uuid,
  p_claim_token uuid,
  p_image_path text,
  p_image_sha256 text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE v_job public.item_extraction_jobs;
BEGIN
  SELECT * INTO v_job FROM public.item_extraction_jobs
  WHERE user_id = p_user_id AND extraction_id = p_extraction_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_job.status = 'completed' AND v_job.claim_token = p_claim_token
     AND v_job.image_path = p_image_path AND v_job.image_sha256 = p_image_sha256 THEN
    RETURN true;
  END IF;
  IF v_job.status <> 'processing' OR v_job.claim_token IS DISTINCT FROM p_claim_token THEN
    RETURN false;
  END IF;
  IF p_image_path IS DISTINCT FROM p_user_id::text || '/' || p_extraction_id::text ||
       '/claims/' || p_claim_token::text || '/cutout.png'
     OR p_image_sha256 !~ '^[0-9a-f]{64}$' THEN
    RETURN false;
  END IF;
  UPDATE public.item_extraction_jobs
  SET status = 'completed', image_path = p_image_path,
      image_sha256 = p_image_sha256, lease_expires_at = NULL,
      error_code = NULL, error_message = NULL,
      completed_at = clock_timestamp(), updated_at = clock_timestamp()
  WHERE user_id = p_user_id AND extraction_id = p_extraction_id
    AND status = 'processing' AND claim_token = p_claim_token;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_item_extraction(
  p_user_id uuid,
  p_extraction_id uuid,
  p_claim_token uuid,
  p_error_code text,
  p_error_message text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE v_job public.item_extraction_jobs;
BEGIN
  SELECT * INTO v_job FROM public.item_extraction_jobs
  WHERE user_id = p_user_id AND extraction_id = p_extraction_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF v_job.status = 'failed' AND v_job.claim_token = p_claim_token THEN
    RETURN true;
  END IF;
  IF v_job.status <> 'processing' OR v_job.claim_token IS DISTINCT FROM p_claim_token THEN
    RETURN false;
  END IF;
  UPDATE public.item_extraction_jobs
  SET status = 'failed', lease_expires_at = NULL,
      image_path = NULL, image_sha256 = NULL,
      error_code = left(p_error_code, 64),
      error_message = left(p_error_message, 1000),
      updated_at = clock_timestamp()
  WHERE user_id = p_user_id AND extraction_id = p_extraction_id
    AND status = 'processing' AND claim_token = p_claim_token;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_item_extraction(uuid, uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_item_extraction(uuid, uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_item_extraction(uuid, uuid, uuid, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_item_extraction(uuid, uuid, uuid, text, text)
  TO service_role;

ALTER TABLE public.ootd_items
  ADD COLUMN IF NOT EXISTS extraction_job_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.ootd_items'::regclass
      AND conname = 'ootd_items_extraction_job_fk'
  ) THEN
    ALTER TABLE public.ootd_items
      ADD CONSTRAINT ootd_items_extraction_job_fk
      FOREIGN KEY (extraction_job_id)
      REFERENCES public.item_extraction_jobs(extraction_id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_ootd_with_items(
  p_user_id uuid,
  p_client_request_id uuid,
  p_request_fingerprint text,
  p_date date,
  p_original_image_url text,
  p_card_image_url text,
  p_style_summary text,
  p_hashtags text[],
  p_is_public boolean,
  p_share_id text,
  p_memo text,
  p_plan_used text,
  p_mood text,
  p_weather_snapshot jsonb,
  p_items jsonb
)
RETURNS public.ootd_records
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  saved_record public.ootd_records;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(COALESCE(p_items, '[]'::jsonb)) AS item(
      extraction_job_id uuid, image_path text, crop_image_path text
    )
    LEFT JOIN public.item_extraction_jobs job
      ON job.extraction_id = item.extraction_job_id
      AND job.user_id = p_user_id
      AND job.status = 'completed'
      AND job.image_path = item.image_path
      AND job.crop_image_path = item.crop_image_path
    WHERE NOT (
      (item.extraction_job_id IS NULL AND item.image_path IS NULL
        AND item.crop_image_path IS NULL)
      OR
      (item.extraction_job_id IS NOT NULL AND item.image_path IS NOT NULL
        AND item.crop_image_path IS NOT NULL AND job.extraction_id IS NOT NULL)
    )
  ) THEN
    RAISE EXCEPTION 'invalid_item_asset_path' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.ootd_records (
    user_id, client_request_id, request_fingerprint, date,
    original_image_url, card_image_url, style_summary, hashtags,
    is_public, share_id, memo, plan_used, mood, weather_snapshot
  ) VALUES (
    p_user_id, p_client_request_id, p_request_fingerprint, p_date,
    p_original_image_url, p_card_image_url, p_style_summary, p_hashtags,
    p_is_public, p_share_id, p_memo, p_plan_used, p_mood, p_weather_snapshot
  )
  ON CONFLICT (user_id, client_request_id) DO NOTHING
  RETURNING * INTO saved_record;

  IF saved_record.id IS NULL THEN
    SELECT * INTO saved_record FROM public.ootd_records
    WHERE user_id = p_user_id AND client_request_id = p_client_request_id;
    IF saved_record.request_fingerprint IS DISTINCT FROM p_request_fingerprint THEN
      RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE = 'P0001';
    END IF;
    RETURN saved_record;
  END IF;

  INSERT INTO public.ootd_items (
    ootd_id, category, color, style_description, brand, product_name,
    extraction_job_id, image_path, crop_image_path, bounding_box, order_idx
  )
  SELECT saved_record.id, item.category, item.color,
    item.style_description, item.brand, item.product_name,
    item.extraction_job_id, item.image_path, item.crop_image_path,
    item.bounding_box, item.order_idx
  FROM jsonb_to_recordset(p_items) AS item(
    category text, color text, style_description text, brand text,
    product_name text, extraction_job_id uuid, image_path text, crop_image_path text,
    bounding_box jsonb, order_idx integer
  );

  RETURN saved_record;
END;
$$;

REVOKE ALL ON FUNCTION public.create_ootd_with_items(
  uuid, uuid, text, date, text, text, text, text[], boolean, text,
  text, text, text, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_ootd_with_items(
  uuid, uuid, text, date, text, text, text, text[], boolean, text,
  text, text, text, jsonb, jsonb
) TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
