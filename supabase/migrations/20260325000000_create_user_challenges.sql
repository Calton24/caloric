-- ============================================================
-- 21-Day Challenge System
--
-- Tracks a user's challenge attempt. 'completed_days' is NOT
-- stored here — it is always computed from daily_log_dates to
-- avoid drift. This table is the state machine only.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_challenges (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Window definition
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  challenge_days  INTEGER     NOT NULL DEFAULT 21 CHECK (challenge_days > 0),

  -- State machine
  status          TEXT        NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'expired', 'converted')),

  -- Monetization flags
  offer_unlocked  BOOLEAN     NOT NULL DEFAULT false,
  offer_seen_at   TIMESTAMPTZ,
  converted_at    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active challenge per user at a time
CREATE UNIQUE INDEX IF NOT EXISTS user_challenges_one_active_idx
  ON user_challenges(user_id) WHERE status = 'active';

-- Fast status lookup
CREATE INDEX IF NOT EXISTS user_challenges_user_status_idx
  ON user_challenges(user_id, status);

-- ── Row Level Security ──────────────────────────────────────

ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own challenges"
  ON user_challenges FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own challenges"
  ON user_challenges FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own challenges"
  ON user_challenges FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ── Helper view: active challenge with progress ─────────────
-- Joins with daily_log_dates so the app can fetch completed_days
-- in a single query instead of two round trips.

CREATE OR REPLACE VIEW active_challenge_summary AS
SELECT
  uc.id,
  uc.user_id,
  uc.started_at,
  uc.challenge_days,
  uc.status,
  uc.offer_unlocked,
  uc.offer_seen_at,
  uc.converted_at,
  -- current calendar day (1-indexed, clamped to challenge_days)
  LEAST(
    (CURRENT_DATE - uc.started_at::date) + 1,
    uc.challenge_days
  ) AS current_day,
  -- count of distinct days logged inside the challenge window
  COUNT(dl.log_date) AS completed_days,
  -- window boundaries for client-side display
  uc.started_at::date                              AS window_start,
  uc.started_at::date + (uc.challenge_days - 1)   AS window_end
FROM user_challenges uc
LEFT JOIN daily_log_dates dl
  ON  dl.user_id   = uc.user_id
  AND dl.log_date >= uc.started_at::date
  AND dl.log_date <= uc.started_at::date + (uc.challenge_days - 1)
WHERE uc.status = 'active'
GROUP BY uc.id, uc.user_id, uc.started_at, uc.challenge_days,
         uc.status, uc.offer_unlocked, uc.offer_seen_at, uc.converted_at;
