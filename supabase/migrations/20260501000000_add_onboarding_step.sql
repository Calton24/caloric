-- ============================================================
-- Onboarding Checkpoint
-- Stores the user's current incomplete onboarding step so we
-- can resume them where they left off instead of restarting at
-- /goal on every cold start.
--
-- Allowed values follow the (onboarding)/ flow file names:
--   goal | body | activity | weight-goal | timeframe |
--   calculating | plan | save-progress | paywall | complete
--
-- NULL means "no checkpoint" — used for completed users and
-- for new users who haven't passed the first step yet (in
-- which case the gate falls back to /goal).
-- ============================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_step TEXT
    CHECK (
      onboarding_step IS NULL
      OR onboarding_step IN (
        'goal',
        'body',
        'activity',
        'weight-goal',
        'timeframe',
        'calculating',
        'plan',
        'save-progress',
        'paywall',
        'complete'
      )
    );

-- Index is intentionally omitted — the column is read together
-- with onboarding_completed in the same row lookup keyed by
-- user_id (the primary key), so an extra index would never be
-- used.
