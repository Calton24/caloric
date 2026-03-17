-- ─── Vision Analysis Support ─────────────────────────────────────────────
-- Adds columns to food_scan_events for the gpt-4o-mini vision pipeline.
-- These columns track model performance, decomposition results, and
-- user corrections at the per-item level.

-- Add vision-specific columns to existing scan events table
ALTER TABLE food_scan_events
  ADD COLUMN IF NOT EXISTS vision_model TEXT,
  ADD COLUMN IF NOT EXISTS vision_latency_ms INTEGER,
  ADD COLUMN IF NOT EXISTS vision_tokens_used INTEGER,
  ADD COLUMN IF NOT EXISTS decomposition JSONB,
  ADD COLUMN IF NOT EXISTS resolved_items JSONB,
  ADD COLUMN IF NOT EXISTS item_corrections JSONB,
  ADD COLUMN IF NOT EXISTS confidence_band TEXT,
  ADD COLUMN IF NOT EXISTS original_totals JSONB,
  ADD COLUMN IF NOT EXISTS final_totals JSONB,
  ADD COLUMN IF NOT EXISTS items_added INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_removed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS items_portion_edited INTEGER DEFAULT 0;

-- Index for vision pipeline analytics
CREATE INDEX IF NOT EXISTS idx_scan_events_vision_model
  ON food_scan_events (vision_model)
  WHERE vision_model IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scan_events_confidence_band
  ON food_scan_events (confidence_band)
  WHERE confidence_band IS NOT NULL;

-- ─── Vision Analysis Corrections (per-item tracking) ─────────────────────
-- Tracks what the model predicted vs what the user changed,
-- at the individual food component level.

CREATE TABLE IF NOT EXISTS vision_item_corrections (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_event_id       UUID REFERENCES food_scan_events(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- What the model detected
  original_label      TEXT NOT NULL,
  original_grams      REAL,
  original_calories   REAL,
  original_confidence REAL,

  -- What the user changed it to
  corrected_label     TEXT,
  corrected_grams     REAL,
  corrected_calories  REAL,

  -- What type of correction
  correction_type     TEXT NOT NULL
  -- Valid: portion_edit | name_edit | removed | added | macros_edit
);

CREATE INDEX IF NOT EXISTS idx_vision_corrections_scan
  ON vision_item_corrections (scan_event_id);

CREATE INDEX IF NOT EXISTS idx_vision_corrections_type
  ON vision_item_corrections (correction_type);

ALTER TABLE vision_item_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vision corrections"
  ON vision_item_corrections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vision corrections"
  ON vision_item_corrections FOR INSERT
  WITH CHECK (auth.uid() = user_id);
