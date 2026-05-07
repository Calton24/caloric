-- ────────────────────────────────────────────────────────────────────────
-- App-trial hardening (server-authoritative, non-extensible 72h window)
--
-- This migration:
--   1. Recreates the trial RPCs idempotently (defensive against partial /
--      cached deployments — fixes the "Could not find the function
--      public.get_app_trial_state without parameters in the schema cache"
--      production bug observed 2026-05-07).
--   2. Adds a BEFORE UPDATE trigger that BLOCKS direct client writes to
--      `user_profiles.app_trial_started_at`. Only SECURITY DEFINER RPCs
--      (which run as the function owner, not as `authenticated`) may
--      mutate the column — so the 72h trial cannot be extended/reset by
--      a hostile client.
--   3. Tightens execute grants on both RPCs.
--   4. Forces a PostgREST schema cache reload at the end so the API
--      surface picks up any newly-created functions immediately.
-- ────────────────────────────────────────────────────────────────────────

-- 1. Re-create RPCs (CREATE OR REPLACE — safe if they already exist).

CREATE OR REPLACE FUNCTION public.ensure_app_trial_started()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Idempotent: only writes when onboarding is complete and the trial
  -- has never been started. Once `app_trial_started_at` is set, this
  -- function is a no-op for that user — trial cannot be restarted.
  UPDATE user_profiles u
  SET app_trial_started_at = COALESCE(u.app_trial_started_at, now()),
      updated_at = now()
  WHERE u.user_id = auth.uid()
    AND u.onboarding_completed = true
    AND u.app_trial_started_at IS NULL;
END;
$$;

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

-- 2. Tighten grants: only authenticated callers, no anon, no public.

REVOKE ALL ON FUNCTION public.ensure_app_trial_started() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_app_trial_started() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_app_trial_started() TO authenticated;

REVOKE ALL ON FUNCTION public.get_app_trial_state() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_app_trial_state() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_app_trial_state() TO authenticated;

-- 3. Block direct client mutation of `app_trial_started_at`.
--
--    The existing user_profiles UPDATE policy ("Users update own profile")
--    is column-agnostic, so without this trigger an authenticated client
--    could simply call:
--
--      supabase.from('user_profiles')
--        .update({ app_trial_started_at: new Date() })
--        .eq('user_id', auth.uid())
--
--    and reset their own trial window indefinitely.
--
--    This BEFORE UPDATE trigger raises an exception if the new value
--    differs from the old AND the caller is `authenticated`/`anon`.
--    SECURITY DEFINER RPCs (above) run as the function owner — typically
--    `postgres` or `supabase_admin` — so they bypass this check.

CREATE OR REPLACE FUNCTION public.prevent_client_trial_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.app_trial_started_at IS DISTINCT FROM OLD.app_trial_started_at
     AND current_user IN ('authenticated', 'anon')
  THEN
    RAISE EXCEPTION
      'app_trial_started_at is server-managed; use ensure_app_trial_started() RPC'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_trial_immutable ON public.user_profiles;
CREATE TRIGGER user_profiles_trial_immutable
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_client_trial_writes();

-- 4. Self-verifying assertions (raise during deploy if anything is off).

DO $$
BEGIN
  -- Function existence
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_app_trial_state'
  ) THEN
    RAISE EXCEPTION 'public.get_app_trial_state() is missing after migration';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'ensure_app_trial_started'
  ) THEN
    RAISE EXCEPTION 'public.ensure_app_trial_started() is missing after migration';
  END IF;

  -- Trigger existence
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'user_profiles_trial_immutable'
      AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'user_profiles_trial_immutable trigger is missing';
  END IF;

  -- RLS still enabled
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'user_profiles'
      AND c.relrowsecurity = true
  ) THEN
    RAISE EXCEPTION 'RLS not enabled on user_profiles';
  END IF;
END;
$$;

-- 5. Force PostgREST to reload its schema cache so the new/refreshed
--    functions are exposed via the auto-generated REST/RPC surface
--    immediately. Without this, deploys can take up to ~10 minutes for
--    PostgREST's own auto-refresh, during which the client sees
--    "Could not find the function ... in the schema cache" and the
--    access gate falls through to the paywall (the bug we're fixing).
NOTIFY pgrst, 'reload schema';
