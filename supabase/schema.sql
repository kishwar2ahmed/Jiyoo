-- ============================================================================
-- JIYOO – Production Supabase PostgreSQL Schema, Storage & RLS Policies
-- Execute this script in the Supabase SQL Editor to provision all tables,
-- indexes, triggers, storage buckets, and Row Level Security (RLS) policies.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Automatic updated_at Trigger Function
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2. Admin RBAC Helper Function (Zero-Trust Check)
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    or lower(coalesce(auth.jwt() ->> 'email', '')) in (
      'yoyokishwar@gmail.com',
      'shamsjiyoo@gmail.com',
      'jiyooshams@gmail.com',
      'syedshams7799@gmail.com'
    ),
    false
  );
$$;

-- ----------------------------------------------------------------------------
-- 3. Core Multi-Collection Document Mirror Table (jiyoo_documents)
-- ----------------------------------------------------------------------------
create table if not exists public.jiyoo_documents (
  collection text not null,
  doc_id text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (collection, doc_id)
);

create index if not exists idx_jiyoo_documents_collection on public.jiyoo_documents (collection);
create index if not exists idx_jiyoo_documents_updated_at on public.jiyoo_documents (updated_at desc);

drop trigger if exists trg_jiyoo_documents_updated_at on public.jiyoo_documents;
create trigger trg_jiyoo_documents_updated_at
before update on public.jiyoo_documents
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Products Table (Retail & Wholesale Catalog)
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id text primary key,
  name text not null,
  category_id text not null default 'fruits',
  subcategory_id text,
  sub_subcategory_id text,
  price numeric(12, 2) not null default 0,
  mrp numeric(12, 2),
  unit text not null default '1 kg',
  image text,
  images jsonb not null default '[]'::jsonb,
  description text not null default '',
  wholesale_eligible boolean not null default false,
  wholesale_price numeric(12, 2),
  wholesale_unit text,
  wholesale_min_qty integer not null default 1,
  stock integer not null default 250,
  reserved_stock integer not null default 0,
  stock_status text not null default 'in_stock',
  is_deleted boolean not null default false,
  admin_edited boolean not null default false,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_products_category_id on public.products (category_id);
create index if not exists idx_products_wholesale on public.products (wholesale_eligible) where is_deleted = false;

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Categories Table
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id text primary key,
  name text not null,
  slug text,
  image text,
  icon text,
  subcategories jsonb not null default '[]'::jsonb,
  is_deleted boolean not null default false,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 6. Users Table (Profiles, Roles & Wishlist)
-- ----------------------------------------------------------------------------
create table if not exists public.users (
  id text primary key,
  email text,
  name text,
  phone text,
  address text,
  pincode text,
  picture text,
  role text not null default 'user',
  wishlist jsonb not null default '[]'::jsonb,
  raw_data jsonb not null default '{}'::jsonb,
  last_login timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_users_email on public.users (lower(email));

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 7. Orders Table (Retail, Wholesale & WhatsApp Orders)
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id text primary key,
  order_id text not null,
  user_id text,
  customer_name text,
  customer_phone text,
  customer_email text,
  pincode text,
  order_type text not null default 'retail',
  payment_method text,
  payment_status text not null default 'pending',
  order_status text not null default 'pending',
  subtotal numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  delivery_fee numeric(12, 2) not null default 0,
  amount numeric(12, 2) not null default 0,
  items jsonb not null default '[]'::jsonb,
  shipping_details jsonb not null default '{}'::jsonb,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_orders_user_id on public.orders (user_id);
create index if not exists idx_orders_order_status on public.orders (order_status);
create index if not exists idx_orders_created_at on public.orders (created_at desc);

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. Reviews Table
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id text primary key,
  product_id text not null,
  user_id text,
  user_name text not null default 'Verified Customer',
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null default '',
  status text not null default 'approved',
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_reviews_product_id on public.reviews (product_id);

drop trigger if exists trg_reviews_updated_at on public.reviews;
create trigger trg_reviews_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 9. Coupons / Promotions Table
-- ----------------------------------------------------------------------------
create table if not exists public.coupons (
  id text primary key,
  code text not null unique,
  discount_type text not null default 'percentage',
  discount_value numeric(12, 2) not null default 0,
  min_order_value numeric(12, 2) not null default 0,
  max_discount numeric(12, 2),
  is_active boolean not null default true,
  used_count integer not null default 0,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_coupons_updated_at on public.coupons;
create trigger trg_coupons_updated_at
before update on public.coupons
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 10. Settings Table
-- ----------------------------------------------------------------------------
create table if not exists public.settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists trg_settings_updated_at on public.settings;
create trigger trg_settings_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 11. Audit Logs Table
-- ----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id text primary key,
  action text not null,
  category text not null default 'SYSTEM',
  actor text not null default 'system',
  actor_role text not null default 'system',
  order_id text,
  details text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Note: Backend operations using SUPABASE_SERVICE_ROLE_KEY bypass RLS safely,
-- while browser clients using VITE_SUPABASE_ANON_KEY are strictly governed by
-- the policies below.
-- ============================================================================

alter table public.jiyoo_documents enable row level security;
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.users enable row level security;
alter table public.orders enable row level security;
alter table public.reviews enable row level security;
alter table public.coupons enable row level security;
alter table public.settings enable row level security;
alter table public.audit_logs enable row level security;

-- jiyoo_documents policies: public read for public collections, admin full access
drop policy if exists "Public read public jiyoo_documents" on public.jiyoo_documents;
create policy "Public read public jiyoo_documents"
  on public.jiyoo_documents for select
  using (collection in ('products', 'categories', 'settings', 'coupons', 'reviews', 'deliveryPincodes', 'wholesaleZones') or public.is_admin());

drop policy if exists "Admin manage jiyoo_documents" on public.jiyoo_documents;
create policy "Admin manage jiyoo_documents"
  on public.jiyoo_documents for all
  using (public.is_admin())
  with check (public.is_admin());

-- products policies: anyone can read active products; only admins can insert/update/delete
drop policy if exists "Public read products" on public.products;
create policy "Public read products"
  on public.products for select
  using (true);

drop policy if exists "Admin write products" on public.products;
create policy "Admin write products"
  on public.products for all
  using (public.is_admin())
  with check (public.is_admin());

-- categories policies: anyone can read categories; only admins can insert/update/delete
drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories"
  on public.categories for select
  using (true);

drop policy if exists "Admin write categories" on public.categories;
create policy "Admin write categories"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- settings policies: anyone can read global store settings; only admins can mutate
drop policy if exists "Public read settings" on public.settings;
create policy "Public read settings"
  on public.settings for select
  using (true);

drop policy if exists "Admin write settings" on public.settings;
create policy "Admin write settings"
  on public.settings for all
  using (public.is_admin())
  with check (public.is_admin());

-- coupons policies: anyone can read active coupons; only admins can mutate
drop policy if exists "Public read active coupons" on public.coupons;
create policy "Public read active coupons"
  on public.coupons for select
  using (is_active = true or public.is_admin());

drop policy if exists "Admin write coupons" on public.coupons;
create policy "Admin write coupons"
  on public.coupons for all
  using (public.is_admin())
  with check (public.is_admin());

-- reviews policies: anyone can read approved reviews; signed-in users can create their own review; admins manage all
drop policy if exists "Public read approved reviews" on public.reviews;
create policy "Public read approved reviews"
  on public.reviews for select
  using (status = 'approved' or (auth.uid() is not null and user_id = auth.uid()::text) or public.is_admin());

drop policy if exists "Authenticated insert own review" on public.reviews;
create policy "Authenticated insert own review"
  on public.reviews for insert
  with check (auth.uid() is not null and (user_id is null or user_id = auth.uid()::text));

drop policy if exists "Admin manage reviews" on public.reviews;
create policy "Admin manage reviews"
  on public.reviews for all
  using (public.is_admin())
  with check (public.is_admin());

-- users policies: users can read and update their own profile (except role escalation); admins can read/manage all
drop policy if exists "Users read own profile" on public.users;
create policy "Users read own profile"
  on public.users for select
  using ((auth.uid() is not null and id = auth.uid()::text) or public.is_admin());

drop policy if exists "Users insert own profile" on public.users;
create policy "Users insert own profile"
  on public.users for insert
  with check (
    (auth.uid() is not null and id = auth.uid()::text and coalesce(role, 'user') = 'user')
    or public.is_admin()
  );

drop policy if exists "Users update own profile" on public.users;
create policy "Users update own profile"
  on public.users for update
  using ((auth.uid() is not null and id = auth.uid()::text) or public.is_admin())
  with check (
    (auth.uid() is not null and id = auth.uid()::text and coalesce(role, 'user') = 'user')
    or public.is_admin()
  );

-- orders policies: users can read their own orders; admins can read/manage all orders
drop policy if exists "Users read own orders" on public.orders;
create policy "Users read own orders"
  on public.orders for select
  using ((auth.uid() is not null and user_id = auth.uid()::text) or public.is_admin());

drop policy if exists "Admin manage orders" on public.orders;
create policy "Admin manage orders"
  on public.orders for all
  using (public.is_admin())
  with check (public.is_admin());

-- audit_logs policies: strictly restricted to admins
drop policy if exists "Admin read audit_logs" on public.audit_logs;
create policy "Admin read audit_logs"
  on public.audit_logs for select
  using (public.is_admin());

drop policy if exists "Admin insert audit_logs" on public.audit_logs;
create policy "Admin insert audit_logs"
  on public.audit_logs for insert
  with check (public.is_admin());

-- ============================================================================
-- SUPABASE STORAGE BUCKET & RLS POLICIES (jiyoo-media)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'jiyoo-media',
  'jiyoo-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read jiyoo-media" on storage.objects;
create policy "Public read jiyoo-media"
  on storage.objects for select
  using (bucket_id = 'jiyoo-media');

drop policy if exists "Admin upload jiyoo-media" on storage.objects;
create policy "Admin upload jiyoo-media"
  on storage.objects for insert
  with check (bucket_id = 'jiyoo-media' and public.is_admin());

drop policy if exists "Admin update jiyoo-media" on storage.objects;
create policy "Admin update jiyoo-media"
  on storage.objects for update
  using (bucket_id = 'jiyoo-media' and public.is_admin());

drop policy if exists "Admin delete jiyoo-media" on storage.objects;
create policy "Admin delete jiyoo-media"
  on storage.objects for delete
  using (bucket_id = 'jiyoo-media' and public.is_admin());
