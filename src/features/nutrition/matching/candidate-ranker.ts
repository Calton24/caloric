/**
 * Candidate Ranker
 *
 * Replaces "first search result wins" with a weighted scoring model.
 * Each candidate from USDA/OFF gets scored on multiple dimensions:
 *
 *   finalScore =
 *     textSimilarity * 0.35 +
 *     categoryMatch  * 0.20 +
 *     sourceTrust    * 0.15 +
 *     portionMatch   * 0.15 +
 *     brandMatch     * 0.10 +
 *     plausibility   * 0.05
 */

import type { FoodCategory } from "../ontology/food-ontology";
import type { ParsedFoodItem } from "../parsing/food-candidate.schema";
import type { FoodMatch } from "./matching.types";
import type { RoutingDecision } from "./source-router";

// ─── Scoring Weights ─────────────────────────────────────────────────────────

const WEIGHTS = {
  textSimilarity: 0.3,
  categoryMatch: 0.2,
  sourceTrust: 0.1,
  portionMatch: 0.1,
  brandMatch: 0.1,
  plausibility: 0.2,
} as const;

// ─── Scoring Functions ───────────────────────────────────────────────────────

/**
 * How similar is the match name to the query?
 * Penalizes matches with extra qualifying words not in the query
 * (e.g., "MILK CHOCOLATE COATED CORNFLAKES" vs. query "cornflakes").
 */
function scoreTextSimilarity(match: FoodMatch, query: string): number {
  const matchName = match.name.toLowerCase();
  const q = query.toLowerCase();

  if (matchName === q) return 1.0;

  const queryWords = new Set(q.split(/\s+/));
  const matchWords = matchName.split(/\s+/);
  const overlap = matchWords.filter((w) => queryWords.has(w)).length;
  const overlapRatio = overlap / Math.max(queryWords.size, 1);

  // Extra words penalty: words in match name NOT in query.
  // Scales with query brevity — a 1-word query like "omelette" should
  // heavily penalize "cheesy omelette", "spanish omelette" etc.
  const extraWords = matchWords.filter((w) => !queryWords.has(w)).length;
  const brevityMultiplier =
    queryWords.size <= 1 ? 0.18 : queryWords.size <= 2 ? 0.12 : 0.08;
  const extraPenalty = Math.min(extraWords * brevityMultiplier, 0.5);

  // Query is entirely contained in the match name ("omelette" → "cheesy omelette")
  if (matchName.includes(q)) {
    // Reward based on what fraction of the match name IS the query
    const lengthRatio = q.length / matchName.length;
    return Math.max(
      0.25,
      0.6 + lengthRatio * 0.25 + overlapRatio * 0.1 - extraPenalty
    );
  }

  // Match name is a prefix/subset of query ("egg" → query "eggs on toast")
  if (matchName.startsWith(q) || q.startsWith(matchName)) return 0.85;
  if (q.includes(matchName)) {
    return Math.max(0.3, 0.7 + overlapRatio * 0.15 - extraPenalty);
  }

  return Math.max(0.1, Math.min(overlapRatio * 0.8, 0.65) - extraPenalty);
}

/**
 * Does the match's food category align with the expected category?
 * e.g., if ontology says "beverage", don't rank a solid food first.
 */
function scoreCategoryMatch(
  match: FoodMatch,
  expectedCategory: FoodCategory | null
): number {
  if (!expectedCategory) return 0.5; // no category info = neutral

  const name = match.name.toLowerCase();

  // Category → keyword heuristics
  const categoryKeywords: Partial<Record<FoodCategory, string[]>> = {
    beverage: [
      "coffee",
      "tea",
      "juice",
      "milk",
      "water",
      "drink",
      "soda",
      "latte",
      "beverage",
      "cappuccino",
      "espresso",
      "smoothie",
    ],
    protein: [
      "chicken",
      "beef",
      "pork",
      "fish",
      "salmon",
      "turkey",
      "egg",
      "tofu",
      "shrimp",
    ],
    grain: [
      "rice",
      "bread",
      "pasta",
      "wheat",
      "oat",
      "cereal",
      "tortilla",
      "noodle",
      "corn flake",
      "cornflake",
      "flakes",
      "granola",
      "muesli",
      "bran",
      "porridge",
    ],
    fruit: [
      "apple",
      "banana",
      "orange",
      "berry",
      "grape",
      "melon",
      "mango",
      "pear",
    ],
    dairy: ["cheese", "yogurt", "butter", "cream", "milk"],
    meal: [
      "goulash",
      "curry",
      "stew",
      "biryani",
      "schnitzel",
      "moussaka",
      "shawarma",
      "empanada",
      "paella",
      "risotto",
      "lasagne",
      "pie",
      "casserole",
    ],
  };

  const keywords = categoryKeywords[expectedCategory];
  if (!keywords) return 0.5;

  const hasMatch = keywords.some((kw) => name.includes(kw));
  return hasMatch ? 0.9 : 0.3;
}

/**
 * Trust score based on the data source.
 * USDA is generally more reliable for generic foods.
 */
function scoreSourceTrust(match: FoodMatch, routing: RoutingDecision): number {
  const sourceScores: Record<string, number> = {
    usda: 0.85,
    openfoodfacts: 0.65,
    edamam: 0.8,
    branded: 0.9,
    "recipe-template": 0.7,
    "local-fallback": 0.7,
  };

  let base = sourceScores[match.source] ?? 0.5;

  // Boost the preferred source
  if (routing.preference === "off-first" && match.source === "openfoodfacts") {
    base += 0.15;
  }
  if (routing.preference === "usda-first" && match.source === "usda") {
    base += 0.1;
  }
  if (routing.preference === "edamam-nlp" && match.source === "edamam") {
    base += 0.15;
  }

  return Math.min(base, 1.0);
}

/**
 * Does the match have reasonable serving/portion information?
 */
function scorePortionMatch(match: FoodMatch): number {
  let score = 0.5;

  // Has serving size info
  if (match.servingSize > 0 && match.servingSize !== 100) {
    score += 0.2; // specific, not just per-100g default
  }

  // Has a serving description
  if (match.servingDescription && match.servingDescription !== "100g") {
    score += 0.15;
  }

  // Has brand info (usually means real nutrition label data)
  if (match.brand) {
    score += 0.1;
  }

  return Math.min(score, 1.0);
}

/**
 * Does a branded match align with branded intent?
 */
function scoreBrandMatch(match: FoodMatch, routing: RoutingDecision): number {
  if (!routing.isBranded) return 0.5; // neutral if no brand intent

  if (match.brand) return 0.9; // branded match for branded query
  if (match.source === "openfoodfacts") return 0.7; // OFF tends to have branded
  return 0.3; // generic match for branded query = mismatch
}

/**
 * Are the calorie values plausible for this food type?
 * Catches garbage matches (e.g., 0 cal chicken, 5000 cal salad).
 * Uses ontology calorie anchor when available for tight filtering,
 * falls back to category-specific expected ranges.
 */
function scorePlausibility(
  match: FoodMatch,
  expectedCategory: FoodCategory | null,
  ontologyCalories: number | null
): number {
  const cal = match.nutrients.calories;

  // Basic sanity
  if (cal < 0) return 0;
  if (cal > 2000) return 0.1; // per serving > 2000 kcal is suspicious

  if (expectedCategory === "non-food") {
    return cal === 0 ? 1.0 : 0.1;
  }

  // When the ontology has a specific calorie expectation, use it as anchor.
  // This prevents "cornflakes" matching "MILK CHOCOLATE COATED CORNFLAKES" (774 cal)
  // when the ontology says cornflakes ≈ 150 cal.
  if (ontologyCalories != null && ontologyCalories > 0) {
    const ratio = cal / ontologyCalories;
    // Perfect match to ontology expectation
    if (ratio >= 0.7 && ratio <= 1.5) return 0.95;
    // Reasonable deviation (e.g., larger serving)
    if (ratio >= 0.4 && ratio <= 2.0) return 0.7;
    // Suspicious deviation
    if (ratio >= 0.2 && ratio <= 3.0) return 0.4;
    // Way off — likely wrong product entirely
    return 0.15;
  }

  // Category-specific plausible calorie ranges (per serving)
  const categoryRanges: Partial<
    Record<FoodCategory, { min: number; max: number; ideal: number }>
  > = {
    beverage: { min: 0, max: 500, ideal: 100 },
    grain: { min: 50, max: 500, ideal: 200 },
    fruit: { min: 20, max: 300, ideal: 80 },
    vegetable: { min: 5, max: 200, ideal: 50 },
    dairy: { min: 30, max: 500, ideal: 150 },
    protein: { min: 80, max: 600, ideal: 250 },
    snack: { min: 50, max: 600, ideal: 200 },
    meal: { min: 150, max: 1000, ideal: 450 },
    condiment: { min: 0, max: 100, ideal: 20 },
    supplement: { min: 50, max: 400, ideal: 150 },
    "non-food": { min: 0, max: 0, ideal: 0 },
  };

  const range = expectedCategory ? categoryRanges[expectedCategory] : null;
  if (range) {
    if (cal < range.min || cal > range.max) return 0.2;
    // Score based on distance from ideal
    const distance = Math.abs(cal - range.ideal) / (range.max - range.min || 1);
    return Math.max(0.4, 0.95 - distance * 0.5);
  }

  // Generic food: 10-1000 kcal per serving is reasonable
  if (cal >= 10 && cal <= 1000) return 0.8;
  if (cal > 0 && cal < 10) return 0.6;
  return 0.4;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Rank candidate matches using weighted multi-dimensional scoring.
 *
 * @param candidates   Raw matches from USDA + OFF
 * @param parsed       The parsed food item
 * @param routing      Routing decision from source router
 * @returns            Candidates sorted by final score (best first), with updated matchScore
 */
export function rankCandidates(
  candidates: FoodMatch[],
  parsed: ParsedFoodItem,
  routing: RoutingDecision
): FoodMatch[] {
  if (candidates.length === 0) return [];

  const query = parsed.preparation
    ? `${parsed.name} ${parsed.preparation}`
    : parsed.name;

  const queryWords = query.toLowerCase().split(/\s+/).filter(Boolean);
  const queryWordCount = queryWords.length;

  // ── SINGLE-WORD HARD FILTER ──────────────────────────────────────────
  // When the user said ONE word ("egg", "rice", "chicken"), discard any
  // candidate whose name contains extra qualifying words. A single-word
  // query deserves a single-concept result — not "egg mcmuffin" or
  // "fried rice with shrimp". We keep candidates where:
  //   - The name is exactly the query ("egg" → "egg")
  //   - The name is the plural ("egg" → "eggs")
  //   - The name is 1-2 words total ("egg" → "boiled egg" is borderline ok)
  //   - The candidate is from local-fallback or recipe-template (curated)
  let pool = candidates;
  if (queryWordCount === 1) {
    const q = queryWords[0];
    const filtered = candidates.filter((m) => {
      // Always keep curated sources
      if (m.source === "local-fallback" || m.source === "recipe-template")
        return true;
      const mWords = m.name.toLowerCase().split(/\s+/).filter(Boolean);
      // Allow exact match or plural
      if (mWords.length === 1) return true;
      // Allow 2-word names where one word is the query (e.g. "boiled egg")
      if (
        mWords.length === 2 &&
        mWords.some((w) => w === q || w.startsWith(q) || q.startsWith(w))
      )
        return true;
      // Reject 3+ word compound names for single-word queries
      return false;
    });
    // Only apply filter if it doesn't eliminate everything
    if (filtered.length > 0) pool = filtered;
  }

  // Extract ontology calorie anchor for plausibility scoring
  const ontologyCalories = routing.ontologyEntry?.defaultCalories ?? null;

  return pool
    .map((match) => {
      const textSim = scoreTextSimilarity(match, query);
      const catMatch = scoreCategoryMatch(match, routing.category);
      const srcTrust = scoreSourceTrust(match, routing);
      const portMatch = scorePortionMatch(match);
      const brandMatch = scoreBrandMatch(match, routing);
      const plausibility = scorePlausibility(
        match,
        routing.category,
        ontologyCalories
      );

      const finalScore =
        textSim * WEIGHTS.textSimilarity +
        catMatch * WEIGHTS.categoryMatch +
        srcTrust * WEIGHTS.sourceTrust +
        portMatch * WEIGHTS.portionMatch +
        brandMatch * WEIGHTS.brandMatch +
        plausibility * WEIGHTS.plausibility;

      return {
        ...match,
        matchScore: Math.round(finalScore * 100) / 100,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}
