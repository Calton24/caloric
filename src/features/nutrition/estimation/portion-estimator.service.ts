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
import { type MealTime, MEALTIME_PORTION_SCALE } from "../mealtime";
import { getMealtimeCalories } from "../memory/food-memory.service";
import { getPortionAdjustment } from "../memory/portion-learning.service";
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
  // Individual items
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
  // Meal-type foods (1 piece = 1 standard item)
  burger: 200,
  hamburger: 200,
  sandwich: 200,
  wrap: 120,
  burrito: 300,
  kebab: 300,
  "doner kebab": 300,
  "döner kebab": 300,
  shawarma: 300,
  gyros: 300,
  pizza: 300,
  quesadilla: 200,
  calzone: 300,
  "hot dog": 150,
  hotdog: 150,
  sub: 250,
  panini: 200,
  "spring roll": 60,
  "spring rolls": 60,
  "egg roll": 80,
  samosa: 80,
  empanada: 120,
  falafel: 30,
  muffin: 115,
  cupcake: 60,
  brownie: 60,
  scone: 70,
  biscuit: 45,
  pretzel: 115,
  naan: 90,
  pita: 60,
  roll: 50,
  pie: 250,
  pasty: 250,
  "sausage roll": 120,
};

/**
 * Size-variant piece weights for foods where "small/medium/large" has
 * a well-defined weight difference. Used when sizeQualifier is present.
 * Values sourced from USDA standard reference data.
 */
const SIZED_PIECE_WEIGHTS: Record<
  string,
  { small: number; medium: number; large: number }
> = {
  egg: { small: 38, medium: 50, large: 56 },
  eggs: { small: 38, medium: 50, large: 56 },
  banana: { small: 81, medium: 118, large: 136 },
  bananas: { small: 81, medium: 118, large: 136 },
  apple: { small: 150, medium: 182, large: 220 },
  apples: { small: 150, medium: 182, large: 220 },
  orange: { small: 100, medium: 131, large: 184 },
  oranges: { small: 100, medium: 131, large: 184 },
  potato: { small: 130, medium: 170, large: 280 },
  potatoes: { small: 130, medium: 170, large: 280 },
  tomato: { small: 75, medium: 123, large: 182 },
  tomatoes: { small: 75, medium: 123, large: 182 },
  avocado: { small: 100, medium: 150, large: 200 },
  avocados: { small: 100, medium: 150, large: 200 },
  peach: { small: 100, medium: 150, large: 200 },
  peaches: { small: 100, medium: 150, large: 200 },
  pear: { small: 140, medium: 178, large: 230 },
  pears: { small: 140, medium: 178, large: 230 },
  mango: { small: 150, medium: 200, large: 280 },
  mangoes: { small: 150, medium: 200, large: 280 },
  onion: { small: 70, medium: 110, large: 150 },
  onions: { small: 70, medium: 110, large: 150 },
  pepper: { small: 75, medium: 120, large: 165 },
  peppers: { small: 75, medium: 120, large: 165 },
  carrot: { small: 50, medium: 72, large: 95 },
  carrots: { small: 50, medium: 72, large: 95 },
  croissant: { small: 40, medium: 60, large: 85 },
  croissants: { small: 40, medium: 60, large: 85 },
  pancake: { small: 38, medium: 76, large: 115 },
  pancakes: { small: 38, medium: 76, large: 115 },
  waffle: { small: 35, medium: 75, large: 120 },
  waffles: { small: 35, medium: 75, large: 120 },
  sausage: { small: 40, medium: 65, large: 100 },
  sausages: { small: 40, medium: 65, large: 100 },
  cookie: { small: 15, medium: 30, large: 50 },
  cookies: { small: 15, medium: 30, large: 50 },
  taco: { small: 80, medium: 170, large: 250 },
  tacos: { small: 80, medium: 170, large: 250 },
  donut: { small: 35, medium: 55, large: 80 },
  donuts: { small: 35, medium: 55, large: 80 },
  doughnut: { small: 35, medium: 55, large: 80 },
  doughnuts: { small: 35, medium: 55, large: 80 },
  strawberry: { small: 7, medium: 12, large: 18 },
  strawberries: { small: 7, medium: 12, large: 18 },
  shrimp: { small: 8, medium: 15, large: 25 },
  prawns: { small: 8, medium: 15, large: 25 },
  meatball: { small: 30, medium: 45, large: 65 },
  meatballs: { small: 30, medium: 45, large: 65 },
  dumpling: { small: 15, medium: 25, large: 40 },
  dumplings: { small: 15, medium: 25, large: 40 },
  tortilla: { small: 25, medium: 45, large: 65 },
  tortillas: { small: 25, medium: 45, large: 65 },
  bun: { small: 35, medium: 50, large: 75 },
  buns: { small: 35, medium: 50, large: 75 },
  kiwi: { small: 50, medium: 75, large: 100 },
  kiwis: { small: 50, medium: 75, large: 100 },
  plum: { small: 45, medium: 66, large: 90 },
  plums: { small: 45, medium: 66, large: 90 },
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
 * @param sizeQualifier  Optional size: "small", "medium", "large"
 */
function estimateServings(
  quantity: number,
  unit: FoodUnit,
  foodName: string,
  dbServingSize: number,
  dbServingUnit: string = "g",
  sizeQualifier?: "small" | "medium" | "large"
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

  // For "serving", treat as a direct multiplier of the DB-defined serving.
  // The DB serving IS the canonical serving — "1 serving" = 1× DB serving.
  // This avoids the old bug where a 150g heuristic systematically
  // over-estimated small-serving foods (almonds: 5.4×) and
  // under-estimated large-serving foods (kebab: 0.5×).
  if (unit === "serving") {
    return quantity;
  }

  // For "piece", check food-specific weights (with size variant support)
  if (unit === "piece") {
    const nameLower = foodName.toLowerCase();
    const nameKey = nameLower.replace(/s$/, "");

    // Check for size-specific weight first
    if (sizeQualifier) {
      const sizedWeight =
        SIZED_PIECE_WEIGHTS[nameLower]?.[sizeQualifier] ??
        SIZED_PIECE_WEIGHTS[nameKey]?.[sizeQualifier];
      if (sizedWeight) {
        return (quantity * sizedWeight) / Math.max(dbServingSize, 1);
      }
    }

    const pieceWeight =
      PIECE_WEIGHTS[nameLower] ?? PIECE_WEIGHTS[nameKey] ?? UNIT_GRAMS.piece;

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
  asrConfidence: number = 0.95,
  mealTime?: MealTime
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
    selectedMatch.servingUnit,
    parsed.sizeQualifier
  );

  // Apply mealtime portion scaling for ambiguous units.
  // Precise units (g, ml, oz, piece) are left unchanged —
  // user specified an exact amount. Ambiguous units (bowl, plate,
  // serving, handful) are scaled by time-of-day heuristics.
  const AMBIGUOUS_UNITS: Set<FoodUnit> = new Set([
    "bowl",
    "plate",
    "serving",
    "handful",
    "cup",
    "glass",
  ]);
  let adjustedServings = servings;
  if (mealTime && AMBIGUOUS_UNITS.has(parsed.unit)) {
    // Check personal mealtime history first
    const personalMT = getMealtimeCalories(parsed.name, mealTime);
    if (personalMT && personalMT.count >= 2) {
      // Scale servings to hit the user's personal mealtime average
      const baseCalPerServing = selectedMatch.nutrients.calories || 1;
      adjustedServings = personalMT.avgCalories / baseCalPerServing;
    } else {
      // No personal data — use generic mealtime scaling
      adjustedServings = servings * MEALTIME_PORTION_SCALE[mealTime];
    }
  }

  let nutrients = scaleNutrients(selectedMatch.nutrients, adjustedServings);

  // Apply learned portion adjustment from user correction history.
  // This overrides the base estimate when the user has consistently
  // corrected this food's calories (≥3 corrections).
  const portionAdj = getPortionAdjustment(parsed.name);
  if (portionAdj != null) {
    nutrients = scaleNutrients(nutrients, portionAdj);
  }

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
    estimatedServings: Math.round(adjustedServings * 100) / 100,
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
 * @param mealTime      Time-of-day context for portion scaling
 */
export function estimateMeal(
  matchedItems: MatchedFoodItem[],
  rawInput: string,
  source: InputSource,
  parseMethod: ParseMethod,
  asrConfidence: number = 0.95,
  mealTime?: MealTime
): MealEstimate {
  const items = matchedItems.map((m) =>
    estimateFoodItem(m, asrConfidence, mealTime)
  );

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
    mealTime,
  };
}
