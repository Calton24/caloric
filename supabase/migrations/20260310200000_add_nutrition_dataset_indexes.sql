-- Additional indexes for nutrition_dataset
-- Supports branded food search by brand name and source ID lookup

-- Brand name index (for brand-filtered queries)
CREATE INDEX IF NOT EXISTS idx_nd_brand
  ON nutrition_dataset (lower(brand))
  WHERE brand IS NOT NULL;

-- Source ID index (for direct FDC ID lookups)
CREATE INDEX IF NOT EXISTS idx_nd_source_id
  ON nutrition_dataset (source_id);

-- Category + name composite for category-scoped candidate retrieval
CREATE INDEX IF NOT EXISTS idx_nd_category_name_fts
  ON nutrition_dataset USING gin (category, to_tsvector('english', name));
