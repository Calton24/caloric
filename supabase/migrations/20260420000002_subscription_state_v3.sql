-- Verification staleness columns for subscription_state
--
-- Enables the client to classify server trust as:
--   fresh    — verified within 24h  → allow immediately
--   stale    — verified within 72h  → soft recheck (preserve on network failure)
--   expired  — verified >72h ago    → hard recheck (deny if server unreachable)
--   unverified — no timestamp yet   → hard recheck (same as expired)
--
-- Both sync-entitlement (pull path) and revenuecat-webhook (push path) stamp
-- last_server_verified_at and source on every write, keeping the trust clock current.
--
-- Note: device clock tampering can skew freshness classification, but cannot
-- forge premium entitlement — the server controls the write path.

ALTER TABLE public.subscription_state
  ADD COLUMN IF NOT EXISTS last_server_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS verification_version INT NOT NULL DEFAULT 1;

-- Backfill: treat existing rows as webhook-verified at their last update time.
-- These will age into stale/expired naturally and trigger a recheck on first scan,
-- which is acceptable — no users are incorrectly downgraded by this.
UPDATE public.subscription_state
SET
  last_server_verified_at = COALESCE(updated_at, now()),
  source = 'webhook'
WHERE last_server_verified_at IS NULL;
