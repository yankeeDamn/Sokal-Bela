-- Sokal Bela / Phase 1 / PostgreSQL schema
-- Run in a NEW, EMPTY Neon database using the Neon SQL Editor.
-- No live storefront is connected to this schema during Phase 1.
-- All currency values are INR, stored as NUMERIC, never float.
BEGIN;

CREATE TABLE IF NOT EXISTS products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name_en VARCHAR(120) NOT NULL,
  name_bn VARCHAR(120) NOT NULL,
  kind VARCHAR(20) NOT NULL CHECK (kind IN ('vegetable', 'dairy')),
  category VARCHAR(80) NOT NULL DEFAULT 'Other',
  unit VARCHAR(20) NOT NULL CHECK (unit IN ('kg','g','piece','bunch','litre','ml','pack')),
  pack_size VARCHAR(40) NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  emoji VARCHAR(16) NOT NULL DEFAULT '🥬',
  image_url TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT products_seed_identity UNIQUE(kind, name_en, pack_size)
);
CREATE INDEX IF NOT EXISTS idx_products_kind_active ON products(kind, active);

CREATE TABLE IF NOT EXISTS orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_no VARCHAR(32) NOT NULL UNIQUE,
  customer_name VARCHAR(120) NOT NULL,
  phone VARCHAR(10) NOT NULL CHECK (phone ~ '^[6-9][0-9]{9}$'),
  address VARCHAR(500) NOT NULL,
  pincode VARCHAR(6) NOT NULL CHECK (pincode ~ '^[0-9]{6}$'),
  delivery_slot VARCHAR(100) NOT NULL,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (delivery_fee >= 0),
  total NUMERIC(10,2) NOT NULL CHECK (total >= 0 AND total = subtotal + delivery_fee),
  status VARCHAR(25) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','confirmed','out_for_delivery','delivered','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(phone);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  name_snapshot VARCHAR(160) NOT NULL,
  unit_snapshot VARCHAR(40) NOT NULL,
  price_snapshot NUMERIC(10,2) NOT NULL CHECK (price_snapshot >= 0),
  qty INTEGER NOT NULL CHECK (qty > 0),
  line_total NUMERIC(10,2) NOT NULL CHECK (line_total >= 0 AND line_total = price_snapshot * qty)
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sub_code VARCHAR(32) NOT NULL UNIQUE,
  customer_name VARCHAR(120) NOT NULL,
  phone VARCHAR(10) NOT NULL CHECK (phone ~ '^[6-9][0-9]{9}$'),
  address VARCHAR(500) NOT NULL,
  pincode VARCHAR(6) NOT NULL CHECK (pincode ~ '^[0-9]{6}$'),
  slot VARCHAR(30) NOT NULL CHECK (slot IN ('06:00-08:00','07:00-09:00','08:00-10:00')),
  frequency VARCHAR(10) NOT NULL CHECK (frequency IN ('daily','mon_sat','weekly')),
  start_date DATE NOT NULL,
  status VARCHAR(15) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','paused','cancelled')),
  paused_until DATE,
  notes VARCHAR(500) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (paused_until IS NULL OR paused_until >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_phone ON subscriptions(phone);

CREATE TABLE IF NOT EXISTS subscription_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subscription_id BIGINT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  UNIQUE(subscription_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_subscription_items_subscription ON subscription_items(subscription_id);

CREATE TABLE IF NOT EXISTS subscription_deliveries (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subscription_id BIGINT NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  delivery_date DATE NOT NULL,
  delivered BOOLEAN NOT NULL DEFAULT FALSE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  UNIQUE(subscription_id, delivery_date)
);
CREATE INDEX IF NOT EXISTS idx_subscription_deliveries_date ON subscription_deliveries(delivery_date);

CREATE TABLE IF NOT EXISTS kitchen_items (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description VARCHAR(600) NOT NULL DEFAULT '',
  category VARCHAR(80) NOT NULL DEFAULT 'Kitchen',
  store VARCHAR(12) NOT NULL CHECK (store IN ('amazon','flipkart')),
  affiliate_url TEXT NOT NULL CHECK (affiliate_url ~* '^https://'),
  image_url TEXT NOT NULL DEFAULT '',
  emoji VARCHAR(16) NOT NULL DEFAULT '🍳',
  approx_price NUMERIC(10,2) CHECK (approx_price IS NULL OR approx_price >= 0),
  active BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);
-- Full-text search with PostgreSQL's built-in GIN index; no extensions.
CREATE INDEX IF NOT EXISTS idx_kitchen_search ON kitchen_items
  USING GIN(to_tsvector('simple', title || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_kitchen_active_order ON kitchen_items(active, sort_order);

-- JSONB settings keep all editable values centralized and typed.
-- Only the backend may write or return private settings.
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(80) PRIMARY KEY,
  value JSONB NOT NULL
);

-- Additive tables for existing requested flows: do not remove bulk,
-- catering, ready baskets, or custom basket builder.
CREATE TABLE IF NOT EXISTS bulk_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_type VARCHAR(12) NOT NULL CHECK (request_type IN ('bulk','catering')),
  contact_name VARCHAR(120) NOT NULL,
  phone VARCHAR(10) NOT NULL CHECK (phone ~ '^[6-9][0-9]{9}$'),
  address VARCHAR(500) NOT NULL DEFAULT '',
  event_date DATE,
  guest_count INTEGER CHECK (guest_count IS NULL OR guest_count > 0),
  items JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(items) = 'array'),
  notes VARCHAR(1000) NOT NULL DEFAULT '',
  status VARCHAR(15) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','confirmed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bulk_requests_created ON bulk_requests(created_at DESC);

COMMIT;
