-- ============================================================================
-- JIYOO Premium Products — Supabase PostgreSQL Schema
-- Paste and run this script in your Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Universal Document Store (mirrors all JIYOO collections in real time)
CREATE TABLE IF NOT EXISTS public.jiyoo_documents (
  collection TEXT NOT NULL,
  doc_id TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection, doc_id)
);

CREATE INDEX IF NOT EXISTS idx_jiyoo_documents_collection
  ON public.jiyoo_documents (collection);

CREATE INDEX IF NOT EXISTS idx_jiyoo_documents_data_gin
  ON public.jiyoo_documents USING GIN (data);

-- 2. Relational Products Table (Retail & Wholesale Catalog)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT NOT NULL,
  subcategory_id TEXT,
  sub_subcategory_id TEXT,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0,
  mrp NUMERIC(10, 2),
  unit TEXT NOT NULL DEFAULT '1 kg',
  image TEXT,
  wholesale_eligible BOOLEAN NOT NULL DEFAULT FALSE,
  wholesale_price NUMERIC(10, 2),
  wholesale_unit TEXT,
  wholesale_min_qty INTEGER DEFAULT 1,
  stock INTEGER NOT NULL DEFAULT 250,
  stock_status TEXT NOT NULL DEFAULT 'in_stock',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_wholesale ON public.products (wholesale_eligible);

-- 3. Relational Orders Table (Retail, Wholesale, Razorpay, COD & WhatsApp)
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  user_id TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  pincode TEXT,
  order_type TEXT NOT NULL DEFAULT 'retail',
  payment_method TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending',
  order_status TEXT NOT NULL DEFAULT 'pending',
  subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  shipping_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

-- 4. Relational Users Table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT,
  name TEXT,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email);

-- 5. Enable Row Level Security (Service Role bypasses RLS automatically)
ALTER TABLE public.jiyoo_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Public read access for active storefront products
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
CREATE POLICY "Allow public read access to products"
  ON public.products
  FOR SELECT
  USING (is_deleted = FALSE);
