-- 004_product_name.sql
-- ootd_items에 product_name 컬럼 추가 (types/index.ts OotdItem과 동기화)
ALTER TABLE ootd_items ADD COLUMN IF NOT EXISTS product_name text;
