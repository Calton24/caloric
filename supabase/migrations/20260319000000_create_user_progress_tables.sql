-- ============================================================
-- User Progress Tables: meals, weight_logs, goals, streaks
-- Persists local Zustand store data to Supabase with RLS
-- ============================================================

-- ── 1. Meal Entries ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS meal_entries (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  source      TEXT        NOT NULL CHECK (source IN ('voice','manual','camera','text','image')),
  calories    REAL        NOT NULL DEFAULT 0,
  protein     REAL        NOT NULL DEFAULT 0,
  carbs       REAL        NOT NULL DEFAULT 0,
  fat         REAL        NOT NULL DEFAULT 0,
  logged_at   TIMESTAMPTZ NOT NULL,
  emoji       TEXT,
  meal_time   TEXT        CHECK (meal_time IN ('breakfast','lunch','dinner','snack')),
  confidence  REAL,
  image_uri   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_meal_entries_user_date ON meal_entries (user_id, logged_at DESC);

ALTER TABLE meal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own meals"
  ON meal_entries FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own meals"
  ON meal_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own meals"
  ON meal_entries FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own meals"
  ON meal_entries FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ── 2. Weight Logs ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS weight_logs (
  id          TEXT        PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_lbs  REAL        NOT NULL,
  date        DATE        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)              -- one weight log per user per day
);

CREATE INDEX idx_weight_logs_user_date ON weight_logs (user_id, date DESC);

ALTER TABLE weight_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own weight logs"
  ON weight_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own weight logs"
  ON weight_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own weight logs"
  ON weight_logs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own weight logs"
  ON weight_logs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ── 3. User Goals ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_goals (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type             TEXT        NOT NULL CHECK (goal_type IN ('lose','maintain','gain')),
  calorie_budget        INTEGER     NOT NULL,
  maintenance_calories  INTEGER     NOT NULL,
  weekly_rate_lbs       REAL        NOT NULL DEFAULT 0,
  timeframe_weeks       INTEGER,
  target_date           DATE,
  protein_g             INTEGER     NOT NULL DEFAULT 0,
  carbs_g               INTEGER     NOT NULL DEFAULT 0,
  fat_g                 INTEGER     NOT NULL DEFAULT 0,
  active                BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one active goal per user at a time
CREATE UNIQUE INDEX idx_user_goals_active ON user_goals (user_id) WHERE active = true;
CREATE INDEX idx_user_goals_user ON user_goals (user_id, created_at DESC);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own goals"
  ON user_goals FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own goals"
  ON user_goals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own goals"
  ON user_goals FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);


-- ── 4. Daily Streaks ─────────────────────────────────────────
--
-- Design: One row per user. Streak is computed from a separate
-- daily_log_dates table that records each day the user logged
-- at least one meal. This is more reliable than incrementing
-- a counter (which can double-count or miss days on clock skew).

CREATE TABLE IF NOT EXISTS daily_log_dates (
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date    DATE        NOT NULL,
  meal_count  INTEGER     NOT NULL DEFAULT 1,
  total_cals  REAL        NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, log_date)
);

CREATE INDEX idx_daily_log_dates_user ON daily_log_dates (user_id, log_date DESC);

ALTER TABLE daily_log_dates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own log dates"
  ON daily_log_dates FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own log dates"
  ON daily_log_dates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own log dates"
  ON daily_log_dates FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);


CREATE TABLE IF NOT EXISTS user_streaks (
  user_id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak    INTEGER     NOT NULL DEFAULT 0,
  longest_streak    INTEGER     NOT NULL DEFAULT 0,
  last_log_date     DATE,                              -- last day user logged
  streak_start_date DATE,                              -- when current streak began
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own streaks"
  ON user_streaks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users upsert own streaks"
  ON user_streaks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own streaks"
  ON user_streaks FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);


-- ── 5. Streak Calculation Function ──────────────────────────
-- Computes streak from daily_log_dates (source of truth).
-- Called after each meal log to update user_streaks atomically.

CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID, p_today DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(current_streak INTEGER, longest_streak INTEGER) AS $$
DECLARE
  v_current   INTEGER := 0;
  v_longest   INTEGER := 0;
  v_check     DATE := p_today;
  v_start     DATE;
  v_existing  INTEGER;
BEGIN
  -- Walk backwards from today counting consecutive days
  LOOP
    SELECT 1 INTO v_existing
      FROM daily_log_dates
     WHERE user_id = p_user_id AND log_date = v_check;

    EXIT WHEN v_existing IS NULL;

    v_current := v_current + 1;
    v_start   := v_check;
    v_check   := v_check - 1;
    v_existing := NULL;
  END LOOP;

  -- Get existing longest streak
  SELECT COALESCE(us.longest_streak, 0) INTO v_longest
    FROM user_streaks us
   WHERE us.user_id = p_user_id;

  IF v_current > v_longest THEN
    v_longest := v_current;
  END IF;

  -- Upsert the streak record
  INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_log_date, streak_start_date, updated_at)
  VALUES (p_user_id, v_current, v_longest, p_today, v_start, now())
  ON CONFLICT (user_id)
  DO UPDATE SET
    current_streak    = v_current,
    longest_streak    = v_longest,
    last_log_date     = p_today,
    streak_start_date = v_start,
    updated_at        = now();

  RETURN QUERY SELECT v_current, v_longest;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
