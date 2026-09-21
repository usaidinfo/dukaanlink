-- DukaanLink database schema
-- Run this in the Supabase SQL Editor (Project -> SQL Editor -> New query)
-- Safe to re-run: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS where possible.

create extension if not exists "uuid-ossp";

-- 1. Businesses (the shop owner's profile)
create table if not exists businesses (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  category text,
  whatsapp_number text not null,
  slug text unique not null,
  logo_url text,
  cover_url text,
  description text,
  city text,
  address text,
  seo_title text,
  seo_description text,
  opening_hours jsonb,
  payment_qr_url text,
  upi_id text,
  payment_mode text default 'both',
  closed_today_date date,
  created_at timestamptz default now()
);

-- Upgrade path if you already ran an older schema
alter table businesses add column if not exists cover_url text;
alter table businesses add column if not exists description text;
alter table businesses add column if not exists city text;
alter table businesses add column if not exists address text;
alter table businesses add column if not exists seo_title text;
alter table businesses add column if not exists seo_description text;
alter table businesses add column if not exists opening_hours jsonb;
alter table businesses add column if not exists payment_qr_url text;
alter table businesses add column if not exists upi_id text;
alter table businesses add column if not exists payment_mode text default 'both';
alter table businesses add column if not exists closed_today_date date;

-- 2. Menu / catalog items
create table if not exists menu_items (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null,
  category text,
  description text,
  photo_url text,
  in_stock boolean default true,
  sort_order int default 0,
  quantity numeric(12,2),
  quantity_unit text,
  created_at timestamptz default now()
);

alter table menu_items add column if not exists description text;
alter table menu_items add column if not exists sort_order int default 0;
alter table menu_items add column if not exists quantity numeric(12,2);
alter table menu_items add column if not exists quantity_unit text;

-- 3. Orders (logged for the owner's dashboard; the actual order is sent via WhatsApp)
create table if not exists orders (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade,
  items jsonb not null,       -- [{name, price, qty}]
  total numeric(10,2) not null,
  customer_note text,
  customer_whatsapp text,
  customer_name text,
  status text default 'received', -- received | preparing | done | cancelled
  created_at timestamptz default now()
);

alter table orders add column if not exists customer_whatsapp text;
alter table orders add column if not exists customer_name text;

-- 4. Flagged customer numbers (owner warning only — does not block orders)
create table if not exists flagged_customers (
  id uuid primary key default uuid_generate_v4(),
  business_id uuid references businesses(id) on delete cascade not null,
  whatsapp_number text not null,
  note text,
  created_at timestamptz default now(),
  unique (business_id, whatsapp_number)
);

create index if not exists flagged_customers_business_id_idx on flagged_customers (business_id);

-- Indexes for public shop + SEO listing
create index if not exists businesses_slug_idx on businesses (slug);
create index if not exists menu_items_business_id_idx on menu_items (business_id);
create index if not exists orders_business_id_idx on orders (business_id);

-- Live order alerts for owners (Dashboard Realtime)
-- If this errors because it's already enabled, ignore it.
do $$
begin
  alter publication supabase_realtime add table orders;
exception
  when others then
    null;
end $$;

-- Row Level Security
alter table businesses enable row level security;
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table flagged_customers enable row level security;

-- Policies: drop + recreate so re-running this file is safe
drop policy if exists "Owners manage own business" on businesses;
drop policy if exists "Public can read businesses" on businesses;
drop policy if exists "Owners manage own menu items" on menu_items;
drop policy if exists "Public can read menu items" on menu_items;
drop policy if exists "Public can create orders" on orders;
drop policy if exists "Owners manage own orders" on orders;
drop policy if exists "Owners update own orders" on orders;
drop policy if exists "Owners manage own flagged customers" on flagged_customers;

create policy "Owners manage own business" on businesses
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "Public can read businesses" on businesses
  for select using (true);

create policy "Owners manage own menu items" on menu_items
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  ) with check (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

create policy "Public can read menu items" on menu_items
  for select using (true);

create policy "Public can create orders" on orders
  for insert with check (true);

create policy "Owners manage own orders" on orders
  for select using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

create policy "Owners update own orders" on orders
  for update using (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

create policy "Owners manage own flagged customers" on flagged_customers
  for all using (
    business_id in (select id from businesses where owner_id = auth.uid())
  ) with check (
    business_id in (select id from businesses where owner_id = auth.uid())
  );

-- Storage bucket for menu photos / logos (public read)
insert into storage.buckets (id, name, public)
values ('menu-photos', 'menu-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read menu photos" on storage.objects;
drop policy if exists "Owners upload menu photos" on storage.objects;
drop policy if exists "Owners update menu photos" on storage.objects;
drop policy if exists "Owners delete menu photos" on storage.objects;

create policy "Public read menu photos" on storage.objects
  for select using (bucket_id = 'menu-photos');

create policy "Owners upload menu photos" on storage.objects
  for insert with check (
    bucket_id = 'menu-photos' and auth.role() = 'authenticated'
  );

create policy "Owners update menu photos" on storage.objects
  for update using (
    bucket_id = 'menu-photos' and auth.role() = 'authenticated'
  );

create policy "Owners delete menu photos" on storage.objects
  for delete using (
    bucket_id = 'menu-photos' and auth.role() = 'authenticated'
  );
