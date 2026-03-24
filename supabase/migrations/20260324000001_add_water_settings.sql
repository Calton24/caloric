-- ============================================================
-- Add water settings to user_profiles
-- waterGoalMl    — daily hydration target (default 2000 ml)
-- waterIncrementMl — serving size per tap  (default 250 ml)
-- ============================================================

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS water_goal_ml     INTEGER NOT NULL DEFAULT 2000
    CHECK (water_goal_ml > 0),
  ADD COLUMN IF NOT EXISTS water_increment_ml INTEGER NOT NULL DEFAULT 250
    CHECK (water_increment_ml > 0);
