-- Sokal Bela Phase 5: additive, non-destructive operational tables.
-- Apply to a TEST Neon branch first. Apply to production before releasing
-- order notifications/admin features; do not modify existing orders or stock.
BEGIN;
CREATE TABLE IF NOT EXISTS order_alerts (
  order_id BIGINT PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(12) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sending','sent','failed')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_attempt_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  provider_message_id TEXT,
  last_error VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_order_alerts_status ON order_alerts(status, created_at DESC);
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  channel VARCHAR(30) NOT NULL
    CHECK (channel IN ('whatsapp','facebook','instagram','google','flyer','referral','other')),
  objective VARCHAR(160) NOT NULL DEFAULT '',
  status VARCHAR(20) NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','planned','active','paused','completed')),
  budget NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (budget >= 0),
  spend NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (spend >= 0),
  start_date DATE,
  end_date DATE,
  landing_path VARCHAR(300) NOT NULL DEFAULT '/',
  notes VARCHAR(800) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaign_dates_valid CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status, start_date DESC);
COMMIT;
