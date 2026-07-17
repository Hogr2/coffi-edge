-- 001_initial_schema.sql
-- coffee-edge: initial schema (categories, items, prices) + locked RLS + service_role grants.
-- Access model: browser (anon/authenticated) gets ZERO DB access; all reads/writes
-- go through the server using the service_role key.

-- =====================================================================
-- 1. Tables
-- =====================================================================

create table categories (
  id         uuid primary key default gen_random_uuid(),
  name_ar    text not null,
  name_en    text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table items (
  id           uuid primary key default gen_random_uuid(),
  -- RESTRICT: a category that still has items cannot be deleted
  category_id  uuid not null references categories(id) on delete restrict,
  name_ar      text not null,
  name_en      text not null,
  image_url    text,                            -- null = use a default image
  is_available boolean not null default true,   -- false = "currently unavailable", still visible
  is_new       boolean not null default false,  -- "new" badge
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);

create table prices (
  id            uuid primary key default gen_random_uuid(),
  -- CASCADE: deleting an item removes its prices automatically
  item_id       uuid not null references items(id) on delete cascade,
  size_label_ar text,             -- null = single price, no size shown
  size_label_en text,
  price         numeric not null, -- formatting/currency handled in the app
  sort_order    int not null default 0
);

create index items_category_id_idx on items (category_id);
create index prices_item_id_idx on prices (item_id);

-- =====================================================================
-- 2. Lock down RLS (no policies: anon/authenticated are denied everything)
-- =====================================================================

alter table categories enable row level security;
alter table items      enable row level security;
alter table prices     enable row level security;

-- =====================================================================
-- 3. service_role grants — required because "expose new tables" is OFF,
--    so nothing gets default privileges (not even service_role)
-- =====================================================================

grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- and for any tables/sequences added by LATER migrations:
alter default privileges in schema public
  grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public
  grant usage, select on sequences to service_role;
