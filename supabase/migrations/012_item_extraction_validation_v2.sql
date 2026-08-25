-- Make validation-v2 quality failures terminal so at-least-once queue
-- deliveries cannot repeat expensive image generation for the same job.

BEGIN;

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
  color_hex text,
  source_image_url text,
  error_code text
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
      v_job.category, v_job.color_hex, v_job.source_image_url, NULL::text;
    RETURN;
  END IF;
  IF v_job.status = 'failed' AND v_job.error_code = 'quality_mismatch_v2' THEN
    RETURN QUERY SELECT 'failed'::text, NULL::text, NULL::uuid,
      v_job.category, v_job.color_hex, NULL::text, v_job.error_code;
    RETURN;
  END IF;
  IF v_job.status = 'processing' AND v_job.lease_expires_at > v_now THEN
    RETURN QUERY SELECT 'busy'::text, NULL::text, NULL::uuid,
      v_job.category, v_job.color_hex, NULL::text, NULL::text;
    RETURN;
  END IF;
  IF v_job.attempts >= 3 THEN
    UPDATE public.item_extraction_jobs
    SET status = 'failed', lease_expires_at = NULL,
        error_code = COALESCE(error_code, 'attempts_exhausted'),
        error_message = COALESCE(error_message, 'maximum attempts exhausted'),
        updated_at = v_now
    WHERE user_id = p_user_id AND extraction_id = p_extraction_id
    RETURNING * INTO v_job;
    RETURN QUERY SELECT 'failed'::text, NULL::text, NULL::uuid,
      v_job.category, v_job.color_hex, NULL::text, v_job.error_code;
    RETURN;
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
      UPDATE public.item_extraction_jobs
      SET status = 'failed', lease_expires_at = NULL,
          error_code = 'quota_exceeded',
          error_message = 'monthly item generation quota exceeded',
          updated_at = v_now
      WHERE user_id = p_user_id AND extraction_id = p_extraction_id
      RETURNING * INTO v_job;
      RETURN QUERY SELECT 'failed'::text, NULL::text, NULL::uuid,
        v_job.category, v_job.color_hex, NULL::text, v_job.error_code;
      RETURN;
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
    v_job.category, v_job.color_hex, v_job.source_image_url, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_item_extraction(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_item_extraction(uuid, uuid, text)
  TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
