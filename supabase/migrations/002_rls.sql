-- 002_rls.sql
-- Row Level Security 정책

-- RLS 활성화
alter table users enable row level security;
alter table ootd_records enable row level security;
alter table ootd_items enable row level security;
alter table usage_logs enable row level security;

-- -------------------------
-- users
-- -------------------------

-- 본인 레코드만 조회
create policy "users: self select"
  on users for select
  using (auth.uid() = id);

-- 본인 레코드만 수정
create policy "users: self update"
  on users for update
  using (auth.uid() = id);

-- 회원가입 시 insert (auth.uid()와 id 일치)
create policy "users: self insert"
  on users for insert
  with check (auth.uid() = id);

-- -------------------------
-- ootd_records
-- -------------------------

-- 본인 레코드 전체 조회
create policy "ootd_records: owner select"
  on ootd_records for select
  using (auth.uid() = user_id);

-- 공개 OOTD는 비로그인도 조회 가능
create policy "ootd_records: public select"
  on ootd_records for select
  using (is_public = true);

-- 본인만 insert
create policy "ootd_records: owner insert"
  on ootd_records for insert
  with check (auth.uid() = user_id);

-- 본인만 update
create policy "ootd_records: owner update"
  on ootd_records for update
  using (auth.uid() = user_id);

-- 본인만 delete
create policy "ootd_records: owner delete"
  on ootd_records for delete
  using (auth.uid() = user_id);

-- -------------------------
-- ootd_items
-- -------------------------

-- 본인 OOTD의 아이템 조회
create policy "ootd_items: owner select"
  on ootd_items for select
  using (
    exists (
      select 1 from ootd_records
      where ootd_records.id = ootd_items.ootd_id
        and ootd_records.user_id = auth.uid()
    )
  );

-- 공개 OOTD의 아이템은 비로그인도 조회 가능
create policy "ootd_items: public select"
  on ootd_items for select
  using (
    exists (
      select 1 from ootd_records
      where ootd_records.id = ootd_items.ootd_id
        and ootd_records.is_public = true
    )
  );

-- 본인 OOTD에만 insert
create policy "ootd_items: owner insert"
  on ootd_items for insert
  with check (
    exists (
      select 1 from ootd_records
      where ootd_records.id = ootd_items.ootd_id
        and ootd_records.user_id = auth.uid()
    )
  );

-- 본인 OOTD 아이템만 update
create policy "ootd_items: owner update"
  on ootd_items for update
  using (
    exists (
      select 1 from ootd_records
      where ootd_records.id = ootd_items.ootd_id
        and ootd_records.user_id = auth.uid()
    )
  );

-- 본인 OOTD 아이템만 delete
create policy "ootd_items: owner delete"
  on ootd_items for delete
  using (
    exists (
      select 1 from ootd_records
      where ootd_records.id = ootd_items.ootd_id
        and ootd_records.user_id = auth.uid()
    )
  );

-- -------------------------
-- usage_logs
-- -------------------------

-- 본인 사용량만 조회
create policy "usage_logs: owner select"
  on usage_logs for select
  using (auth.uid() = user_id);

-- 본인 사용량만 insert
create policy "usage_logs: owner insert"
  on usage_logs for insert
  with check (auth.uid() = user_id);

-- 본인 사용량만 update
create policy "usage_logs: owner update"
  on usage_logs for update
  using (auth.uid() = user_id);

-- -------------------------
-- service_role bypass
-- service_role 키는 RLS를 자동으로 우회하므로 별도 정책 불필요.
-- API Routes에서 supabaseAdmin (service_role) 사용 시 모든 테이블 접근 가능.
-- -------------------------
