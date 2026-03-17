-- Fix search_nutrition_fuzzy: correct column types (NUMERIC → REAL)
-- and use word_similarity for better multi-word query matching.
-- word_similarity compares how well the query appears as a substring
-- of the target, which works much better for queries like "mccains chips"
-- matched against long product names.

-- Must DROP first because return type changed (NUMERIC → REAL)
DROP FUNCTION IF EXISTS search_nutrition_fuzzy(TEXT, INT);

CREATE OR REPLACE FUNCTION search_nutrition_fuzzy(
  search_query TEXT,
  result_limit INT DEFAULT 10
)
RETURNS TABLE (
  source_id     TEXT,
  name          TEXT,
  brand         TEXT,
  category      TEXT,
  dataset       TEXT,
  data_quality  TEXT,
  calories_per_100g REAL,
  protein_per_100g  REAL,
  carbs_per_100g    REAL,
  fat_per_100g      REAL,
  fiber_per_100g    REAL,
  sugar_per_100g    REAL,
  sodium_per_100g   REAL,
  serving_size_g    REAL,
  serving_desc      TEXT,
  household_serving TEXT,
  similarity_score  REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    nd.source_id,
    nd.name,
    nd.brand,
    nd.category,
    nd.dataset,
    nd.data_quality,
    nd.calories_per_100g,
    nd.protein_per_100g,
    nd.carbs_per_100g,
    nd.fat_per_100g,
    nd.fiber_per_100g,
    nd.sugar_per_100g,
    nd.sodium_per_100g,
    nd.serving_size_g,
    nd.serving_desc,
    nd.household_serving,
    word_similarity(search_query, nd.name_normalized) AS similarity_score
  FROM nutrition_dataset nd
  WHERE search_query <% nd.name_normalized
  ORDER BY similarity_score DESC
  LIMIT result_limit;
END;
$$;
