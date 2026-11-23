-- Phase 3: customer accounts, login audit log, Cashfree payments,
-- newspaper products, Morning Pass billing. Additive and safe to run twice.
-- Run AFTER db/schema.sql, db/seed.sql and db/phase2.sql.
-- Test on a Neon branch first. Nothing here deletes data.
BEGIN;

-- ---------- Accounts ----------
CREATE TABLE IF NOT EXISTS users (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  phone VARCHAR(10) NOT NULL UNIQUE CHECK (phone ~ '^[6-9][0-9]{9}$'),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(254),
  password_hash TEXT NOT NULL,
  role VARCHAR(10) NOT NULL DEFAULT 'customer' CHECK (role IN ('customer','admin')),
  status VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','blocked')),
  default_address VARCHAR(500) NOT NULL DEFAULT '',
  default_pincode VARCHAR(6) NOT NULL DEFAULT '' CHECK (default_pincode = '' OR default_pincode ~ '^[0-9]{6}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON users(lower(email)) WHERE email IS NOT NULL;

-- Only a SHA-256 hash of the session token is stored, never the token.
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) NOT NULL UNIQUE,
  user_agent VARCHAR(200) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expiry ON user_sessions(expires_at);

-- Append-only sign-in log. ip_hash is a salted SHA-256, not a raw address.
CREATE TABLE IF NOT EXISTS auth_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  phone VARCHAR(10) NOT NULL DEFAULT '',
  event VARCHAR(24) NOT NULL CHECK (event IN
    ('signup','login_success','login_failed','login_blocked','logout','password_changed','admin_action')),
  detail VARCHAR(200) NOT NULL DEFAULT '',
  ip_hash CHAR(64) NOT NULL DEFAULT '',
  user_agent VARCHAR(200) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created ON auth_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_phone_event ON auth_logs(phone, event, created_at DESC);

-- ---------- Products: add newspapers ----------
DO $$
DECLARE c TEXT;
BEGIN
  FOR c IN SELECT conname FROM pg_constraint
           WHERE conrelid='products'::regclass AND contype='c'
             AND pg_get_constraintdef(oid) LIKE '%vegetable%dairy%' LOOP
    EXECUTE format('ALTER TABLE products DROP CONSTRAINT %I', c);
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='products_kind_allowed') THEN
    ALTER TABLE products ADD CONSTRAINT products_kind_allowed
      CHECK (kind IN ('vegetable','dairy','newspaper'));
  END IF;
END $$;

-- Starter newspaper rows: INACTIVE, price 0. Owner sets real copy prices in /admin.
INSERT INTO products (kind,name_en,name_bn,category,unit,pack_size,price,stock,emoji,active,sort_order) VALUES
('newspaper','Anandabazar Patrika','আনন্দবাজার পত্রিকা','Bengali','piece','daily copy',0,9999,'📰',FALSE,300),
('newspaper','Bartaman','বর্তমান','Bengali','piece','daily copy',0,9999,'📰',FALSE,310),
('newspaper','Sangbad Pratidin','সংবাদ প্রতিদিন','Bengali','piece','daily copy',0,9999,'📰',FALSE,320),
('newspaper','The Telegraph','দ্য টেলিগ্রাফ','English','piece','daily copy',0,9999,'📰',FALSE,330),
('newspaper','The Times of India','দ্য টাইমস অফ ইন্ডিয়া','English','piece','daily copy',0,9999,'📰',FALSE,340)
ON CONFLICT (kind,name_en,pack_size) DO NOTHING;

-- ---------- Orders: owner + payment state ----------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(10) NOT NULL DEFAULT 'cod';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(10) NOT NULL DEFAULT 'unpaid';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orders_payment_method_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('cod','online'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='orders_payment_status_check') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('unpaid','pending','paid','failed'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at DESC);

-- ---------- Subscriptions (Morning Pass): owner + billing ----------
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS paid_until DATE;
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, created_at DESC);

-- ---------- Cashfree payments ----------
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_ref VARCHAR(45) NOT NULL UNIQUE,            -- our order_id sent to Cashfree
  gateway VARCHAR(12) NOT NULL DEFAULT 'cashfree',
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE SET NULL,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency CHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(10) NOT NULL DEFAULT 'created' CHECK (status IN ('created','paid','failed','expired')),
  cf_order_id VARCHAR(64),
  cf_payment_id VARCHAR(64),
  covers_until DATE,                                   -- subscription prepay window end
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  CHECK ((order_id IS NOT NULL)::int + (subscription_id IS NOT NULL)::int = 1)
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

-- ---------- Settings ----------
INSERT INTO settings(key,value) VALUES ('online_payments_enabled','false'::jsonb) ON CONFLICT(key) DO NOTHING;

COMMIT;
