/**
 * Estimation Types
 *
 * Defines the output of the portion estimation layer.
 * This is where parsed quantity/unit + database serving size → actual
 * calorie/macro values. Deterministic, not model-led.
 *
 * "AI extracts structure. Databases provide facts. Rules estimate portions."
 */

import type { NutrientProfile } from "../matching/matching.types";
import type { MealTime } from "../mealtime";
import type {
    ConfidenceInsight,
    InputSource,
    ItemConfidence,
    ParsedFoodItem,
} from "../parsing/food-candidate.schema";

// ─── Estimated Food Item ─────────────────────────────────────────────────────

/**
 * A single food item with its final estimated nutrients.
 * This is the "ready for confirmation" shape.
 */
export interface EstimatedFoodItem {
  /** The parsed candidate from input */
  parsed: ParsedFoodItem;

  /** The matched food name from the database */
  matchedName: string;

  /** Which database provided the nutrient data */
  matchSource:
    | "usda"
    | "openfoodfacts"
    | "edamam"
    | "dataset"
    | "local-fallback"
    | "recipe-template"
    | "personal-history"
    | "branded";

  /** Source record ID (USDA FDC ID, OFF barcode, or "local") */
  matchId: string;

  /** How many standard servings the user's quantity maps to */
  estimatedServings: number;

  /** Final estimated nutrients (servings × per-serving nutrients) */
  nutrients: NutrientProfile;

  /** Overall confidence for this item (0.0 – 1.0) — kept for backward compat */
  confidence: number;

  /** Multi-layer confidence breakdown */
  confidenceLayers?: ItemConfidence;

  /** Human-readable confidence insight for UI */
  insight?: ConfidenceInsight;

  /** Whether the user should double-check this item */
  needsUserConfirmation: boolean;

  /** Reason for low confidence, shown in UI: "bowl size varies" */
  ambiguityReason?: string;

  /** Assumption label for UI: "Assuming black coffee" */
  assumptionLabel?: string;

  /** Emoji representing this food item */
  emoji?: string;
}

// ─── Meal Estimate ───────────────────────────────────────────────────────────

/**
 * The complete estimated meal, ready for the confirmation screen.
 * Contains individual items + rolled-up totals.
 */
export interface MealEstimate {
  /** Individual food items with nutrients */
  items: EstimatedFoodItem[];

  /** Summed nutrients across all items */
  totals: NutrientProfile;

  /** Overall meal confidence (lowest item confidence) */
  overallConfidence: number;

  /** Original raw input text */
  rawInput: string;

  /** How the input was captured */
  source: InputSource;

  /** Which parser was used */
  parseMethod: string;

  /** Time-of-day context applied during estimation */
  mealTime?: MealTime;
}

// ─── Saved Food Item (persisted in MealEntry) ────────────────────────────────

/**
 * Slimmed-down version of EstimatedFoodItem for persistence.
 * Stored inside each MealEntry for auditability and future corrections.
 */
export interface SavedFoodItem {
  /** Food name */
  name: string;

  /** User-specified quantity */
  quantity: number;

  /** Unit of measurement */
  unit: string;

  /** Final calories */
  calories: number;

  /** Final protein (g) */
  protein: number;

  /** Final carbs (g) */
  carbs: number;

  /** Final fat (g) */
  fat: number;

  /** Database that provided nutrients */
  matchSource: string;

  /** Source record ID for traceability */
  matchId?: string;

  /** Confidence score */
  confidence: number;

  /** Emoji representing this food item */
  emoji?: string;
}
