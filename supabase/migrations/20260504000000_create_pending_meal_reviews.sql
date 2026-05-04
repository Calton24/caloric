-- ============================================================
-- Pending Meal Reviews + Storage Bucket for Captured Images
--
-- Why this exists:
--   The "Recently uploaded" Home card was previously a single,
--   local-only optimistic job persisted in AsyncStorage. That works
--   for one scan at a time but breaks down when:
--     - the user scans 3 things in a row (only the latest survives)
--     - the user opens the app on a second device
--     - the local image URI is invalidated by OS cleanup
--     - the app is force-quit mid-pipeline and the state is lost
--
--   This migration introduces a server-authoritative pending-review
--   queue, plus a private Supabase Storage bucket for the captured
--   image. The client keeps an optimistic local mirror keyed by id,
--   reconciles against this table, and renders the items in a
--   newest-first stack with swipe-to-delete parity to meal cards.
--
-- Image storage:
--   `meal-review-images` is a private bucket. We never store a
--   permanent public URL — the client requests a short-lived signed
--   URL on demand. Image objects are namespaced by user_id so the
--   storage policies can be written purely from the path.
-- ============================================================

-- ── 1. Pending Meal Reviews table ─────────────────────────────

CREATE TABLE IF NOT EXISTS pending_meal_reviews (
  id              TEXT        PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Lifecycle
  status          TEXT        NOT NULL CHECK (status IN (
                                'queued',
                                'analyzing',
                                'complete',
                                'error',
                                'saved',
                                'dismissed'
                              )),
  source          TEXT        NOT NULL DEFAULT 'ai_camera'
                              CHECK (source IN ('ai_camera','barcode','manual')),

  -- Coarse stage indicator surfaced by the analyzing UI
  stage           TEXT        CHECK (stage IN (
                                'uploading',
                                'identifying',
                                'estimating',
                                'preparing'
                              )),
  progress        REAL        NOT NULL DEFAULT 0
                              CHECK (progress >= 0 AND progress <= 1),

  -- Result
  title           TEXT,
  calories        REAL,
  draft_json      JSONB,                -- full MealDraft for restore on Review

  -- Image
  image_path      TEXT,                 -- storage object path inside `meal-review-images`
  image_uri       TEXT,                 -- optional fallback (rare; usually null)

  -- Diagnostics
  error_message   TEXT,

  -- If/when the user saves this draft, we link to the resulting meal_entries row
  -- so we have an audit trail and can tombstone correctly. Nullable until saved.
  saved_meal_id   TEXT        REFERENCES meal_entries(id) ON DELETE SET NULL,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Most reads are "show me the active queue, newest first" — keep that fast.
CREATE INDEX IF NOT EXISTS idx_pending_meal_reviews_user_active
  ON pending_meal_reviews (user_id, created_at DESC)
  WHERE status IN ('queued','analyzing','complete','error');

CREATE INDEX IF NOT EXISTS idx_pending_meal_reviews_user_created
  ON pending_meal_reviews (user_id, created_at DESC);

-- ── 2. RLS ────────────────────────────────────────────────────

ALTER TABLE pending_meal_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own pending reviews"
  ON pending_meal_reviews FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own pending reviews"
  ON pending_meal_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own pending reviews"
  ON pending_meal_reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own pending reviews"
  ON pending_meal_reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── 3. updated_at trigger ─────────────────────────────────────

CREATE OR REPLACE FUNCTION pending_meal_reviews_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pending_meal_reviews_updated_at ON pending_meal_reviews;
CREATE TRIGGER trg_pending_meal_reviews_updated_at
  BEFORE UPDATE ON pending_meal_reviews
  FOR EACH ROW
  EXECUTE FUNCTION pending_meal_reviews_set_updated_at();

-- ── 4. Storage bucket for captured meal-review images ─────────
--
-- Private bucket. The client uploads compressed JPEGs (≤1024px on
-- the longest edge) keyed by `<user_id>/<scan_id>.jpg`. The client
-- then asks for a signed URL with a short TTL (~1 hour) when it
-- needs to render the image.
--
-- We rely on `storage.foldername(name)[1] = user_id::text` for path
-- ownership. This matches the convention used by Supabase's own
-- "Avatar" example and keeps policies declarative.

INSERT INTO storage.buckets (id, name, public)
VALUES ('meal-review-images', 'meal-review-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies. Wrapped in DO blocks so re-running this migration
-- against an environment that already created them by hand is safe.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'storage'
       AND tablename  = 'objects'
       AND policyname = 'Users read own meal-review images'
  ) THEN
    CREATE POLICY "Users read own meal-review images"
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'meal-review-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'storage'
       AND tablename  = 'objects'
       AND policyname = 'Users upload own meal-review images'
  ) THEN
    CREATE POLICY "Users upload own meal-review images"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'meal-review-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'storage'
       AND tablename  = 'objects'
       AND policyname = 'Users update own meal-review images'
  ) THEN
    CREATE POLICY "Users update own meal-review images"
      ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = 'meal-review-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_policies
     WHERE schemaname = 'storage'
       AND tablename  = 'objects'
       AND policyname = 'Users delete own meal-review images'
  ) THEN
    CREATE POLICY "Users delete own meal-review images"
      ON storage.objects FOR DELETE TO authenticated
      USING (
        bucket_id = 'meal-review-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  END IF;
END $$;

-- ── 5. Optional: image_path on meal_entries ───────────────────
--
-- meal_entries already has `image_uri TEXT`. We add `image_path`
-- alongside it so saved meals can render from the private bucket
-- even after the local URI expires. `image_uri` is kept as the
-- low-friction fallback.

ALTER TABLE meal_entries
  ADD COLUMN IF NOT EXISTS image_path TEXT;
