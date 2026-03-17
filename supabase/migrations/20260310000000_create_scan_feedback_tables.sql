-- ─── Scan Feedback Tables ─────────────────────────────────────────────────
-- Supports the human-in-the-loop feedback loop:
--   scan → predict → confirm/correct → store feedback → improve pipeline

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. food_scan_events — every scan attempt
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS food_scan_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Pipeline metadata
  pipeline_version    TEXT NOT NULL DEFAULT '1.0.0',
  taxonomy_version    TEXT NOT NULL DEFAULT '1.0.0',
  source              TEXT NOT NULL, -- 'camera' | 'barcode' | 'voice' | 'text'
  raw_input           TEXT,          -- barcode string, user description, etc.

  -- Pipeline stage outputs (nullable — not every scan hits every stage)
  image_quality       JSONB,   -- { passed, usabilityScore, issues[] }
  ocr_result          JSONB,   -- { rawText, filtered }
  barcode_result      JSONB,   -- { code, product, source }
  classifier_result   JSONB,   -- { labels[], confidences[] }
  candidate_result    JSONB,   -- { candidates[], taxonomyCategory }
  matched_result      JSONB,   -- { matchedName, matchSource, matchId, nutrients }

  -- Final outcome
  final_food_name     TEXT,
  final_calories      REAL,
  final_protein       REAL,
  final_carbs         REAL,
  final_fat           REAL,
  confidence          REAL,

  -- User interaction
  confirmed_by_user   BOOLEAN DEFAULT FALSE,
  edited_by_user      BOOLEAN DEFAULT FALSE,
  reported_by_user    BOOLEAN DEFAULT FALSE
);

-- Indexes
CREATE INDEX idx_scan_events_user    ON food_scan_events (user_id, created_at DESC);
CREATE INDEX idx_scan_events_source  ON food_scan_events (source);
CREATE INDEX idx_scan_events_version ON food_scan_events (pipeline_version);

-- RLS
ALTER TABLE food_scan_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scan events"
  ON food_scan_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scan events"
  ON food_scan_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scan events"
  ON food_scan_events FOR UPDATE
  USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. food_scan_reports — structured issue reports
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS food_scan_reports (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_event_id   UUID REFERENCES food_scan_events(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Structured reason
  reason_code     TEXT NOT NULL,
  -- Valid codes: wrong_food | wrong_macros | wrong_quantity |
  --             label_mismatch | barcode_mismatch | missing_item |
  --             image_unclear | duplicate | other
  reason_text     TEXT, -- optional free-form detail (max 500 chars)

  -- Triage status
  status          TEXT NOT NULL DEFAULT 'new'
  -- Valid: new | reviewed | accepted_correction | rejected_report |
  --        used_for_retraining | resolved_by_rules
);

CREATE INDEX idx_scan_reports_user   ON food_scan_reports (user_id, created_at DESC);
CREATE INDEX idx_scan_reports_status ON food_scan_reports (status);
CREATE INDEX idx_scan_reports_reason ON food_scan_reports (reason_code);

ALTER TABLE food_scan_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own reports"
  ON food_scan_reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
  ON food_scan_reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. food_scan_corrections — user-supplied ground truth
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS food_scan_corrections (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  scan_event_id       UUID REFERENCES food_scan_events(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- Original prediction
  original_food_name  TEXT,
  original_macros     JSONB, -- { calories, protein, carbs, fat }
  original_serving    TEXT,

  -- User correction
  corrected_food_name TEXT,
  corrected_macros    JSONB, -- { calories, protein, carbs, fat }
  corrected_serving   TEXT
);

CREATE INDEX idx_scan_corrections_user ON food_scan_corrections (user_id, created_at DESC);

ALTER TABLE food_scan_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own corrections"
  ON food_scan_corrections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own corrections"
  ON food_scan_corrections FOR INSERT
  WITH CHECK (auth.uid() = user_id);
