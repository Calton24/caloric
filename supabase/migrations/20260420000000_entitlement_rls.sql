-- ============================================================
-- RLS: subscription_state + usage_state
--
-- Users can read their own row.
-- Users cannot insert, update, or delete these rows.
-- Only service_role (webhooks, edge functions) may write.
-- ============================================================

-- ─── subscription_state ──────────────────────────────────────────────────────

ALTER TABLE public.subscription_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_subscription"
  ON public.subscription_state
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── usage_state ─────────────────────────────────────────────────────────────

ALTER TABLE public.usage_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_usage"
  ON public.usage_state
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
