/**
 * Edamam Food Database Service
 *
 * NLP-friendly nutrition lookup — excels at parsing natural language
 * food descriptions like "grilled chicken breast with rice" into
 * structured nutrient data.
 *
 * API docs: https://developer.edamam.com/food-database-api-docs
 * Base URL: https://api.edamam.com/api/food-database/v2
 *
 * Requires EXPO_PUBLIC_EDAMAM_APP_ID and EXPO_PUBLIC_EDAMAM_APP_KEY.
 * Free tier: 100 calls/min. Returns parsed ingredients with nutrients.
 */

import type { FoodMatch, NutrientProfile } from "./matching.types";

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = "https://api.edamam.com/api/food-database/v2";

function getAppId(): string {
  try {
    return (
      (typeof process !== "undefined" &&
        process.env?.EXPO_PUBLIC_EDAMAM_APP_ID) ||
      ""
    );
  } catch {
    return "";
  }
}

function getAppKey(): string {
  try {
    return (
      (typeof process !== "undefined" &&
        process.env?.EXPO_PUBLIC_EDAMAM_APP_KEY) ||
      ""
    );
  } catch {
    return "";
  }
}

/** Returns true if Edamam credentials are configured */
export function isEdamamConfigured(): boolean {
  return getAppId().length > 0 && getAppKey().length > 0;
}

// ─── Edamam API Response Types ───────────────────────────────────────────────

interface EdamamNutrients {
  ENERC_KCAL?: number; // Energy kcal
  PROCNT?: number; // Protein g
  CHOCDF?: number; // Carbs g
  FAT?: number; // Fat g
  FIBTG?: number; // Fiber g
  SUGAR?: number; // Sugar g
  NA?: number; // Sodium mg
}

interface EdamamMeasure {
  uri: string;
  label: string;
  weight: number; // grams
}

interface EdamamFood {
  foodId: string;
  label: string;
  knownAs?: string;
  brand?: string;
  category: string; // "Generic foods", "Packaged foods", "Generic meals"
  categoryLabel: string;
  nutrients: EdamamNutrients;
  servingSizes?: { uri: string; label: string; quantity: number }[];
  image?: string;
}

interface EdamamHint {
  food: EdamamFood;
  measures: EdamamMeasure[];
}

interface EdamamParserResponse {
  text: string;
  parsed: { food: EdamamFood; quantity: number; measure: EdamamMeasure }[];
  hints: EdamamHint[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildNutrientProfile(nutrients: EdamamNutrients): NutrientProfile {
  return {
    calories: Math.round(nutrients.ENERC_KCAL ?? 0),
    protein: Math.round((nutrients.PROCNT ?? 0) * 10) / 10,
    carbs: Math.round((nutrients.CHOCDF ?? 0) * 10) / 10,
    fat: Math.round((nutrients.FAT ?? 0) * 10) / 10,
    fiber:
      nutrients.FIBTG !== undefined
        ? Math.round(nutrients.FIBTG * 10) / 10
        : undefined,
    sugar:
      nutrients.SUGAR !== undefined
        ? Math.round(nutrients.SUGAR * 10) / 10
        : undefined,
    sodium: nutrients.NA !== undefined ? Math.round(nutrients.NA) : undefined,
  };
}

/**
 * Scale per-100g nutrients to the given serving weight.
 */
function scaleNutrients(
  per100g: NutrientProfile,
  servingGrams: number
): NutrientProfile {
  const scale = servingGrams / 100;
  return {
    calories: Math.round(per100g.calories * scale),
    protein: Math.round(per100g.protein * scale * 10) / 10,
    carbs: Math.round(per100g.carbs * scale * 10) / 10,
    fat: Math.round(per100g.fat * scale * 10) / 10,
    fiber:
      per100g.fiber !== undefined
        ? Math.round(per100g.fiber * scale * 10) / 10
        : undefined,
    sugar:
      per100g.sugar !== undefined
        ? Math.round(per100g.sugar * scale * 10) / 10
        : undefined,
    sodium:
      per100g.sodium !== undefined
        ? Math.round(per100g.sodium * scale)
        : undefined,
  };
}

/**
 * Score how well an Edamam result matches the query.
 * Prefers NLP-parsed results and generic foods over packaged.
 */
function scoreMatch(
  food: EdamamFood,
  query: string,
  isParsed: boolean
): number {
  const label = food.label.toLowerCase();
  const q = query.toLowerCase();

  let score = 0;

  // NLP-parsed results get a strong boost — Edamam understood the query
  if (isParsed) {
    score += 0.4;
  }

  // Text similarity
  if (label === q) {
    score += 0.4;
  } else if (label.startsWith(q)) {
    score += 0.3;
  } else if (label.includes(q) || q.includes(label)) {
    score += 0.2;
  } else {
    // Check word overlap
    const qWords = q.split(/\s+/);
    const lWords = label.split(/\s+/);
    const overlap = qWords.filter((w) => lWords.includes(w)).length;
    score += Math.min(0.15, (overlap / qWords.length) * 0.2);
  }

  // Category preference: generic foods and meals > packaged
  const categoryBonus: Record<string, number> = {
    "Generic foods": 0.2,
    "Generic meals": 0.2,
    "Packaged foods": 0.1,
  };
  score += categoryBonus[food.category] ?? 0.05;

  return Math.min(score, 1.0);
}

/**
 * Pick the best serving measure for a food.
 * Prefers "Serving" > "Whole" > first available > fallback 100g.
 */
function pickBestMeasure(measures: EdamamMeasure[]): {
  servingSize: number;
  servingUnit: string;
  servingDescription: string;
} {
  if (!measures || measures.length === 0) {
    return { servingSize: 100, servingUnit: "g", servingDescription: "100g" };
  }

  // Prefer "Serving" measure
  const serving = measures.find(
    (m) => m.label.toLowerCase() === "serving" && m.weight > 0
  );
  if (serving) {
    return {
      servingSize: Math.round(serving.weight),
      servingUnit: "g",
      servingDescription: `1 serving (${Math.round(serving.weight)}g)`,
    };
  }

  // Prefer "Whole" for whole fruits/items
  const whole = measures.find(
    (m) => m.label.toLowerCase() === "whole" && m.weight > 0
  );
  if (whole) {
    return {
      servingSize: Math.round(whole.weight),
      servingUnit: "g",
      servingDescription: `1 whole (${Math.round(whole.weight)}g)`,
    };
  }

  // Use first measure with valid weight
  const first = measures.find((m) => m.weight > 0);
  if (first) {
    return {
      servingSize: Math.round(first.weight),
      servingUnit: "g",
      servingDescription: `1 ${first.label.toLowerCase()} (${Math.round(first.weight)}g)`,
    };
  }

  return { servingSize: 100, servingUnit: "g", servingDescription: "100g" };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Search Edamam Food Database for foods matching a natural language query.
 *
 * Uses the /parser endpoint which:
 *   - NLP-parses the query into structured ingredients
 *   - Returns both parsed matches AND hint matches
 *   - Nutrients are per 100g — scaled to best serving size
 *
 * @param query      Food description (e.g., "grilled chicken with rice")
 * @param maxResults Maximum results to return (default: 5)
 * @returns          Ranked FoodMatch array with source: "edamam"
 */
export async function searchEdamam(
  query: string,
  maxResults = 5
): Promise<FoodMatch[]> {
  if (!isEdamamConfigured()) return [];

  const appId = getAppId();
  const appKey = getAppKey();

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    ingr: query,
    "nutrition-type": "cooking",
  });

  const url = `${BASE_URL}/parser?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`Edamam API error: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as EdamamParserResponse;

    const matches: FoodMatch[] = [];

    // 1) NLP-parsed results — highest quality, Edamam understood the query
    if (data.parsed && data.parsed.length > 0) {
      for (const parsed of data.parsed) {
        const per100g = buildNutrientProfile(parsed.food.nutrients);
        const servingWeight = parsed.measure?.weight ?? 100;
        const nutrients = scaleNutrients(per100g, servingWeight);

        matches.push({
          source: "edamam",
          sourceId: parsed.food.foodId,
          name: parsed.food.label,
          brand: parsed.food.brand ?? undefined,
          nutrients,
          servingSize: Math.round(servingWeight),
          servingUnit: "g",
          servingDescription: parsed.measure
            ? `1 ${parsed.measure.label.toLowerCase()} (${Math.round(servingWeight)}g)`
            : `${Math.round(servingWeight)}g`,
          matchScore: scoreMatch(parsed.food, query, true),
        });
      }
    }

    // 2) Hint results — broader matches from the food database
    if (data.hints && data.hints.length > 0) {
      for (const hint of data.hints) {
        // Skip if we already have this food from parsed results
        if (matches.some((m) => m.sourceId === hint.food.foodId)) continue;

        const per100g = buildNutrientProfile(hint.food.nutrients);
        const measure = pickBestMeasure(hint.measures);
        const nutrients = scaleNutrients(per100g, measure.servingSize);

        matches.push({
          source: "edamam",
          sourceId: hint.food.foodId,
          name: hint.food.label,
          brand: hint.food.brand ?? undefined,
          nutrients,
          servingSize: measure.servingSize,
          servingUnit: measure.servingUnit,
          servingDescription: measure.servingDescription,
          matchScore: scoreMatch(hint.food, query, false),
        });
      }
    }

    return matches
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxResults);
  } catch (err) {
    console.warn("Edamam search failed:", err);
    return [];
  }
}
