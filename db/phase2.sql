-- Phase 2: durable per-IP rate limiting (works across Vercel instances).
-- Run after db/schema.sql and db/seed.sql. Safe to run twice.
BEGIN;
CREATE TABLE IF NOT EXISTS request_rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  token CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_request_rate_limits_token_time ON request_rate_limits(token,created_at DESC);
INSERT INTO settings(key,value) VALUES ('delivery_fee','0'::jsonb) ON CONFLICT(key) DO NOTHING;
COMMIT;
