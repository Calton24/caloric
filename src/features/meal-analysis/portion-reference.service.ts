/**
 * Portion Reference Service
 *
 * Applies count-based guardrails to the vision model's portion estimates.
 * When the model detects countable items (e.g. "5 meatballs"), this service
 * calculates grams using known reference weights instead of trusting the
 * model's gram estimate.
 *
 * Architecture:
 *   model says "5 meatballs, 255g"
 *   → detectCountable() finds count=5, food="meatball"
 *   → lookup: meatball_medium = 45g
 *   → corrected = 5 × 45g = 225g
 *   → return { correctedGrams: 225, wasAdjusted: true }
 */

import { normalizeFood } from "./food-normalizer.service";

// ─── Reference Weights ──────────────────────────────────────────────────────
// Typical weight per unit for countable foods, in grams.
// "small", "medium", "large" variants where meaningful.

interface PortionRef {
  /** Default grams per unit (medium size assumed) */
  defaultGrams: number;
  /** Size variants if the model specifies */
  sizes?: { small: number; medium: number; large: number };
  /** Max plausible grams per unit — flags unreasonable estimates */
  maxPerUnit: number;
  /** Min plausible grams per unit */
  minPerUnit: number;
}

const PORTION_REFERENCE: Record<string, PortionRef> = {
  // ── Proteins ──
  meatball: {
    defaultGrams: 45,
    sizes: { small: 30, medium: 45, large: 65 },
    maxPerUnit: 80,
    minPerUnit: 20,
  },
  egg: {
    defaultGrams: 50,
    sizes: { small: 38, medium: 50, large: 56 },
    maxPerUnit: 70,
    minPerUnit: 30,
  },
  "chicken nugget": {
    defaultGrams: 18,
    sizes: { small: 14, medium: 18, large: 25 },
    maxPerUnit: 35,
    minPerUnit: 10,
  },
  "chicken wing": {
    defaultGrams: 65,
    sizes: { small: 45, medium: 65, large: 85 },
    maxPerUnit: 100,
    minPerUnit: 30,
  },
  sausage: {
    defaultGrams: 65,
    sizes: { small: 40, medium: 65, large: 100 },
    maxPerUnit: 120,
    minPerUnit: 30,
  },
  bacon: {
    defaultGrams: 12,
    maxPerUnit: 20,
    minPerUnit: 6,
  },
  shrimp: {
    defaultGrams: 15,
    sizes: { small: 8, medium: 15, large: 25 },
    maxPerUnit: 35,
    minPerUnit: 5,
  },

  // ── Bread & baked ──
  pancake: {
    defaultGrams: 76,
    sizes: { small: 38, medium: 76, large: 115 },
    maxPerUnit: 150,
    minPerUnit: 25,
  },
  waffle: {
    defaultGrams: 75,
    sizes: { small: 35, medium: 75, large: 120 },
    maxPerUnit: 140,
    minPerUnit: 25,
  },
  croissant: {
    defaultGrams: 60,
    sizes: { small: 40, medium: 60, large: 85 },
    maxPerUnit: 100,
    minPerUnit: 30,
  },
  bread: {
    defaultGrams: 30,
    maxPerUnit: 60,
    minPerUnit: 20,
  },
  tortilla: {
    defaultGrams: 45,
    sizes: { small: 25, medium: 45, large: 65 },
    maxPerUnit: 80,
    minPerUnit: 20,
  },
  bun: {
    defaultGrams: 50,
    sizes: { small: 35, medium: 50, large: 75 },
    maxPerUnit: 90,
    minPerUnit: 25,
  },

  // ── Fruits ──
  banana: {
    defaultGrams: 118,
    sizes: { small: 81, medium: 118, large: 136 },
    maxPerUnit: 150,
    minPerUnit: 60,
  },
  apple: {
    defaultGrams: 182,
    sizes: { small: 150, medium: 182, large: 220 },
    maxPerUnit: 250,
    minPerUnit: 100,
  },
  strawberry: {
    defaultGrams: 12,
    sizes: { small: 7, medium: 12, large: 18 },
    maxPerUnit: 25,
    minPerUnit: 5,
  },
  orange: {
    defaultGrams: 131,
    sizes: { small: 100, medium: 131, large: 184 },
    maxPerUnit: 200,
    minPerUnit: 80,
  },

  // ── Common countable items ──
  taco: {
    defaultGrams: 170,
    sizes: { small: 80, medium: 170, large: 250 },
    maxPerUnit: 300,
    minPerUnit: 60,
  },
  cookie: {
    defaultGrams: 30,
    sizes: { small: 15, medium: 30, large: 50 },
    maxPerUnit: 70,
    minPerUnit: 10,
  },
  dumpling: {
    defaultGrams: 25,
    sizes: { small: 15, medium: 25, large: 40 },
    maxPerUnit: 50,
    minPerUnit: 10,
  },
  "pizza slice": {
    defaultGrams: 107,
    sizes: { small: 70, medium: 107, large: 150 },
    maxPerUnit: 200,
    minPerUnit: 50,
  },
  donut: {
    defaultGrams: 55,
    sizes: { small: 35, medium: 55, large: 80 },
    maxPerUnit: 100,
    minPerUnit: 25,
  },
  "french fries": {
    defaultGrams: 5,
    maxPerUnit: 10,
    minPerUnit: 2,
  },
};

// ─── Count Detection ────────────────────────────────────────────────────────

/** Patterns to extract count from humanReadable portion strings */
const COUNT_PATTERNS = [
  /^(\d+)\s+(?:small|medium|large|regular)?\s*(.+)/i,
  /^about\s+(\d+)\s+(?:small|medium|large|regular)?\s*(.+)/i,
  /^approximately\s+(\d+)\s+(.+)/i,
  /^(\d+)x\s+(.+)/i,
];

const SIZE_PATTERN = /\b(small|medium|large)\b/i;

interface CountDetection {
  count: number;
  size?: "small" | "medium" | "large";
  foodName: string;
}

/**
 * Try to extract a count and optional size from the portion description.
 * Returns null if no countable pattern is found.
 */
function detectCountable(humanReadable: string): CountDetection | null {
  for (const pattern of COUNT_PATTERNS) {
    const match = humanReadable.match(pattern);
    if (match) {
      const count = parseInt(match[1], 10);
      if (count <= 0 || count > 50) continue; // sanity bound
      const remainder = match[2].trim();
      const sizeMatch = humanReadable.match(SIZE_PATTERN);
      const size = sizeMatch
        ? (sizeMatch[1].toLowerCase() as "small" | "medium" | "large")
        : undefined;
      return { count, size, foodName: remainder };
    }
  }
  return null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface PortionGuardrailResult {
  /** The corrected gram estimate */
  correctedGrams: number;
  /** Whether the estimate was adjusted from the model's original */
  wasAdjusted: boolean;
  /** Updated human-readable portion string */
  correctedHumanReadable: string;
  /** Confidence boost/penalty for the portion estimate */
  portionConfidenceAdjust: number;
  /** Explanation of what we did */
  reasoning: string;
}

/**
 * Apply portion guardrails to a food item's portion estimate.
 *
 * If the item is countable and we have reference weights, override
 * the model's gram estimate with count × reference weight.
 *
 * Also flags wildly unreasonable gram estimates even for non-countable items.
 */
export function applyPortionGuardrails(
  foodLabel: string,
  modelGrams: number,
  humanReadable: string
): PortionGuardrailResult {
  const normalized = normalizeFood(foodLabel);
  const countInfo = detectCountable(humanReadable);

  // ── Case 1: Countable item with reference weight ──
  if (countInfo) {
    const ref =
      PORTION_REFERENCE[normalized] ||
      PORTION_REFERENCE[normalizeFood(countInfo.foodName)];

    if (ref) {
      const perUnit =
        countInfo.size && ref.sizes
          ? ref.sizes[countInfo.size]
          : ref.defaultGrams;

      const correctedGrams = countInfo.count * perUnit;
      const modelPerUnit = modelGrams / countInfo.count;
      const deviation = Math.abs(modelPerUnit - perUnit) / perUnit;

      return {
        correctedGrams,
        wasAdjusted: Math.abs(correctedGrams - modelGrams) > 5,
        correctedHumanReadable: `${countInfo.count} ${countInfo.size ?? "medium"} ${normalized} (${correctedGrams}g)`,
        portionConfidenceAdjust: deviation > 0.3 ? -0.1 : 0.15,
        reasoning:
          deviation > 0.3
            ? `Model estimated ${Math.round(modelPerUnit)}g/unit, reference is ${perUnit}g/unit. Corrected to ${correctedGrams}g total.`
            : `Count-based estimate: ${countInfo.count} × ${perUnit}g = ${correctedGrams}g. Consistent with model.`,
      };
    }
  }

  // ── Case 2: Non-countable but we have a reference (sanity check) ──
  const ref = PORTION_REFERENCE[normalized];
  if (ref && countInfo) {
    // We have count info but no exact food match — still sanity-check
    const perUnit = modelGrams / countInfo.count;
    if (perUnit > ref.maxPerUnit * 1.5 || perUnit < ref.minPerUnit * 0.5) {
      const correctedGrams = countInfo.count * ref.defaultGrams;
      return {
        correctedGrams,
        wasAdjusted: true,
        correctedHumanReadable: humanReadable,
        portionConfidenceAdjust: -0.15,
        reasoning: `Per-unit weight (${Math.round(perUnit)}g) outside plausible range (${ref.minPerUnit}-${ref.maxPerUnit}g). Corrected.`,
      };
    }
  }

  // ── Case 3: General sanity bounds ──
  // Flag extreme estimates but don't override (we don't have enough info)
  if (modelGrams < 3) {
    return {
      correctedGrams: modelGrams,
      wasAdjusted: false,
      correctedHumanReadable: humanReadable,
      portionConfidenceAdjust: -0.2,
      reasoning: "Extremely low gram estimate — likely inaccurate.",
    };
  }
  if (modelGrams > 800) {
    return {
      correctedGrams: modelGrams,
      wasAdjusted: false,
      correctedHumanReadable: humanReadable,
      portionConfidenceAdjust: -0.15,
      reasoning: "Very high gram estimate — may be overestimated.",
    };
  }

  // ── Case 4: No adjustment needed ──
  return {
    correctedGrams: modelGrams,
    wasAdjusted: false,
    correctedHumanReadable: humanReadable,
    portionConfidenceAdjust: 0,
    reasoning: "No count-based reference available. Using model estimate.",
  };
}
