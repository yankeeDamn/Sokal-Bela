-- Phase 2 additive migration. Apply to Neon after schema.sql + seed.sql.
-- No existing customer data or tables are deleted.
BEGIN;
CREATE TABLE IF NOT EXISTS request_rate_limits (
  scope VARCHAR(32) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  hits INTEGER NOT NULL DEFAULT 1 CHECK (hits >= 1),
  PRIMARY KEY (scope, ip_hash)
);
CREATE INDEX IF NOT EXISTS idx_request_rate_limits_window ON request_rate_limits(window_start);
-- The fee for orders under the free-delivery threshold has NOT been set
-- by the owner. Omit a fee until it is explicitly entered in the settings
-- table; any non-free delivery charge must be confirmed over WhatsApp.
COMMIT;
