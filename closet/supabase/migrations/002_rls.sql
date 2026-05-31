-- RLS 활성화
alter table users enable row level security;
alter table ootd_records enable row level security;
alter table ootd_items enable row level security;
alter table usage_logs enable row level security;

-- users: 본인만
create policy "users_self" on users for all using (auth.uid() = id);

-- ootd_records: 본인 + 공개
create policy "ootd_owner" on ootd_records for all using (auth.uid() = user_id);
create policy "ootd_public" on ootd_records for select using (is_public = true);

-- ootd_items: 부모 ootd 소유자
create policy "items_owner" on ootd_items for all
  using (exists (select 1 from ootd_records where id = ootd_id and user_id = auth.uid()));
create policy "items_public" on ootd_items for select
  using (exists (select 1 from ootd_records where id = ootd_id and is_public = true));

-- usage_logs: 본인만
create policy "usage_owner" on usage_logs for all using (auth.uid() = user_id);
