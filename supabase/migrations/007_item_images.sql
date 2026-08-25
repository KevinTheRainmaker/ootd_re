-- 007_item_images.sql
-- Wardrobe-style item crop/cutout storage and atomic persistence

ALTER TABLE public.ootd_items
  ADD COLUMN IF NOT EXISTS image_path text,
  ADD COLUMN IF NOT EXISTS crop_image_path text,
  ADD COLUMN IF NOT EXISTS bounding_box jsonb;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'items',
  'items',
  false,
  10485760,
  ARRAY['image/png']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

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
  INSERT INTO public.ootd_records (
    user_id,
    client_request_id,
    request_fingerprint,
    date,
    original_image_url,
    card_image_url,
    style_summary,
    hashtags,
    is_public,
    share_id,
    memo,
    plan_used,
    mood,
    weather_snapshot
  )
  VALUES (
    p_user_id,
    p_client_request_id,
    p_request_fingerprint,
    p_date,
    p_original_image_url,
    p_card_image_url,
    p_style_summary,
    p_hashtags,
    p_is_public,
    p_share_id,
    p_memo,
    p_plan_used,
    p_mood,
    p_weather_snapshot
  )
  ON CONFLICT (user_id, client_request_id) DO NOTHING
  RETURNING * INTO saved_record;

  IF saved_record.id IS NULL THEN
    SELECT * INTO saved_record
    FROM public.ootd_records
    WHERE user_id = p_user_id
      AND client_request_id = p_client_request_id;

    IF saved_record.request_fingerprint IS DISTINCT FROM p_request_fingerprint THEN
      RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE = 'P0001';
    END IF;

    RETURN saved_record;
  END IF;

  INSERT INTO public.ootd_items (
    ootd_id,
    category,
    color,
    style_description,
    brand,
    product_name,
    image_path,
    crop_image_path,
    bounding_box,
    order_idx
  )
  SELECT
    saved_record.id,
    item.category,
    item.color,
    item.style_description,
    item.brand,
    item.product_name,
    item.image_path,
    item.crop_image_path,
    item.bounding_box,
    item.order_idx
  FROM jsonb_to_recordset(p_items) AS item(
    category text,
    color text,
    style_description text,
    brand text,
    product_name text,
    image_path text,
    crop_image_path text,
    bounding_box jsonb,
    order_idx integer
  );

  RETURN saved_record;
END;
$$;

REVOKE ALL ON FUNCTION public.create_ootd_with_items(
  uuid, uuid, text, date, text, text, text, text[], boolean, text, text, text, text, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_ootd_with_items(
  uuid, uuid, text, date, text, text, text, text[], boolean, text, text, text, text, jsonb, jsonb
) TO service_role;

NOTIFY pgrst, 'reload schema';
