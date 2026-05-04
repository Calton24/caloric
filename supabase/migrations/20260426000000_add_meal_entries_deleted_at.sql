-- ============================================================
-- Soft-delete column for meal_entries
--
-- Why: when a user deletes a meal locally, the client previously
-- issued a hard DELETE. If the user was offline, or if another
-- device's `restoreFromSupabase` pulled before the delete reached
-- the server, the meal could be silently re-added back into local
-- state and reappear on the home screen on the next hot reload.
--
-- This adds a tombstone column so the row stays auditable while
-- being filtered out of every read path in `pullMeals`. The client
-- continues to work against projects that haven't run this
-- migration: it falls back to hard-delete if the column is missing.
-- ============================================================

ALTER TABLE meal_entries
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Filtered index keeps active-meal queries fast: most rows have
-- deleted_at IS NULL, and we only ever query the live ones.
CREATE INDEX IF NOT EXISTS idx_meal_entries_user_active
  ON meal_entries (user_id, logged_at DESC)
  WHERE deleted_at IS NULL;
