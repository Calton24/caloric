-- ============================================================
-- User Profiles Table
-- Syncs onboarding data, body stats, and preferences across
-- devices so a logged-in user never loses their profile.
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id               UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  gender                TEXT        CHECK (gender IN ('male','female','other')),
  birth_year            INTEGER     CHECK (birth_year BETWEEN 1900 AND 2100),
  height_cm             REAL        CHECK (height_cm > 0 AND height_cm < 300),
  current_weight_lbs    REAL        CHECK (current_weight_lbs > 0),
  goal_weight_lbs       REAL        CHECK (goal_weight_lbs > 0),
  activity_level        TEXT        CHECK (activity_level IN ('sedentary','light','moderate','very','super')),
  weight_unit           TEXT        NOT NULL DEFAULT 'lbs' CHECK (weight_unit IN ('lbs','kg')),
  height_unit           TEXT        NOT NULL DEFAULT 'cm'  CHECK (height_unit IN ('cm','ft_in')),
  onboarding_completed  BOOLEAN     NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Each user can only read their own profile
CREATE POLICY "Users read own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Each user can only insert their own profile
CREATE POLICY "Users insert own profile"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Each user can only update their own profile
CREATE POLICY "Users update own profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- No delete needed — profile lives as long as the auth user
-- (CASCADE handles deletion when the user is removed)
