-- 001_initial.sql
-- 4개 핵심 테이블 생성: users, ootd_records, ootd_items, usage_logs

-- UUID 확장 활성화
create extension if not exists "pgcrypto";

-- -------------------------
-- users
-- -------------------------
create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null unique,
  name          text,
  image         text,
  plan          text not null default 'free' check (plan in ('free', 'pro')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists users_email_idx on users (email);

-- -------------------------
-- ootd_records
-- -------------------------
create table if not exists ootd_records (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users (id) on delete cascade,
  date                date not null default current_date,
  original_image_url  text not null,
  card_image_url      text,
  style_summary       text,
  hashtags            text[] not null default '{}',
  is_public           boolean not null default false,
  share_id            text unique,
  memo                text,
  plan_used           text check (plan_used in ('A', 'B')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists ootd_records_user_id_idx on ootd_records (user_id);
create index if not exists ootd_records_date_idx on ootd_records (user_id, date desc);
create index if not exists ootd_records_share_id_idx on ootd_records (share_id) where share_id is not null;

-- -------------------------
-- ootd_items
-- -------------------------
create table if not exists ootd_items (
  id                uuid primary key default gen_random_uuid(),
  ootd_id           uuid not null references ootd_records (id) on delete cascade,
  category          text not null check (
    category in ('top', 'bottom', 'outer', 'shoes', 'bag', 'accessory', 'hat', 'glasses', 'watch', 'other')
  ),
  color             text,
  style_description text,
  brand             text,
  order_idx         integer not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists ootd_items_ootd_id_idx on ootd_items (ootd_id);

-- -------------------------
-- usage_logs
-- -------------------------
create table if not exists usage_logs (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references users (id) on delete cascade,
  year_month              text not null,  -- 'YYYY-MM'
  card_generation_count   integer not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  unique (user_id, year_month)
);

create index if not exists usage_logs_user_month_idx on usage_logs (user_id, year_month);

-- -------------------------
-- updated_at 자동 갱신 트리거
-- -------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at
  before update on users
  for each row execute function set_updated_at();

create trigger ootd_records_updated_at
  before update on ootd_records
  for each row execute function set_updated_at();

create trigger usage_logs_updated_at
  before update on usage_logs
  for each row execute function set_updated_at();
