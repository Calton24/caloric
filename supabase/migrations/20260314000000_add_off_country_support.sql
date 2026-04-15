-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Add country_tags column and indexes for Open Food Facts data
--
-- Supports the OFF → Supabase import pipeline and region-aware food search.
-- Adds a `country_tags` column to track which countries a product is sold in,
-- enabling queries like "show me foods sold in Poland" without hitting the
-- OFF API.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Add country_tags column (array of OFF country tags, e.g. "en:united-kingdom")
ALTER TABLE nutrition_dataset
  ADD COLUMN IF NOT EXISTS country_tags TEXT[];

-- 2. GIN index on country_tags for fast @> (contains) queries
CREATE INDEX IF NOT EXISTS idx_nd_country_tags
  ON nutrition_dataset USING gin (country_tags)
  WHERE country_tags IS NOT NULL;

-- 3. Composite index: dataset + barcode for OFF-specific barcode lookups
CREATE INDEX IF NOT EXISTS idx_nd_dataset_barcode
  ON nutrition_dataset (dataset, barcode)
  WHERE barcode IS NOT NULL;

-- 4. Partial index for OFF data (speeds up queries scoped to openfoodfacts)
CREATE INDEX IF NOT EXISTS idx_nd_off_name_fts
  ON nutrition_dataset USING gin (to_tsvector('english', name))
  WHERE dataset = 'openfoodfacts';

-- 5. Helper function: search foods by name with optional country filter
CREATE OR REPLACE FUNCTION search_nutrition_by_region(
  search_query TEXT,
  country_filter TEXT DEFAULT NULL,
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
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  RETURN QUERY
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
    ts_rank_cd(to_tsvector('english', nd.name), websearch_to_tsquery(search_query)) AS rank
  FROM nutrition_dataset AS nd
  WHERE
    to_tsvector('english', nd.name) @@ websearch_to_tsquery(search_query)
    AND (
      country_filter IS NULL
      OR nd.country_tags @> ARRAY[country_filter]
      OR nd.country_tags IS NULL  -- include generic (USDA) foods always
    )
  ORDER BY
    -- Boost exact regional matches
    CASE WHEN country_filter IS NOT NULL AND nd.country_tags @> ARRAY[country_filter] THEN 0 ELSE 1 END,
    -- Then by text relevance
    ts_rank_cd(to_tsvector('english', nd.name), websearch_to_tsquery(search_query)) DESC,
    -- Then by data quality
    CASE nd.data_quality WHEN 'gold' THEN 0 WHEN 'standard' THEN 1 ELSE 2 END
  LIMIT result_limit;
END;
$$;
