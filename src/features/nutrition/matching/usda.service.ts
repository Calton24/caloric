/**
 * USDA FoodData Central Service
 *
 * Client for the USDA FoodData Central API — the gold standard for
 * generic food nutrient data. Public domain / CC0.
 *
 * API docs: https://fdc.nal.usda.gov/api-guide.html
 * Base URL: https://api.nal.usda.gov/fdc/v1
 *
 * Uses DEMO_KEY by default (rate-limited: 30 req/hr, 50 req/day).
 * Set EXPO_PUBLIC_USDA_API_KEY for production use (free to register).
 */

import type { FoodMatch, NutrientProfile } from "./matching.types";

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = "https://api.nal.usda.gov/fdc/v1";

function getApiKey(): string {
  try {
    // Expo public env vars are inlined at build time
    const key =
      (typeof process !== "undefined" &&
        process.env?.EXPO_PUBLIC_USDA_API_KEY) ||
      "";
    return key || "DEMO_KEY";
  } catch {
    return "DEMO_KEY";
  }
}

// ─── USDA API Response Types ─────────────────────────────────────────────────

interface UsdaFoodNutrient {
  nutrientId: number;
  nutrientName: string;
  value: number;
  unitName: string;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  foodNutrients: UsdaFoodNutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
  foodCategory?: string;
}

interface UsdaSearchResponse {
  foods: UsdaFood[];
  totalHits: number;
}

// ─── USDA Nutrient IDs ───────────────────────────────────────────────────────

const NUTRIENT_IDS = {
  ENERGY: 1008, // kcal
  PROTEIN: 1003, // g
  CARBS: 1005, // g (carbohydrate by difference)
  FAT: 1004, // g (total lipid)
  FIBER: 1079, // g (dietary fiber)
  SUGAR: 1063, // g (total sugars)
  SODIUM: 1093, // mg
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractNutrient(nutrients: UsdaFoodNutrient[], id: number): number {
  return nutrients.find((n) => n.nutrientId === id)?.value ?? 0;
}

function buildNutrientProfile(nutrients: UsdaFoodNutrient[]): NutrientProfile {
  return {
    calories: Math.round(extractNutrient(nutrients, NUTRIENT_IDS.ENERGY)),
    protein:
      Math.round(extractNutrient(nutrients, NUTRIENT_IDS.PROTEIN) * 10) / 10,
    carbs: Math.round(extractNutrient(nutrients, NUTRIENT_IDS.CARBS) * 10) / 10,
    fat: Math.round(extractNutrient(nutrients, NUTRIENT_IDS.FAT) * 10) / 10,
    fiber: Math.round(extractNutrient(nutrients, NUTRIENT_IDS.FIBER) * 10) / 10,
    sugar: Math.round(extractNutrient(nutrients, NUTRIENT_IDS.SUGAR) * 10) / 10,
    sodium: Math.round(extractNutrient(nutrients, NUTRIENT_IDS.SODIUM)),
  };
}

/**
 * Score how well a USDA result matches the query.
 * Prefers SR Legacy / Foundation data over branded/survey.
 */
function scoreMatch(food: UsdaFood, query: string): number {
  const desc = food.description.toLowerCase();
  const q = query.toLowerCase();

  let score = 0;

  // Exact match
  if (desc === q) {
    score += 0.5;
  } else if (desc.startsWith(q)) {
    score += 0.35;
  } else if (desc.includes(q)) {
    score += 0.2;
  }

  // Data type preference: SR Legacy and Foundation are higher quality
  const typeBonus: Record<string, number> = {
    "SR Legacy": 0.3,
    Foundation: 0.25,
    "Survey (FNDDS)": 0.2,
    Branded: 0.1,
  };
  score += typeBonus[food.dataType] ?? 0.05;

  // Shorter descriptions tend to be more generic/useful
  if (desc.split(",").length <= 3) score += 0.1;

  return Math.min(score, 1.0);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Search USDA FoodData Central for foods matching a query.
 *
 * @param query     Food name to search for (e.g., "chicken breast")
 * @param maxResults Maximum results to return (default: 5)
 * @returns           Ranked FoodMatch array
 */
export async function searchUsda(
  query: string,
  maxResults = 5
): Promise<FoodMatch[]> {
  const apiKey = getApiKey();

  const url = `${BASE_URL}/foods/search?api_key=${encodeURIComponent(apiKey)}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        pageSize: Math.min(maxResults * 2, 25),
        dataType: ["SR Legacy", "Foundation", "Survey (FNDDS)", "Branded"],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!response.ok) {
      console.warn(`USDA API error: ${response.status}`);
      return [];
    }

    const data = (await response.json()) as UsdaSearchResponse;

    if (!data.foods || data.foods.length === 0) return [];

    const matches: FoodMatch[] = data.foods
      .map((food): FoodMatch => {
        const nutrientsPer100g = buildNutrientProfile(food.foodNutrients);
        const servingSize = food.servingSize ?? 100;
        const servingUnit = (food.servingSizeUnit ?? "g").toLowerCase();

        // USDA returns nutrients per 100g — scale to per-serving
        // to be consistent with Open Food Facts
        const scale = servingSize / 100;
        const nutrients: NutrientProfile = {
          calories: Math.round(nutrientsPer100g.calories * scale),
          protein: Math.round(nutrientsPer100g.protein * scale * 10) / 10,
          carbs: Math.round(nutrientsPer100g.carbs * scale * 10) / 10,
          fat: Math.round(nutrientsPer100g.fat * scale * 10) / 10,
          fiber:
            nutrientsPer100g.fiber !== undefined
              ? Math.round(nutrientsPer100g.fiber * scale * 10) / 10
              : undefined,
          sugar:
            nutrientsPer100g.sugar !== undefined
              ? Math.round(nutrientsPer100g.sugar * scale * 10) / 10
              : undefined,
          sodium:
            nutrientsPer100g.sodium !== undefined
              ? Math.round(nutrientsPer100g.sodium * scale)
              : undefined,
        };

        return {
          source: "usda",
          sourceId: String(food.fdcId),
          name: food.description,
          brand: food.brandOwner ?? undefined,
          nutrients,
          servingSize,
          servingUnit,
          servingDescription: `${servingSize}${servingUnit}`,
          matchScore: scoreMatch(food, query),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxResults);

    return matches;
  } catch (err) {
    console.warn("USDA search failed:", err);
    return [];
  }
}
