/**
 * Matching Types
 *
 * Defines the data contracts for the nutrition database lookup layer.
 * After the parser produces `ParsedFoodItem[]`, the matcher resolves each
 * item against USDA FoodData Central and Open Food Facts to get real
 * nutrient data — never LLM-hallucinated calories.
 */

// ─── Nutrient Profile ────────────────────────────────────────────────────────

/**
 * Standardized nutrient values, always per serving.
 * This is the single source of truth for macro/calorie data throughout the app.
 */
// ─── Matched Food Item ───────────────────────────────────────────────────────

import type { ParsedFoodItem } from "../parsing/food-candidate.schema";

export interface NutrientProfile {
  /** Energy in kilocalories */
  calories: number;
  /** Protein in grams */
  protein: number;
  /** Total carbohydrates in grams */
  carbs: number;
  /** Total fat in grams */
  fat: number;
  /** Dietary fiber in grams (optional — not all sources provide this) */
  fiber?: number;
  /** Total sugars in grams */
  sugar?: number;
  /** Sodium in milligrams */
  sodium?: number;
}

// ─── Match Source ────────────────────────────────────────────────────────────

/** Which database the match came from */
export type MatchSource =
  | "usda"
  | "openfoodfacts"
  | "edamam"
  | "dataset"
  | "local-fallback"
  | "recipe-template"
  | "personal-history"
  | "branded";

// ─── Food Match ──────────────────────────────────────────────────────────────

/**
 * A single match from a nutrition database.
 * Multiple matches may be returned per parsed item; they are ranked by
 * `matchScore` and the best is selected (or user picks).
 */
export interface FoodMatch {
  /** Database that produced this match */
  source: MatchSource;

  /** Source record identifier (USDA FDC ID or Open Food Facts barcode) */
  sourceId: string;

  /** Canonical food name from the database */
  name: string;

  /** Brand name for packaged/branded products (Open Food Facts) */
  brand?: string;

  /** Nutrient values per standard serving */
  nutrients: NutrientProfile;

  /** Standard serving size in grams (or ml for liquids) */
  servingSize: number;

  /** Unit for the serving size: "g" or "ml" */
  servingUnit: string;

  /** Human-readable serving description: "1 large egg (50g)" */
  servingDescription: string;

  /** Relevance score for this match (0.0 – 1.0) */
  matchScore: number;
}

/**
 * A parsed food item paired with its database lookup results.
 */
export interface MatchedFoodItem {
  /** The parsed candidate from the parser */
  parsed: ParsedFoodItem;

  /** Ranked matches from nutrition databases (best first) */
  matches: FoodMatch[];

  /** The selected best match — null if no good match found */
  selectedMatch: FoodMatch | null;

  /** Combined parser + match confidence (0.0 – 1.0) */
  matchConfidence: number;

  /** Assumption label from ontology routing (e.g., "Assuming black coffee") */
  assumptionLabel?: string;

  /** Grouping confidence from phrase grouper (1.0 = no ambiguity) */
  groupingConfidence?: number;
}
