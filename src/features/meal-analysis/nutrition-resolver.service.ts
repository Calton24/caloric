/**
 * Nutrition Resolution Service
 *
 * Takes gpt-4o-mini's food decomposition output and resolves each
 * detected component against real nutrition databases.
 *
 * Architecture:
 *   Model says "spaghetti, 200g" →
 *   normalizeFood("spaghetti") → canonical label →
 *   applyPortionGuardrails() → corrected grams →
 *   matchFoodItemLocally() → nutrition per serving →
 *   scale to corrected grams →
 *   return ResolvedFoodItem
 *
 * The model is NEVER the source of truth for calories.
 * It provides labels + estimated grams. We provide the nutrition facts.
 */

import { matchFoodItemLocally } from "../nutrition/matching/food-matcher.service";
import type { NutrientProfile } from "../nutrition/matching/matching.types";
import type { ParsedFoodItem } from "../nutrition/parsing/food-candidate.schema";
import { normalizeFood } from "./food-normalizer.service";
import type {
    ConfidenceBand,
    DetectedFoodComponent,
    MealAnalysisResult,
    MealDecomposition,
    ResolvedFoodItem,
} from "./meal-analysis.types";
import { applyPortionGuardrails } from "./portion-reference.service";

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Resolve a full meal decomposition from the vision model into
 * nutritionally-grounded items.
 */
export function resolveDecomposition(
  decomposition: MealDecomposition,
  imageUri: string,
  modelLatencyMs: number
): MealAnalysisResult {
  const resolveStart = Date.now();

  const items = decomposition.foods.map((food) => resolveFoodComponent(food));

  const totals = sumNutrients(items.map((i) => i.nutrients));
  const overallConfidence = computeOverallConfidence(items);
  const confidenceBand = toConfidenceBand(overallConfidence);

  return {
    sessionId: generateSessionId(),
    decomposition,
    items,
    totals,
    confidenceBand,
    overallConfidence,
    modelLatencyMs,
    totalLatencyMs: Date.now() - resolveStart + modelLatencyMs,
    imageUri,
    caveats: decomposition.caveats,
  };
}

// ─── Single Item Resolution ─────────────────────────────────────────────────

/**
 * Resolve one food component → nutrition data.
 *
 * Strategy:
 *   1. Build a ParsedFoodItem from the model's label + grams
 *   2. Use matchFoodItemLocally to find nutrition per serving
 *   3. Calculate per-100g nutrients
 *   4. Scale to the model's estimated grams
 *   5. Score confidence across detection/portion/nutrition dimensions
 */
function resolveFoodComponent(food: DetectedFoodComponent): ResolvedFoodItem {
  // ── Step 1: Normalize the food label ──
  const normalizedLabel = normalizeFood(food.label);

  // ── Step 2: Apply portion guardrails ──
  const guardrail = applyPortionGuardrails(
    normalizedLabel,
    food.portion.grams,
    food.portion.humanReadable
  );
  const effectiveGrams = guardrail.correctedGrams;

  // Build a parsed item for the existing matcher using the normalized label
  const parsed: ParsedFoodItem = {
    name: normalizedLabel,
    quantity: 1,
    unit: "serving",
    preparation: null,
    confidence: food.confidence,
    rawFragment: food.label,
  };

  const matched = matchFoodItemLocally(parsed);
  const match = matched.selectedMatch;

  let nutrients: NutrientProfile;
  let nutrientsPer100g: NutrientProfile;
  let nutritionSource: ResolvedFoodItem["nutritionSource"];
  let resolvedName: string;
  let nutritionMatchConfidence: number;

  if (match) {
    resolvedName = match.name;
    nutritionSource = mapSource(match.source);

    // Calculate per-100g from the match's per-serving data
    const servingGrams = match.servingSize || 100;
    nutrientsPer100g = scaleNutrients(match.nutrients, 100 / servingGrams);

    // Scale to the guardrail-corrected portion
    const portionScale = effectiveGrams / 100;
    nutrients = scaleNutrients(nutrientsPer100g, portionScale);

    nutritionMatchConfidence = match.matchScore;
  } else {
    // Fallback: no match found — use rough estimates
    resolvedName = food.label;
    nutritionSource = "fallback";
    nutrientsPer100g = FALLBACK_PER_100G;
    const portionScale = effectiveGrams / 100;
    nutrients = scaleNutrients(nutrientsPer100g, portionScale);
    nutritionMatchConfidence = 0.2;
  }

  // Round nutrients
  nutrients = roundNutrients(nutrients);
  nutrientsPer100g = roundNutrients(nutrientsPer100g);

  // Compute confidence layers
  const portionConfidence = Math.max(
    0.1,
    Math.min(
      1,
      estimatePortionConfidence(food) + guardrail.portionConfidenceAdjust
    )
  );
  const detectionConfidence = food.confidence;
  const overall =
    detectionConfidence * 0.4 +
    portionConfidence * 0.3 +
    nutritionMatchConfidence * 0.3;

  // Determine if review is needed
  const needsReview =
    overall < 0.6 ||
    food.isAmbiguous ||
    nutritionMatchConfidence < 0.5 ||
    portionConfidence < 0.4;

  let reviewReason: string | undefined;
  if (food.isAmbiguous) reviewReason = "Ambiguous food identification";
  else if (nutritionMatchConfidence < 0.5)
    reviewReason = "Weak nutrition match";
  else if (portionConfidence < 0.4) reviewReason = "Portion size uncertain";
  else if (overall < 0.6) reviewReason = "Low overall confidence";

  return {
    detected: {
      ...food,
      // Update portion with guardrail-corrected values
      portion: {
        ...food.portion,
        grams: effectiveGrams,
        humanReadable: guardrail.wasAdjusted
          ? guardrail.correctedHumanReadable
          : food.portion.humanReadable,
      },
    },
    resolvedName:
      resolvedName !== food.label.toLowerCase().trim()
        ? resolvedName
        : normalizedLabel !== food.label.toLowerCase().trim()
          ? normalizedLabel
          : resolvedName,
    nutritionSource,
    nutrients,
    nutrientsPer100g,
    confidence: {
      detection: Math.round(detectionConfidence * 100) / 100,
      portion: Math.round(portionConfidence * 100) / 100,
      nutritionMatch: Math.round(nutritionMatchConfidence * 100) / 100,
      overall: Math.round(overall * 100) / 100,
    },
    needsReview,
    reviewReason,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function scaleNutrients(
  base: NutrientProfile,
  factor: number
): NutrientProfile {
  return {
    calories: base.calories * factor,
    protein: base.protein * factor,
    carbs: base.carbs * factor,
    fat: base.fat * factor,
  };
}

function roundNutrients(n: NutrientProfile): NutrientProfile {
  return {
    calories: Math.round(n.calories),
    protein: Math.round(n.protein * 10) / 10,
    carbs: Math.round(n.carbs * 10) / 10,
    fat: Math.round(n.fat * 10) / 10,
  };
}

function sumNutrients(items: NutrientProfile[]): NutrientProfile {
  const sum = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  for (const n of items) {
    sum.calories += n.calories;
    sum.protein += n.protein;
    sum.carbs += n.carbs;
    sum.fat += n.fat;
  }
  return roundNutrients(sum);
}

function computeOverallConfidence(items: ResolvedFoodItem[]): number {
  if (items.length === 0) return 0;
  // Use the minimum item confidence — chain is only as strong as weakest link
  const min = Math.min(...items.map((i) => i.confidence.overall));
  // Weighted average gives a more useful signal than pure min
  const avg =
    items.reduce((s, i) => s + i.confidence.overall, 0) / items.length;
  return Math.round((min * 0.4 + avg * 0.6) * 100) / 100;
}

function toConfidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.7) return "high";
  if (confidence >= 0.45) return "medium";
  return "low";
}

function estimatePortionConfidence(food: DetectedFoodComponent): number {
  // Heuristics for portion estimate quality
  let conf = 0.5; // baseline
  // Discrete countable items are more estimable
  if (
    /\d+\s*(piece|meatball|nugget|slice|egg)/i.test(food.portion.humanReadable)
  ) {
    conf += 0.2;
  }
  // Model provided reasoning → more intentional estimate
  if (food.portion.reasoning.length > 20) {
    conf += 0.1;
  }
  // Very small or very large portions are more uncertain
  if (food.portion.grams < 10 || food.portion.grams > 500) {
    conf -= 0.15;
  }
  return Math.max(0.1, Math.min(1, conf));
}

function mapSource(source: string): ResolvedFoodItem["nutritionSource"] {
  switch (source) {
    case "usda":
      return "usda";
    case "openfoodfacts":
      return "openfoodfacts";
    case "local-fallback":
      return "local";
    default:
      return "local";
  }
}

function generateSessionId(): string {
  return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Conservative fallback nutrients when no DB match is found */
const FALLBACK_PER_100G: NutrientProfile = {
  calories: 150,
  protein: 5,
  carbs: 20,
  fat: 5,
};
