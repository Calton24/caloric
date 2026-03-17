-- ─── Nutrition Reference Dataset ──────────────────────────────────────────
-- Pre-loaded food nutrition database for instant offline lookups.
--
-- Unlike `food_cache` (which stores individual API results as users search),
-- this table is a BULK-IMPORTED reference dataset populated from official
-- nutrition databases (USDA, Open Food Facts, etc.).
--
-- The pipeline checks this table BEFORE hitting external APIs.
-- If a food is here, skip the network call entirely.

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. nutrition_dataset — the reference food table
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS nutrition_dataset (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- ── Source provenance ──────────────────────────────────────────────────
  dataset         TEXT NOT NULL,        -- 'usda_foundation' | 'usda_sr_legacy' |
                                        -- 'usda_branded' | 'openfoodfacts' | 'custom'
  dataset_version TEXT,                 -- e.g., '2025-10', 'SR28', 'OFF-2025-12'
  source_id       TEXT NOT NULL,        -- FDC ID, OFF barcode, custom ID
  imported_at     TIMESTAMPTZ DEFAULT now() NOT NULL,

  -- ── Food identity ─────────────────────────────────────────────────────
  name            TEXT NOT NULL,        -- "Chicken breast, raw, boneless, skinless"
  name_normalized TEXT NOT NULL,        -- lowercase, trimmed, no extra spaces
  brand           TEXT,                 -- null for generic foods
  barcode         TEXT,                 -- GTIN/EAN/UPC — null for generic foods
  category        TEXT,                 -- "Poultry Products", "Dairy", etc.
  food_group      TEXT,                 -- USDA food group or OFF category

  -- ── Core macros (per 100g) ────────────────────────────────────────────
  -- Stored per 100g for consistency. Servings convert at query time.
  calories_per_100g  REAL NOT NULL,
  protein_per_100g   REAL NOT NULL DEFAULT 0,
  carbs_per_100g     REAL NOT NULL DEFAULT 0,
  fat_per_100g       REAL NOT NULL DEFAULT 0,
  fiber_per_100g     REAL,
  sugar_per_100g     REAL,
  sodium_per_100g    REAL,              -- mg per 100g
  saturated_fat_per_100g REAL,
  cholesterol_per_100g   REAL,          -- mg per 100g
  potassium_per_100g     REAL,          -- mg per 100g

  -- ── Extended micronutrients (JSONB for flexibility) ───────────────────
  micronutrients  JSONB,               -- { vitaminA_ug, vitaminC_mg, calcium_mg, iron_mg, ... }

  -- ── Serving information ───────────────────────────────────────────────
  serving_size_g     REAL,              -- standard serving in grams (e.g., 85 for chicken)
  serving_desc       TEXT,              -- "1 breast", "1 cup", "1 container"
  household_serving  TEXT,              -- "3 oz", "1 medium", "1 tbsp"
  portions           JSONB,            -- [{ desc: "1 cup", grams: 240 }, { desc: "1 tbsp", grams: 15 }]

  -- ── Quality & freshness ───────────────────────────────────────────────
  data_quality       TEXT DEFAULT 'standard', -- 'gold' | 'standard' | 'estimated'
  last_verified      TIMESTAMPTZ,       -- when this entry was last checked against source

  -- ── Deduplication ─────────────────────────────────────────────────────
  UNIQUE (dataset, source_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. Indexes for fast lookups
-- ═══════════════════════════════════════════════════════════════════════════

-- Full-text search on food name (primary search path)
CREATE INDEX idx_nd_name_fts
  ON nutrition_dataset USING gin (to_tsvector('english', name));

-- Exact normalized name match (fastest for known foods)
CREATE INDEX idx_nd_name_normalized
  ON nutrition_dataset (name_normalized);

-- Trigram index for fuzzy / partial matching (requires pg_trgm extension)
-- NOTE: Run `CREATE EXTENSION IF NOT EXISTS pg_trgm;` first if not enabled.
-- CREATE INDEX idx_nd_name_trgm
--   ON nutrition_dataset USING gin (name_normalized gin_trgm_ops);

-- Barcode lookup (instant barcode → nutrition)
CREATE INDEX idx_nd_barcode
  ON nutrition_dataset (barcode)
  WHERE barcode IS NOT NULL;

-- Category/food group for browsing
CREATE INDEX idx_nd_category
  ON nutrition_dataset (category);

-- Dataset + version for batch operations (reimport, delete old version)
CREATE INDEX idx_nd_dataset_version
  ON nutrition_dataset (dataset, dataset_version);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. RLS — public read, only service_role can write (bulk import)
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE nutrition_dataset ENABLE ROW LEVEL SECURITY;

-- Anyone can read (no auth required for food lookups)
CREATE POLICY "Public read access to nutrition dataset"
  ON nutrition_dataset FOR SELECT
  USING (true);

-- Only service_role can insert/update/delete (bulk import scripts)
CREATE POLICY "Service role can manage nutrition dataset"
  ON nutrition_dataset FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Helper function: search foods by name
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION search_nutrition_dataset(
  search_query TEXT,
  result_limit INT DEFAULT 10
)
RETURNS TABLE (
  id              UUID,
  name            TEXT,
  brand           TEXT,
  category        TEXT,
  barcode         TEXT,
  dataset         TEXT,
  calories_per_100g  REAL,
  protein_per_100g   REAL,
  carbs_per_100g     REAL,
  fat_per_100g       REAL,
  serving_size_g     REAL,
  serving_desc       TEXT,
  rank            REAL
)
LANGUAGE sql STABLE
AS $$
  SELECT
    nd.id,
    nd.name,
    nd.brand,
    nd.category,
    nd.barcode,
    nd.dataset,
    nd.calories_per_100g,
    nd.protein_per_100g,
    nd.carbs_per_100g,
    nd.fat_per_100g,
    nd.serving_size_g,
    nd.serving_desc,
    ts_rank(to_tsvector('english', nd.name), plainto_tsquery('english', search_query)) AS rank
  FROM nutrition_dataset nd
  WHERE to_tsvector('english', nd.name) @@ plainto_tsquery('english', search_query)
  ORDER BY rank DESC
  LIMIT result_limit;
$$;
