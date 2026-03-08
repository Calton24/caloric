/**
 * Portion Estimator Service
 *
 * Deterministic portion + macro calculator.
 * Takes matched food items (parsed candidate + DB match) and computes
 * final calorie/macro values based on quantity, unit, and serving size.
 *
 * This layer is mostly deterministic, not model-led.
 *
 * "2 eggs" is easy.
 * "bowl of pasta" is ambiguous.
 * "chicken curry and rice" is messy.
 * "homemade smoothie" is chaos in a cup.
 *
 * For ambiguous portions, we estimate conservatively and flag
 * `needsUserConfirmation: true` so the UI communicates uncertainty.
 */

import type {
    MatchedFoodItem,
    NutrientProfile,
} from "../matching/matching.types";
import { getFoodEmoji } from "../ontology/food-emoji";
import { lookupOntology } from "../ontology/food-ontology";
import type {
    FoodUnit,
    InputSource,
    ParseMethod,
} from "../parsing/food-candidate.schema";
import {
    CONFIDENCE_NEEDS_REVIEW,
    buildConfidenceInsight,
    buildItemConfidence,
    computeOverallConfidence,
    getAmbiguityReason,
    scorePortionConfidence,
} from "./confidence.service";
import type { EstimatedFoodItem, MealEstimate } from "./estimation.types";

// ─── Unit → Serving Multiplier Heuristics ────────────────────────────────────

/**
 * Default serving size multipliers when we know the unit but the DB
 * serving size is per 100g. These are conservative estimates.
 */
const UNIT_GRAMS: Record<FoodUnit, number> = {
  piece: 100,
  serving: 150,
  cup: 240,
  tablespoon: 15,
  teaspoon: 5,
  oz: 28,
  g: 1,
  ml: 1,
  slice: 30,
  bowl: 350,
  plate: 400,
  handful: 30,
  scoop: 40,
  bar: 50,
  can: 355,
  bottle: 500,
  glass: 240,
};

/**
 * Food-specific piece weights (grams per piece).
 * Used when unit is "piece" to get better estimates than the generic 100g.
 */
const PIECE_WEIGHTS: Record<string, number> = {
  egg: 50,
  eggs: 50,
  banana: 120,
  apple: 180,
  orange: 130,
  croissant: 60,
  bagel: 100,
  donut: 60,
  doughnut: 60,
  cookie: 25,
  waffle: 75,
  pancake: 60,
  toast: 30,
  bread: 30,
  taco: 100,
  sausage: 75,
  "protein bar": 60,
};

// ─── Core Estimation Logic ───────────────────────────────────────────────────

/**
 * Estimate how many standard servings the user's quantity/unit maps to.
 *
 * @param quantity  User's quantity (e.g., 2)
 * @param unit      User's unit (e.g., "piece")
 * @param foodName  Food name for piece-weight lookup
 * @param dbServingSize  Database serving size in grams/ml
 * @param dbServingUnit  Unit for the DB serving ("g" or "ml")
 */
function estimateServings(
  quantity: number,
  unit: FoodUnit,
  foodName: string,
  dbServingSize: number,
  dbServingUnit: string = "g"
): number {
  // If the user specified grams/ml directly, just divide
  if (unit === "g" || unit === "ml") {
    return quantity / Math.max(dbServingSize, 1);
  }

  // If the user specified oz, convert to grams first
  if (unit === "oz") {
    return (quantity * 28.35) / Math.max(dbServingSize, 1);
  }

  // For beverages (serving unit is ml), "serving" / "cup" / "glass" =
  // the user means 1 standard drink, so servings = quantity directly
  if (
    dbServingUnit === "ml" &&
    (unit === "serving" ||
      unit === "cup" ||
      unit === "glass" ||
      unit === "can" ||
      unit === "bottle")
  ) {
    return quantity;
  }

  // For "piece", check food-specific weights
  if (unit === "piece") {
    const pieceWeight =
      PIECE_WEIGHTS[foodName.toLowerCase()] ??
      PIECE_WEIGHTS[foodName.toLowerCase().replace(/s$/, "")] ??
      UNIT_GRAMS.piece;

    return (quantity * pieceWeight) / Math.max(dbServingSize, 1);
  }

  // For other units, use the heuristic gram weights
  const unitGrams = UNIT_GRAMS[unit] ?? UNIT_GRAMS.serving;
  return (quantity * unitGrams) / Math.max(dbServingSize, 1);
}

/**
 * Scale a nutrient profile by a serving multiplier.
 */
function scaleNutrients(
  nutrients: NutrientProfile,
  servings: number
): NutrientProfile {
  return {
    calories: Math.round(nutrients.calories * servings),
    protein: Math.round(nutrients.protein * servings * 10) / 10,
    carbs: Math.round(nutrients.carbs * servings * 10) / 10,
    fat: Math.round(nutrients.fat * servings * 10) / 10,
    fiber:
      nutrients.fiber !== undefined
        ? Math.round(nutrients.fiber * servings * 10) / 10
        : undefined,
    sugar:
      nutrients.sugar !== undefined
        ? Math.round(nutrients.sugar * servings * 10) / 10
        : undefined,
    sodium:
      nutrients.sodium !== undefined
        ? Math.round(nutrients.sodium * servings)
        : undefined,
  };
}

/**
 * Sum nutrient profiles across multiple items.
 */
function sumNutrients(items: NutrientProfile[]): NutrientProfile {
  return items.reduce(
    (acc, n) => ({
      calories: acc.calories + n.calories,
      protein: Math.round((acc.protein + n.protein) * 10) / 10,
      carbs: Math.round((acc.carbs + n.carbs) * 10) / 10,
      fat: Math.round((acc.fat + n.fat) * 10) / 10,
      fiber:
        n.fiber !== undefined
          ? Math.round(((acc.fiber ?? 0) + n.fiber) * 10) / 10
          : acc.fiber,
      sugar:
        n.sugar !== undefined
          ? Math.round(((acc.sugar ?? 0) + n.sugar) * 10) / 10
          : acc.sugar,
      sodium:
        n.sodium !== undefined ? (acc.sodium ?? 0) + n.sodium : acc.sodium,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 } as NutrientProfile
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Estimate nutrients for a single matched food item.
 */
export function estimateFoodItem(
  matched: MatchedFoodItem,
  asrConfidence: number = 0.95
): EstimatedFoodItem {
  const { parsed, selectedMatch, matchConfidence } = matched;
  const groupingConfidence = matched.groupingConfidence ?? 1.0;
  const isMerged = groupingConfidence < 1.0;

  // No match found — use generic fallback
  if (!selectedMatch) {
    const layers = buildItemConfidence({
      asr: asrConfidence,
      parse: parsed.confidence,
      grouping: groupingConfidence,
      match: 0.1,
      portion: 0.3,
    });
    const insight = buildConfidenceInsight(
      parsed.name,
      layers,
      "local-fallback",
      isMerged
    );
    return {
      parsed,
      matchedName: parsed.name,
      matchSource: "local-fallback",
      matchId: "unknown",
      estimatedServings: parsed.quantity,
      nutrients: {
        calories: 250,
        protein: 12,
        carbs: 30,
        fat: 10,
      },
      confidence: layers.overall,
      confidenceLayers: layers,
      insight,
      needsUserConfirmation: true,
      ambiguityReason: "No database match — using generic estimate",
    };
  }

  const servings = estimateServings(
    parsed.quantity,
    parsed.unit,
    parsed.name,
    selectedMatch.servingSize,
    selectedMatch.servingUnit
  );

  const nutrients = scaleNutrients(selectedMatch.nutrients, servings);

  // Compute layered confidence
  const portionScore = scorePortionConfidence(parsed.unit, parsed.quantity);
  const overallConfidence = computeOverallConfidence(
    parsed.confidence,
    matchConfidence,
    portionScore
  );

  const layers = buildItemConfidence({
    asr: asrConfidence,
    parse: parsed.confidence,
    grouping: groupingConfidence,
    match: matchConfidence,
    portion: portionScore,
  });

  const insight = buildConfidenceInsight(
    parsed.name,
    layers,
    selectedMatch.source,
    isMerged
  );

  const needsUserConfirmation = overallConfidence < CONFIDENCE_NEEDS_REVIEW;
  const ambiguityReason = getAmbiguityReason(
    parsed.unit,
    selectedMatch.source,
    overallConfidence
  );

  const ontologyEntry = lookupOntology(parsed.name);

  return {
    parsed,
    matchedName: selectedMatch.name,
    matchSource: selectedMatch.source,
    matchId: selectedMatch.sourceId,
    estimatedServings: Math.round(servings * 100) / 100,
    nutrients,
    confidence: overallConfidence,
    confidenceLayers: layers,
    insight,
    needsUserConfirmation,
    ambiguityReason,
    assumptionLabel: matched.assumptionLabel,
    emoji: getFoodEmoji(parsed.name, ontologyEntry?.category ?? null),
  };
}

/**
 * Estimate a full meal from matched food items.
 *
 * @param matchedItems  Array of matched food items from the matcher
 * @param rawInput      Original user input text
 * @param source        Input source (voice/text/image)
 * @param parseMethod   Which parser was used
 * @param asrConfidence ASR confidence from transcript cleaner (default 0.95)
 */
export function estimateMeal(
  matchedItems: MatchedFoodItem[],
  rawInput: string,
  source: InputSource,
  parseMethod: ParseMethod,
  asrConfidence: number = 0.95
): MealEstimate {
  const items = matchedItems.map((m) => estimateFoodItem(m, asrConfidence));

  const totals = sumNutrients(items.map((i) => i.nutrients));

  // Overall confidence = minimum item confidence
  // (one bad item makes the whole meal uncertain)
  const overallConfidence =
    items.length > 0 ? Math.min(...items.map((i) => i.confidence)) : 0;

  return {
    items,
    totals,
    overallConfidence,
    rawInput,
    source,
    parseMethod,
  };
}
