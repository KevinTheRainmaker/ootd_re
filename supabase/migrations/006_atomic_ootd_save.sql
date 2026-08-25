-- 006_atomic_ootd_save.sql
-- 저장 재시도 중복 방지 + OOTD/아이템 원자 저장

ALTER TABLE ootd_records
  ADD COLUMN IF NOT EXISTS client_request_id uuid,
  ADD COLUMN IF NOT EXISTS request_fingerprint text;

CREATE UNIQUE INDEX IF NOT EXISTS ootd_records_user_request_idx
  ON ootd_records (user_id, client_request_id);

-- 이 앱은 NextAuth + 서버 service_role 경로로만 쓰기를 수행한다.
-- 브라우저의 PostgREST 직접 쓰기로 API 검증을 우회하지 못하게 차단한다.
REVOKE INSERT, UPDATE, DELETE ON TABLE ootd_records, ootd_items
  FROM anon, authenticated;

CREATE OR REPLACE FUNCTION create_ootd_with_items(
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
RETURNS ootd_records
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  saved_record ootd_records;
BEGIN
  INSERT INTO ootd_records (
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
    FROM ootd_records
    WHERE user_id = p_user_id
      AND client_request_id = p_client_request_id;

    IF saved_record.request_fingerprint IS DISTINCT FROM p_request_fingerprint THEN
      RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE = 'P0001';
    END IF;

    RETURN saved_record;
  END IF;

  INSERT INTO ootd_items (
    ootd_id,
    category,
    color,
    style_description,
    brand,
    product_name,
    order_idx
  )
  SELECT
    saved_record.id,
    item.category,
    item.color,
    item.style_description,
    item.brand,
    item.product_name,
    item.order_idx
  FROM jsonb_to_recordset(p_items) AS item(
    category text,
    color text,
    style_description text,
    brand text,
    product_name text,
    order_idx integer
  );

  RETURN saved_record;
END;
$$;

REVOKE ALL ON FUNCTION create_ootd_with_items(
  uuid, uuid, text, date, text, text, text, text[], boolean, text, text, text, text, jsonb, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION create_ootd_with_items(
  uuid, uuid, text, date, text, text, text, text[], boolean, text, text, text, text, jsonb, jsonb
) TO service_role;
