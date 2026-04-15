/**
 * Food Memory Service — Personal Calibration Engine
 *
 * Tracks user eating patterns to enable:
 *   - Frequent food shortcuts (fast re-logging)
 *   - Personal portion calibration (their "protein shake" = 220 kcal, not generic 300)
 *   - Confidence boosting for previously logged foods
 *   - "Eat again?" suggestions
 *
 * Data flows: meals store → food memory → pipeline integration
 */

import type { MealTime } from "../mealtime";
import { mealTimeFromISO } from "../mealtime";
import { MealEntry } from "../nutrition.types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FoodMemoryEntry {
  /** Normalized food name (lowercased, trimmed) */
  name: string;
  /** Number of times this food has been logged */
  frequency: number;
  /** Last time this food was logged (ISO string) */
  lastLoggedAt: string;
  /** Average calories across all logs */
  avgCalories: number;
  /** Average protein */
  avgProtein: number;
  /** Average carbs */
  avgCarbs: number;
  /** Average fat */
  avgFat: number;
  /** Most recent calorie value (for quick re-log) */
  lastCalories: number;
  lastProtein: number;
  lastCarbs: number;
  lastFat: number;
  /** The emoji used for this food */
  emoji?: string;
  /** Source that produced the best match */
  preferredSource?: string;
  /** Parse method that worked best */
  preferredParseMethod?: string;
  /** Per-mealtime calorie averages (personal calibration) */
  mealtimeStats?: Map<MealTime, { avgCalories: number; count: number }>;
}

export interface FoodMemoryResult {
  entry: FoodMemoryEntry;
  /** How similar this match is to the query (0-1) */
  similarity: number;
}

// ─── In-Memory Cache (Rebuilt from Meals Store) ─────────────────────────────

const memoryMap = new Map<string, FoodMemoryEntry>();

/**
 * Normalize a food name for consistent lookups.
 */
function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Rebuild food memory from the full meals history.
 * Called on app start and after each new meal is logged.
 */
export function rebuildFoodMemory(meals: MealEntry[]): void {
  memoryMap.clear();

  for (const meal of meals) {
    // Process individual items if available
    if (meal.items && meal.items.length > 0) {
      for (const item of meal.items) {
        addToMemory(
          item.name,
          item.calories,
          item.protein,
          item.carbs,
          item.fat,
          meal.loggedAt,
          item.emoji,
          item.matchSource,
          meal.parseMethod
        );
      }
    } else {
      // Single-item meal — use the meal title
      addToMemory(
        meal.title,
        meal.calories,
        meal.protein,
        meal.carbs,
        meal.fat,
        meal.loggedAt,
        meal.emoji,
        undefined,
        meal.parseMethod
      );
    }
  }
}

function addToMemory(
  name: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  loggedAt: string,
  emoji?: string,
  matchSource?: string,
  parseMethod?: string
): void {
  const key = normalize(name);
  if (!key || key.length < 2) return;

  const mealtime = mealTimeFromISO(loggedAt);

  const existing = memoryMap.get(key);
  if (existing) {
    const n = existing.frequency;
    existing.frequency = n + 1;
    // Running average
    existing.avgCalories = Math.round(
      (existing.avgCalories * n + calories) / (n + 1)
    );
    existing.avgProtein =
      Math.round(((existing.avgProtein * n + protein) / (n + 1)) * 10) / 10;
    existing.avgCarbs =
      Math.round(((existing.avgCarbs * n + carbs) / (n + 1)) * 10) / 10;
    existing.avgFat =
      Math.round(((existing.avgFat * n + fat) / (n + 1)) * 10) / 10;
    // Update "last" values if this is more recent
    if (loggedAt > existing.lastLoggedAt) {
      existing.lastLoggedAt = loggedAt;
      existing.lastCalories = calories;
      existing.lastProtein = protein;
      existing.lastCarbs = carbs;
      existing.lastFat = fat;
      if (emoji) existing.emoji = emoji;
      if (matchSource) existing.preferredSource = matchSource;
      if (parseMethod) existing.preferredParseMethod = parseMethod;
    }
    // Update mealtime stats
    if (!existing.mealtimeStats) existing.mealtimeStats = new Map();
    const mt = existing.mealtimeStats.get(mealtime);
    if (mt) {
      mt.avgCalories = Math.round(
        (mt.avgCalories * mt.count + calories) / (mt.count + 1)
      );
      mt.count += 1;
    } else {
      existing.mealtimeStats.set(mealtime, { avgCalories: calories, count: 1 });
    }
  } else {
    memoryMap.set(key, {
      name: key,
      frequency: 1,
      lastLoggedAt: loggedAt,
      avgCalories: calories,
      avgProtein: protein,
      avgCarbs: carbs,
      avgFat: fat,
      lastCalories: calories,
      lastProtein: protein,
      lastCarbs: carbs,
      lastFat: fat,
      emoji,
      preferredSource: matchSource,
      preferredParseMethod: parseMethod,
      mealtimeStats: new Map([[mealtime, { avgCalories: calories, count: 1 }]]),
    });
  }
}

// ─── Query API ──────────────────────────────────────────────────────────────

/**
 * Look up exact food memory entry.
 */
export function getExactMemory(foodName: string): FoodMemoryEntry | null {
  return memoryMap.get(normalize(foodName)) ?? null;
}

/**
 * Find the best matching food memory entry for a query.
 * Uses substring and similarity matching.
 */
export function findBestMemoryMatch(query: string): FoodMemoryResult | null {
  const q = normalize(query);
  if (!q || q.length < 2) return null;

  // 1. Exact match
  const exact = memoryMap.get(q);
  if (exact) return { entry: exact, similarity: 1.0 };

  // 2. Substring match — find entries where query is contained or contains
  let bestMatch: FoodMemoryResult | null = null;

  for (const [key, entry] of memoryMap) {
    let sim = 0;

    if (key.includes(q) || q.includes(key)) {
      // Substring similarity based on length ratio
      sim = Math.min(q.length, key.length) / Math.max(q.length, key.length);
      // Boost frequently logged foods
      sim = Math.min(1, sim + Math.min(entry.frequency * 0.02, 0.15));
    }

    if (sim > 0 && (!bestMatch || sim > bestMatch.similarity)) {
      bestMatch = { entry, similarity: sim };
    }
  }

  return bestMatch && bestMatch.similarity >= 0.5 ? bestMatch : null;
}

/**
 * Get the most frequently logged foods, sorted by frequency.
 */
export function getFrequentFoods(limit = 20): FoodMemoryEntry[] {
  return Array.from(memoryMap.values())
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, limit);
}

/**
 * Get recently logged foods, sorted by recency.
 */
export function getRecentFoods(limit = 10): FoodMemoryEntry[] {
  return Array.from(memoryMap.values())
    .sort((a, b) => b.lastLoggedAt.localeCompare(a.lastLoggedAt))
    .slice(0, limit);
}

/**
 * Get the number of unique foods in memory.
 */
export function getMemorySize(): number {
  return memoryMap.size;
}

/**
 * Check if user has any food history at all.
 */
export function hasMemory(): boolean {
  return memoryMap.size > 0;
}

/**
 * Get the user's average calories for a food at a specific mealtime.
 * Returns null if no data exists for that food/mealtime combo.
 */
export function getMealtimeCalories(
  foodName: string,
  mealtime: MealTime
): { avgCalories: number; count: number } | null {
  const entry = memoryMap.get(normalize(foodName));
  if (!entry?.mealtimeStats) return null;
  return entry.mealtimeStats.get(mealtime) ?? null;
}
