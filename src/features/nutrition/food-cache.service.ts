/**
 * Food Cache Service
 *
 * Two-layer caching for nutrition API lookups:
 *   1. In-memory LRU cache (instant, survives within session)
 *   2. Supabase persistent cache (survives across sessions, shared across users)
 *
 * Every USDA / OFF / Edamam API result gets cached here.
 * Repeat lookups (e.g. "chicken breast") hit cache instead of the network.
 *
 * "Cache everything. Hit APIs once. Serve from your own DB forever."
 */

import type { FoodMatch, NutrientProfile } from "./matching/matching.types";

// ─── In-Memory LRU Cache ────────────────────────────────────────────────────

const MAX_MEMORY_ENTRIES = 500;
const MEMORY_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface MemoryCacheEntry {
  matches: FoodMatch[];
  timestamp: number;
}

const memoryCache = new Map<string, MemoryCacheEntry>();

function memoryCacheKey(query: string, source?: string): string {
  return `${(source ?? "all").toLowerCase()}::${query.toLowerCase().trim()}`;
}

function getFromMemory(query: string, source?: string): FoodMatch[] | null {
  const key = memoryCacheKey(query, source);
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > MEMORY_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return entry.matches;
}

function setInMemory(
  query: string,
  matches: FoodMatch[],
  source?: string
): void {
  const key = memoryCacheKey(query, source);
  // Evict oldest if at capacity
  if (memoryCache.size >= MAX_MEMORY_ENTRIES) {
    const oldest = memoryCache.keys().next().value;
    if (oldest) memoryCache.delete(oldest);
  }
  memoryCache.set(key, { matches, timestamp: Date.now() });
}

// ─── Supabase Persistent Cache ──────────────────────────────────────────────

let supabaseClient: ReturnType<typeof getSupabaseClientSafe>;

function getSupabaseClientSafe() {
  try {
    // Dynamic import to avoid circular deps and work when Supabase isn't configured
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSupabaseClient } = require("../../lib/supabase/client");
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

interface FoodCacheRow {
  source: string;
  source_id: string;
  name: string;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  serving_size: number;
  serving_unit: string;
  serving_desc: string | null;
  match_score: number | null;
  query: string;
  hit_count: number;
}

function rowToFoodMatch(row: FoodCacheRow): FoodMatch {
  const nutrients: NutrientProfile = {
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
  };
  if (row.fiber != null) nutrients.fiber = row.fiber;
  if (row.sugar != null) nutrients.sugar = row.sugar;
  if (row.sodium != null) nutrients.sodium = row.sodium;

  return {
    source: row.source as FoodMatch["source"],
    sourceId: row.source_id,
    name: row.name,
    brand: row.brand ?? undefined,
    nutrients,
    servingSize: row.serving_size,
    servingUnit: row.serving_unit,
    servingDescription:
      row.serving_desc ?? `${row.serving_size}${row.serving_unit}`,
    matchScore: row.match_score ?? 0.7,
  };
}

function foodMatchToRow(
  match: FoodMatch,
  query: string
): Omit<FoodCacheRow, "hit_count"> {
  return {
    source: match.source,
    source_id: match.sourceId,
    name: match.name,
    brand: match.brand ?? null,
    calories: match.nutrients.calories,
    protein: match.nutrients.protein,
    carbs: match.nutrients.carbs,
    fat: match.nutrients.fat,
    fiber: match.nutrients.fiber ?? null,
    sugar: match.nutrients.sugar ?? null,
    sodium: match.nutrients.sodium ?? null,
    serving_size: match.servingSize,
    serving_unit: match.servingUnit,
    serving_desc: match.servingDescription ?? null,
    match_score: match.matchScore,
    query: query.toLowerCase().trim(),
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Look up cached food matches for a query.
 * Checks in-memory first, then Supabase.
 *
 * @returns Cached FoodMatch[] or null if not cached
 */
export async function getCachedMatches(
  query: string,
  source?: string
): Promise<FoodMatch[] | null> {
  // 1. Check in-memory cache (instant)
  const memResult = getFromMemory(query, source);
  if (memResult) return memResult;

  // 2. Check Supabase persistent cache
  const client = getClient();
  if (!client) return null;

  try {
    const normalizedQuery = query.toLowerCase().trim();
    let dbQuery = client
      .from("food_cache")
      .select("*")
      .eq("query", normalizedQuery)
      .order("match_score", { ascending: false })
      .limit(10);

    if (source) {
      dbQuery = dbQuery.eq("source", source);
    }

    const { data, error } = await dbQuery;

    if (error || !data || data.length === 0) return null;

    const matches = (data as FoodCacheRow[]).map(rowToFoodMatch);

    // Promote to in-memory cache
    setInMemory(query, matches, source);

    // Bump hit count (fire-and-forget)
    const ids = (data as FoodCacheRow[]).map((r) => r.source_id);
    client
      .rpc("increment_food_cache_hits", { source_ids: ids })
      .then(() => {})
      .catch(() => {});

    return matches;
  } catch {
    return null;
  }
}

/**
 * Store food matches in both cache layers.
 * Uses upsert so re-caching the same food updates rather than duplicates.
 */
export async function cacheMatches(
  query: string,
  matches: FoodMatch[]
): Promise<void> {
  if (matches.length === 0) return;

  // 1. Always store in memory (instant, no network)
  setInMemory(query, matches);

  // 2. Persist to Supabase (background, fire-and-forget)
  const client = getClient();
  if (!client) return;

  try {
    const rows = matches.map((m) => foodMatchToRow(m, query));

    await client
      .from("food_cache")
      .upsert(rows, { onConflict: "source,source_id" });
  } catch {
    // Cache write failure is non-critical — don't block the pipeline
  }
}

/**
 * Clear the in-memory cache (useful for testing or memory pressure).
 */
export function clearMemoryCache(): void {
  memoryCache.clear();
}

/**
 * Get cache stats for debugging.
 */
export function getCacheStats(): {
  memoryEntries: number;
  maxEntries: number;
} {
  return {
    memoryEntries: memoryCache.size,
    maxEntries: MAX_MEMORY_ENTRIES,
  };
}
