-- ============================================================
-- Billing, Credits, and AI Protection Schema
--
-- Architecture:
--   Client → ai-scan Edge Function → OpenAI
--   RevenueCat webhook → revenuecat-webhook Edge Function → subscription_state
--   All AI spend funnels through one server-side choke point.
--   Client NEVER calls OpenAI. Client NEVER updates credits.
--
-- Tables:
--   profiles            — app-level flags (blocked, challenge)
--   subscription_state  — RevenueCat webhook mirror
--   usage_state         — credit buckets / quotas
--   ai_usage_events     — immutable audit ledger
--   billing_identity_map — RC ↔ Supabase user mapping (optional)
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── 1. Profiles (app-level flags) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username              TEXT        UNIQUE,
  is_blocked            BOOLEAN     NOT NULL DEFAULT false,
  challenge_started_at  TIMESTAMPTZ,
  challenge_completed_at TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 2. Subscription state (RevenueCat webhook mirror) ─────────────────

CREATE TABLE IF NOT EXISTS public.subscription_state (
  user_id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  app_user_id     TEXT        UNIQUE,
  entitlement_id  TEXT,
  product_id      TEXT,
  status          TEXT        NOT NULL DEFAULT 'free'
    CHECK (status IN ('free', 'trialing', 'active', 'grace_period', 'expired', 'cancelled')),
  expires_at      TIMESTAMPTZ,
  store           TEXT,
  last_event_type TEXT,
  last_event_at   TIMESTAMPTZ,
  raw_event       JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscription_state_status
  ON public.subscription_state(status);
CREATE INDEX IF NOT EXISTS idx_subscription_state_app_user_id
  ON public.subscription_state(app_user_id);

-- ─── 3. Usage state (credit buckets / quotas) ──────────────────────────

CREATE TABLE IF NOT EXISTS public.usage_state (
  user_id                    UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  ai_scan_credits_remaining  INTEGER NOT NULL DEFAULT 3
    CHECK (ai_scan_credits_remaining >= 0),
  ai_scan_daily_count        INTEGER NOT NULL DEFAULT 0
    CHECK (ai_scan_daily_count >= 0),
  ai_scan_daily_reset_at     DATE    NOT NULL DEFAULT CURRENT_DATE,
  total_ai_scans_used        INTEGER NOT NULL DEFAULT 0
    CHECK (total_ai_scans_used >= 0),
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 4. AI usage events (immutable audit ledger) ───────────────────────

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type      TEXT    NOT NULL
    CHECK (event_type IN (
      'scan_allowed', 'scan_denied_limit', 'scan_denied_blocked',
      'scan_denied_auth', 'scan_error_vendor', 'scan_success'
    )),
  credits_before  INTEGER,
  credits_after   INTEGER,
  request_id      UUID    NOT NULL DEFAULT gen_random_uuid(),
  image_sha256    TEXT,
  vendor          TEXT,
  model           TEXT,
  estimated_input_tokens  INTEGER,
  estimated_output_tokens INTEGER,
  meta            JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_created
  ON public.ai_usage_events(user_id, created_at DESC);

-- ─── 5. Billing identity map (RC ↔ Supabase) ──────────────────────────
-- Only needed if NOT using Supabase user_id as RevenueCat app_user_id.
-- We DO use Supabase user_id, so this is a safety net / audit table.

CREATE TABLE IF NOT EXISTS public.billing_identity_map (
  user_id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  revenuecat_app_user_id   TEXT UNIQUE NOT NULL,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── updated_at trigger ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_subscription_state_updated_at ON public.subscription_state;
CREATE TRIGGER trg_subscription_state_updated_at
  BEFORE UPDATE ON public.subscription_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_usage_state_updated_at ON public.usage_state;
CREATE TRIGGER trg_usage_state_updated_at
  BEFORE UPDATE ON public.usage_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ═══════════════════════════════════════════════════════════════════════
-- RLS Policies
--
-- JWT-backed RLS is the main protection layer.
-- service_role bypasses RLS (used only in Edge Functions / webhooks).
-- Client can NEVER update subscription_state or usage_state.
-- ═══════════════════════════════════════════════════════════════════════

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_identity_map ENABLE ROW LEVEL SECURITY;

-- profiles: users can read/insert/update their own
CREATE POLICY "users_can_read_own_profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- subscription_state: read-only for users (webhook writes via service_role)
CREATE POLICY "users_can_read_own_subscription_state"
  ON public.subscription_state FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- usage_state: read-only for users (Edge Function writes via service_role)
CREATE POLICY "users_can_read_own_usage_state"
  ON public.usage_state FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ai_usage_events: read own audit trail
CREATE POLICY "users_can_read_own_ai_usage_events"
  ON public.ai_usage_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- billing_identity_map: no client access needed (service_role only)
