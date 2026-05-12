-- 3-day full-access app trial (server clock). Tied to user_profiles after onboarding completes.
-- RevenueCat remains the only subscription authority; trial is orthogonal timeboxed access.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS app_trial_started_at TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.app_trial_started_at IS
  'When set, user receives 72h full app access from this instant (server time). Null = not started.';

-- Idempotent: set start time only if onboarding is complete and trial not yet started.
CREATE OR REPLACE FUNCTION public.ensure_app_trial_started()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_profiles u
  SET app_trial_started_at = COALESCE(u.app_trial_started_at, now()),
      updated_at = now()
  WHERE u.user_id = auth.uid()
    AND u.onboarding_completed = true
    AND u.app_trial_started_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_app_trial_started() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_app_trial_started() TO authenticated;

-- Server-time trial evaluation (immune to device clock skew for gating).
CREATE OR REPLACE FUNCTION public.get_app_trial_state()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT jsonb_build_object(
        'started_at', p.app_trial_started_at,
        'expires_at', p.app_trial_started_at + interval '72 hours',
        'is_active',
          p.app_trial_started_at IS NOT NULL
          AND p.app_trial_started_at + interval '72 hours' > now(),
        'is_expired',
          p.app_trial_started_at IS NOT NULL
          AND p.app_trial_started_at + interval '72 hours' <= now()
      )
      FROM user_profiles p
      WHERE p.user_id = auth.uid()
    ),
    jsonb_build_object(
      'started_at', NULL,
      'expires_at', NULL,
      'is_active', false,
      'is_expired', false
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_app_trial_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_app_trial_state() TO authenticated;

-- One-time: existing onboarded users without a trial timestamp get a fresh window from deploy.
UPDATE user_profiles
SET app_trial_started_at = now(),
    updated_at = now()
WHERE onboarding_completed = true
  AND app_trial_started_at IS NULL;
