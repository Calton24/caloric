/**
 * Nutrition Dataset Lookup Service
 *
 * Queries the pre-loaded `nutrition_dataset` table in Supabase for instant
 * food matches — no external API calls needed.
 *
 * The dataset contains 1.85M+ foods:
 * - 1.84M USDA Branded (with brand names and barcodes)
 * - 7,793 USDA SR Legacy
 * - 5,431 USDA Survey (FNDDS)
 * - 353 USDA Foundation (gold-quality)
 * - Open Food Facts (EU/UK packaged foods with barcodes)
 *
 * This is checked BEFORE hitting external APIs in the food matcher.
 * "Local database first. APIs second. Hallucinations never."
 */

import type { FoodMatch, NutrientProfile } from "./matching.types";

// ─── Region → OFF country tag mapping ───────────────────────────────────────

const REGION_TO_COUNTRY_TAG: Record<string, string> = {
  gb: "en:united-kingdom",
  uk: "en:united-kingdom",
  ie: "en:ireland",
  fr: "en:france",
  de: "en:germany",
  es: "en:spain",
  it: "en:italy",
  nl: "en:netherlands",
  be: "en:belgium",
  pl: "en:poland",
  pt: "en:portugal",
  at: "en:austria",
  ch: "en:switzerland",
  se: "en:sweden",
  dk: "en:denmark",
  fi: "en:finland",
  no: "en:norway",
  cz: "en:czech-republic",
  hu: "en:hungary",
  ro: "en:romania",
  gr: "en:greece",
  hr: "en:croatia",
  sk: "en:slovakia",
  bg: "en:bulgaria",
  si: "en:slovenia",
  lu: "en:luxembourg",
  us: "en:united-states",
  ca: "en:canada",
  au: "en:australia",
};

// ─── Supabase Client ────────────────────────────────────────────────────────

let supabaseClient: ReturnType<typeof getSupabaseClientSafe>;

function getSupabaseClientSafe() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSupabaseClient } = require("../../../lib/supabase/client");
    return getSupabaseClient();
  } catch {
    return null;
  }
}

function getClient() {
  if (!supabaseClient) {
    supabaseClient = getSupabaseClientSafe();
  }
  return supabaseClient;
}

// ─── Types ──────────────────────────────────────────────────────────────────

interface DatasetRow {
  source_id: string;
  name: string;
  brand: string | null;
  category: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number | null;
  sugar_per_100g: number | null;
  sodium_per_100g: number | null;
  serving_size_g: number | null;
  serving_desc: string | null;
  household_serving: string | null;
  data_quality: string | null;
  dataset: string;
}

// ─── Core Lookup ────────────────────────────────────────────────────────────

/**
 * Look up a food by barcode (GTIN/UPC/EAN).
 * Returns a single FoodMatch or null if not found.
 */
export async function lookupBarcode(
  barcode: string
): Promise<FoodMatch | null> {
  const client = getClient();
  if (!client) return null;

  const cleaned = barcode.trim();
  // Accept barcodes 6+ chars (UPC-E can be 6-8 digits, EAN-8 = 8, UPC-A = 12, EAN-13 = 13)
  if (!cleaned || cleaned.length < 6) return null;

  const { data, error } = await client
    .from("nutrition_dataset")
    .select(
      "source_id, name, brand, category, dataset, data_quality, " +
        "calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, " +
        "fiber_per_100g, sugar_per_100g, sodium_per_100g, " +
        "serving_size_g, serving_desc, household_serving"
    )
    .eq("barcode", cleaned)
    .limit(1);

  if (error || !data || data.length === 0) return null;

  const match = rowToFoodMatch(data[0] as DatasetRow, data[0].name);
  match.matchScore = 0.99; // barcode = exact match
  return match;
}

/**
 * Search the nutrition_dataset table for matches.
 * Uses Postgres full-text search on the food name.
 *
 * When a `region` is provided, uses the `search_nutrition_by_region` RPC
 * to prioritise products sold in that country (boosting Asda, Lidl, Biedronka
 * results for UK/PL users) while still including generic USDA data.
 *
 * Returns up to `maxResults` FoodMatch objects, scored by relevance.
 */
export async function searchDataset(
  query: string,
  maxResults = 5,
  region?: string
): Promise<FoodMatch[]> {
  const client = getClient();
  if (!client) return [];

  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  // If region is provided, try the region-aware RPC first
  if (region) {
    const regionResults = await searchDatasetByRegion(
      normalizedQuery,
      region,
      maxResults
    );
    if (regionResults.length > 0) return regionResults;
  }

  // Build tsquery — split words and join with &
  const words = normalizedQuery
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .slice(0, 6); // cap at 6 words

  if (words.length === 0) return [];

  const tsquery = words.map((w) => `${w}:*`).join(" & ");

  const { data, error } = await client
    .from("nutrition_dataset")
    .select(
      "source_id, name, brand, category, dataset, data_quality, " +
        "calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, " +
        "fiber_per_100g, sugar_per_100g, sodium_per_100g, " +
        "serving_size_g, serving_desc, household_serving"
    )
    .textSearch("name", tsquery, { type: "websearch" })
    .limit(maxResults);

  if (error || !data || data.length === 0) {
    // Fallback: try ilike prefix match if full-text search finds nothing
    if (!data || data.length === 0) {
      return searchDatasetFuzzy(normalizedQuery, maxResults);
    }
    return [];
  }

  return data.map((row: DatasetRow) => rowToFoodMatch(row, normalizedQuery));
}

/**
 * Region-aware search using the `search_nutrition_by_region` RPC.
 * Prioritises foods sold in the user's country while still including
 * generic (USDA) data for broad coverage.
 */
async function searchDatasetByRegion(
  query: string,
  region: string,
  maxResults: number
): Promise<FoodMatch[]> {
  const client = getClient();
  if (!client) return [];

  const countryTag = REGION_TO_COUNTRY_TAG[region.toLowerCase()];

  const { data, error } = await client.rpc("search_nutrition_by_region", {
    search_query: query,
    country_filter: countryTag ?? null,
    result_limit: maxResults,
  });

  if (error || !data || data.length === 0) return [];

  return data.map(
    (row: DatasetRow & { rank?: number }): FoodMatch =>
      rowToFoodMatch(row, query)
  );
}

/**
 * Fuzzy fallback using pg_trgm trigram similarity when full-text search misses.
 * Catches typos like "mccains" → "McCain's", "warburtins" → "Warburtons".
 */
async function searchDatasetFuzzy(
  query: string,
  maxResults: number
): Promise<FoodMatch[]> {
  const client = getClient();
  if (!client) return [];

  const { data, error } = await client.rpc("search_nutrition_fuzzy", {
    search_query: query,
    result_limit: maxResults,
  });

  if (error || !data || data.length === 0) return [];

  return data.map((row: DatasetRow & { similarity_score?: number }) => {
    const match = rowToFoodMatch(row, query);
    // Scale match score by similarity — fuzzy matches are less confident
    if (row.similarity_score != null) {
      match.matchScore = Math.min(0.85, row.similarity_score * 0.9);
    } else {
      match.matchScore = 0.6;
    }
    return match;
  });
}

// ─── Row → FoodMatch Conversion ─────────────────────────────────────────────

function rowToFoodMatch(row: DatasetRow, query: string): FoodMatch {
  const servingG = row.serving_size_g ?? 100;
  const scale = servingG / 100;

  const nutrients: NutrientProfile = {
    calories: Math.round(row.calories_per_100g * scale),
    protein: Math.round(row.protein_per_100g * scale * 10) / 10,
    carbs: Math.round(row.carbs_per_100g * scale * 10) / 10,
    fat: Math.round(row.fat_per_100g * scale * 10) / 10,
  };
  if (row.fiber_per_100g != null)
    nutrients.fiber = Math.round(row.fiber_per_100g * scale * 10) / 10;
  if (row.sugar_per_100g != null)
    nutrients.sugar = Math.round(row.sugar_per_100g * scale * 10) / 10;
  if (row.sodium_per_100g != null)
    nutrients.sodium = Math.round(row.sodium_per_100g * scale * 10) / 10;

  // Score: prefer exact substring matches & gold-quality data
  // Strongly prefer shorter names that closely match the query length.
  // "omelette" query should rank "Omelette" above "Cheesy Omelette".
  const nameLower = row.name.toLowerCase();
  const queryLower = query.toLowerCase();
  let score = 0.75; // base dataset score

  if (nameLower === queryLower) {
    score = 0.98;
  } else if (nameLower.startsWith(queryLower)) {
    score = 0.92;
  } else if (nameLower.includes(queryLower)) {
    score = 0.85;
  }

  // Length penalty: extra words in the match name beyond the query
  // indicate a more specific/qualified product, not what the user asked for.
  // "omelette" (8 chars) vs "cheesy omelette" (15 chars) → penalty
  if (nameLower !== queryLower && nameLower.length > queryLower.length) {
    const lengthRatio = queryLower.length / nameLower.length;
    // The farther the name is from the query length, the more we penalize
    const lengthPenalty = (1 - lengthRatio) * 0.15;
    score = Math.max(0.5, score - lengthPenalty);
  }

  // Boost gold-quality (Foundation) data
  if (row.data_quality === "gold") {
    score = Math.min(score + 0.03, 1.0);
  }

  const servingDesc =
    row.serving_desc ?? row.household_serving ?? `${servingG}g`;

  return {
    source: "dataset",
    sourceId: row.source_id,
    name: row.name,
    brand: row.brand ?? undefined,
    nutrients,
    servingSize: servingG,
    servingUnit: "g",
    servingDescription: servingDesc,
    matchScore: score,
  };
}
