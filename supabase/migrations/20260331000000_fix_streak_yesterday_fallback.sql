-- Fix update_user_streak to handle "yesterday fallback":
-- If user has no log today but logged yesterday, the streak is still alive.
-- Previously the function only walked back from p_today, so opening the app
-- before logging a meal today would reset the streak to 0.

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

  -- If no log today, try starting from yesterday (streak still alive until end of today)
  IF v_current = 0 THEN
    v_check := p_today - 1;
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
  END IF;

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
