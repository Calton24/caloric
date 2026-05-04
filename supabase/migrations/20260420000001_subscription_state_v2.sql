-- ============================================================
-- subscription_state: v2 columns + webhook events table
--
-- Adds:
--   is_active              — derived boolean (true for active/trialing/grace_period)
--   will_renew             — will the subscription auto-renew
--   original_app_user_id   — RC identity before a TRANSFER event
--   last_event_id          — RC event.id (used for idempotency cross-reference)
--
-- New table: revenuecat_webhook_events
--   Immutable audit log + primary idempotency boundary.
--   Webhook handler inserts here first; duplicate event_id → skip processing.
-- ============================================================

-- ─── 1. Extend subscription_state ────────────────────────────────────────────

ALTER TABLE public.subscription_state
  ADD COLUMN IF NOT EXISTS is_active              BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS will_renew             BOOLEAN     DEFAULT true,
  ADD COLUMN IF NOT EXISTS original_app_user_id   TEXT,
  ADD COLUMN IF NOT EXISTS last_event_id          TEXT;

-- Backfill is_active for all existing rows based on current status
UPDATE public.subscription_state
  SET is_active = (status IN ('active', 'trialing', 'grace_period'));

-- ─── 2. Webhook events table (idempotency + audit) ────────────────────────────

CREATE TABLE IF NOT EXISTS public.revenuecat_webhook_events (
  event_id      TEXT        PRIMARY KEY,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type    TEXT        NOT NULL,
  app_user_id   TEXT,
  raw_payload   JSONB       NOT NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rc_webhook_events_user
  ON public.revenuecat_webhook_events(user_id, received_at DESC);

-- Only service_role can access this table
ALTER TABLE public.revenuecat_webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies for authenticated role — zero client access
