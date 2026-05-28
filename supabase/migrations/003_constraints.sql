-- is_public=true이면 share_id가 반드시 존재해야 함 (공유 페이지 깨짐 방지)
ALTER TABLE ootd_records
ADD CONSTRAINT check_public_share_id
CHECK (NOT (is_public = true AND share_id IS NULL));

-- MVP 제외 컬럼 제거 (S1 스코프 결정)
ALTER TABLE ootd_items
DROP COLUMN IF EXISTS purchase_url,
DROP COLUMN IF EXISTS price,
DROP COLUMN IF EXISTS size,
DROP COLUMN IF EXISTS is_ad;
