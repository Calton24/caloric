/**
 * Confidence Service
 *
 * Computes multi-layer confidence scores for the nutrition pipeline.
 * Instead of one opaque number, each layer reveals WHERE uncertainty lies:
 *
 *   ASR → Parse → Grouping → Match → Portion → Overall
 *
 * The UI shows human-readable labels ("Banana detected, portion uncertain")
 * instead of misleading percentages.
 */

import type {
    ConfidenceInsight,
    FoodUnit,
    ItemConfidence,
} from "../parsing/food-candidate.schema";

// ─── Confidence Thresholds ───────────────────────────────────────────────────

/** Below this, show a warning in the UI */
export const CONFIDENCE_LOW = 0.4;

/** Below this, require explicit user confirmation */
export const CONFIDENCE_NEEDS_REVIEW = 0.55;

/** Above this, auto-accept (but still editable) */
export const CONFIDENCE_HIGH = 0.75;

// ─── Individual Score Components ─────────────────────────────────────────────

/**
 * Score how confident we are in the parser's food extraction.
 * Higher for explicit quantities and known units.
 */
export function scoreParserConfidence(
  hasExplicitQuantity: boolean,
  hasExplicitUnit: boolean,
  wordCount: number
): number {
  let score = 0.5;

  if (hasExplicitQuantity) score += 0.2;
  if (hasExplicitUnit) score += 0.15;

  // Simple descriptions ("2 eggs") are easier to parse correctly
  if (wordCount <= 2) score += 0.1;
  else if (wordCount <= 4) score += 0.05;
  else score -= 0.1; // complex descriptions are risky

  return clamp(score);
}

/**
 * Score how confident we are in the database match.
 * Based on the match score from the DB search + data source quality.
 */
export function scoreMatchConfidence(
  matchScore: number,
  matchSource: string,
  hasServingInfo: boolean
): number {
  let score = matchScore;

  // Source quality bonus
  const sourceBonus: Record<string, number> = {
    usda: 0.15,
    openfoodfacts: 0.1,
    "local-fallback": -0.1,
  };
  score += sourceBonus[matchSource] ?? 0;

  // Serving info helps portion estimation
  if (hasServingInfo) score += 0.05;

  return clamp(score);
}

/**
 * Score how confident we are in the portion estimation.
 * Unambiguous units (piece, slice, g) score higher than
 * ambiguous ones (bowl, plate, serving).
 */
export function scorePortionConfidence(
  unit: FoodUnit,
  quantity: number
): number {
  // Precise units that map clearly to a standard serving
  const preciseUnits = new Set<FoodUnit>([
    "piece",
    "slice",
    "g",
    "oz",
    "ml",
    "can",
    "bottle",
    "bar",
    "scoop",
    "tablespoon",
    "teaspoon",
  ]);

  // Ambiguous units where size varies wildly
  const ambiguousUnits = new Set<FoodUnit>([
    "bowl",
    "plate",
    "serving",
    "cup",
    "glass",
    "handful",
  ]);

  let score = 0.6;

  if (preciseUnits.has(unit)) {
    score += 0.25;
  } else if (ambiguousUnits.has(unit)) {
    score -= 0.1;
  }

  // Integer quantities are more reliable
  if (Number.isInteger(quantity) && quantity > 0 && quantity <= 10) {
    score += 0.1;
  }

  return clamp(score);
}

// ─── Combined Confidence ─────────────────────────────────────────────────────

/**
 * Compute the overall confidence for a food item.
 * Uses geometric mean so one low score pulls the whole thing down
 * (a confident parse + bad match ≠ a good result).
 */
export function computeOverallConfidence(
  parserConfidence: number,
  matchConfidence: number,
  portionConfidence: number
): number {
  const geometric = Math.pow(
    parserConfidence * matchConfidence * portionConfidence,
    1 / 3
  );
  return Math.round(geometric * 100) / 100;
}

/**
 * Determine the human-readable reason for low confidence.
 */
export function getAmbiguityReason(
  unit: FoodUnit,
  matchSource: string,
  overallConfidence: number
): string | undefined {
  if (overallConfidence >= CONFIDENCE_NEEDS_REVIEW) return undefined;

  if (unit === "bowl") return "Bowl sizes vary — check the portion";
  if (unit === "plate") return "Plate portions vary — check the amount";
  if (unit === "serving") return "Serving size estimated — verify portion";
  if (unit === "handful") return "Handful sizes vary";
  if (matchSource === "local-fallback")
    return "Using estimated values — no database match found";
  if (overallConfidence < CONFIDENCE_LOW)
    return "Low confidence — please review all values";

  return "Portion estimated — please verify";
}

// ─── Multi-layer Confidence ─────────────────────────────────────────────────

/**
 * Build a full multi-layer confidence object from individual scores.
 * Overall = geometric mean of all layers.
 */
export function buildItemConfidence(layers: {
  asr: number;
  parse: number;
  grouping: number;
  match: number;
  portion: number;
}): ItemConfidence {
  const { asr, parse, grouping, match, portion } = layers;
  const vals = [asr, parse, grouping, match, portion].map((v) => clamp(v));
  const geometric = Math.pow(
    vals.reduce((acc, v) => acc * v, 1),
    1 / vals.length
  );

  return {
    asr: vals[0],
    parse: vals[1],
    grouping: vals[2],
    match: vals[3],
    portion: vals[4],
    overall: Math.round(geometric * 100) / 100,
  };
}

/**
 * Generate human-readable confidence insight for the UI.
 * Replaces "59% confidence" with meaningful labels.
 */
export function buildConfidenceInsight(
  foodName: string,
  layers: ItemConfidence,
  matchSource: string,
  isMerged: boolean
): ConfidenceInsight {
  const issues: string[] = [];
  const capitalized = foodName.charAt(0).toUpperCase() + foodName.slice(1);

  // ASR issues
  if (layers.asr < 0.6) {
    issues.push("Voice input may have been misheard");
  }

  // Parse issues
  if (layers.parse < 0.5) {
    issues.push("Couldn't fully parse the input");
  }

  // Grouping issues
  if (layers.grouping < 0.7) {
    issues.push(
      isMerged
        ? "Items may have been combined incorrectly"
        : "Unclear whether items belong together"
    );
  }

  // Match issues
  if (layers.match < 0.5) {
    issues.push(
      matchSource === "local-fallback"
        ? "No database match — using estimate"
        : "Database match may not be exact"
    );
  }

  // Portion issues
  if (layers.portion < 0.6) {
    issues.push("Portion size uncertain");
  }

  // Build summary
  let summary: string;
  if (layers.overall >= CONFIDENCE_HIGH) {
    summary = `${capitalized} detected`;
  } else if (layers.match < 0.5) {
    summary = `${capitalized} — match uncertain`;
  } else if (layers.portion < 0.6) {
    summary = `${capitalized} detected • Portion uncertain`;
  } else if (layers.asr < 0.6) {
    summary = `${capitalized} — may have been misheard`;
  } else if (layers.grouping < 0.7) {
    summary = `${capitalized} — grouping uncertain`;
  } else {
    summary = `${capitalized} — please verify`;
  }

  const needsClarification =
    layers.overall < 0.65 || layers.grouping < 0.6 || isMerged;

  // Check for category-specific clarification triggers
  const clarificationHint = getClarificationHint(foodName);
  if (clarificationHint) {
    issues.push(clarificationHint);
  }

  return {
    summary,
    issues,
    needsClarification: needsClarification || !!clarificationHint,
  };
}

// ─── Clarification Triggers ─────────────────────────────────────────────────

/**
 * Categories where the caloric range is so wide that we should
 * flag the need for clarification. "Cereal" could be 100-700 kcal.
 */
const CLARIFICATION_TRIGGERS: {
  patterns: string[];
  hint: string;
}[] = [
  {
    patterns: ["cereal", "cornflakes", "corn flakes", "granola", "muesli"],
    hint: "Cereal varies widely — check brand and portion",
  },
  {
    patterns: ["smoothie", "shake", "protein shake", "milkshake"],
    hint: "Smoothie calories depend on ingredients",
  },
  {
    patterns: ["sandwich", "wrap", "sub"],
    hint: "Fillings affect calories — verify contents",
  },
  {
    patterns: ["bowl", "poke bowl", "buddha bowl", "acai bowl"],
    hint: "Bowl toppings vary — check portion",
  },
  {
    patterns: ["curry", "tikka masala", "korma", "vindaloo", "madras"],
    hint: "Curry richness varies — verify type",
  },
  {
    patterns: ["stew", "goulash", "casserole", "hotpot"],
    hint: "Stew portions vary — check bowl size",
  },
  {
    patterns: ["pasta", "spaghetti", "penne", "linguine"],
    hint: "Sauce and portion size affect calories",
  },
  {
    patterns: ["salad"],
    hint: "Dressing and toppings affect calories",
  },
  {
    patterns: ["coffee", "latte", "cappuccino", "mocha", "frappuccino"],
    hint: "Milk type and sugar affect calories",
  },
  {
    patterns: ["tea", "chai", "matcha"],
    hint: "Additions (milk, sugar, honey) affect calories",
  },
];

function getClarificationHint(foodName: string): string | undefined {
  const lower = foodName.toLowerCase();
  for (const trigger of CLARIFICATION_TRIGGERS) {
    if (trigger.patterns.some((p) => lower.includes(p))) {
      return trigger.hint;
    }
  }
  return undefined;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 1): number {
  return Math.round(Math.min(max, Math.max(min, value)) * 100) / 100;
}
