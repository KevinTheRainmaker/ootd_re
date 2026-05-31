-- users
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  image_url text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz not null default now()
);

-- ootd_records
create table ootd_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  date date not null default current_date,
  original_image_url text not null,
  card_image_url text,
  mood text not null default 'happy' check (mood in ('passion','happy','calm','cozy','creative')),
  is_public boolean not null default false,
  created_at timestamptz not null default now()
);

-- ootd_items
create table ootd_items (
  id uuid primary key default gen_random_uuid(),
  ootd_id uuid not null references ootd_records(id) on delete cascade,
  category text not null,
  brand text,
  product_name text,
  style_description text,
  color text,
  order_idx integer not null default 0,
  created_at timestamptz not null default now()
);

-- usage_logs
create table usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  year_month text not null,
  card_generation_count integer not null default 0,
  unique(user_id, year_month)
);

-- indexes
create index ootd_records_user_id_date_idx on ootd_records(user_id, date desc);
create index ootd_items_ootd_id_idx on ootd_items(ootd_id, order_idx);
create index usage_logs_user_id_year_month_idx on usage_logs(user_id, year_month);
