/**
 * Nutrition Pipeline Tests
 *
 * Tests the full parse → match → estimate pipeline and its individual stages.
 */

import {
  buildConfidenceInsight,
  buildItemConfidence,
  computeOverallConfidence,
  CONFIDENCE_HIGH,
  CONFIDENCE_LOW,
  CONFIDENCE_NEEDS_REVIEW,
  getAmbiguityReason,
  scoreParserConfidence,
  scorePortionConfidence,
} from "../src/features/nutrition/estimation/confidence.service";
import {
  estimateFoodItem,
  estimateMeal,
} from "../src/features/nutrition/estimation/portion-estimator.service";
import { rankCandidates } from "../src/features/nutrition/matching/candidate-ranker";
import {
  isCaloriePlausibleForFood,
  matchFoodItemLocally,
  singularize,
} from "../src/features/nutrition/matching/food-matcher.service";
import type {
  FoodMatch,
  MatchedFoodItem,
} from "../src/features/nutrition/matching/matching.types";
import {
  buildOntologyMatch,
  routeSource,
} from "../src/features/nutrition/matching/source-router";
import { mealEstimateToDraft } from "../src/features/nutrition/nutrition-pipeline";
import { buildMealEntryFromDraft } from "../src/features/nutrition/nutrition.helpers";
import {
  detectBrandedIntent,
  detectModifiers,
  lookupOntology,
} from "../src/features/nutrition/ontology/food-ontology";
import type { ParsedFoodItem } from "../src/features/nutrition/parsing/food-candidate.schema";
import { groupFoodPhrases } from "../src/features/nutrition/parsing/phrase-grouper";
import { parseWithRegex } from "../src/features/nutrition/parsing/regex-parser";
import { cleanTranscript } from "../src/features/nutrition/parsing/transcript-cleaner";

// ─── Recipe Templates ────────────────────────────────────────────────────────

import {
  buildRecipeMatch,
  lookupRecipeTemplate,
} from "../src/features/nutrition/ontology/recipe-templates";

// ─── Food Aliases (Multilingual) ─────────────────────────────────────────────

import { translateFoodAlias } from "../src/features/nutrition/ontology/food-aliases";

// ─── Food Emoji ──────────────────────────────────────────────────────────────

import {
  getFoodEmoji,
  getMealEmoji,
} from "../src/features/nutrition/ontology/food-emoji";

// ─── Regex Parser ────────────────────────────────────────────────────────────

describe("parseWithRegex", () => {
  it("parses a simple single food item", () => {
    const items = parseWithRegex("2 eggs");
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("eggs");
    expect(items[0].quantity).toBe(2);
    expect(items[0].confidence).toBeGreaterThan(0.5);
  });

  it("parses a compound input with 'and'", () => {
    const items = parseWithRegex("toast and coffee");
    expect(items).toHaveLength(2);
    expect(items[0].name).toBe("toast");
    expect(items[1].name).toBe("coffee");
  });

  it("parses comma-separated items", () => {
    const items = parseWithRegex("banana, yogurt, coffee");
    expect(items).toHaveLength(3);
    expect(items[0].name).toBe("banana");
    expect(items[1].name).toBe("yogurt");
    expect(items[2].name).toBe("coffee");
  });

  it("detects units", () => {
    const items = parseWithRegex("2 cups of rice");
    expect(items).toHaveLength(1);
    expect(items[0].unit).toBe("cup");
    expect(items[0].quantity).toBe(2);
    expect(items[0].name).toBe("rice");
  });

  it("detects bowls", () => {
    const items = parseWithRegex("bowl of pasta");
    expect(items).toHaveLength(1);
    expect(items[0].unit).toBe("bowl");
    expect(items[0].name).toBe("pasta");
  });

  it("detects word quantities", () => {
    const items = parseWithRegex("three eggs");
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
  });

  it("detects slices", () => {
    const items = parseWithRegex("2 slices of pizza");
    expect(items).toHaveLength(1);
    expect(items[0].unit).toBe("slice");
    expect(items[0].quantity).toBe(2);
    expect(items[0].name).toBe("pizza");
  });

  it("handles empty input", () => {
    const items = parseWithRegex("");
    expect(items).toHaveLength(0);
  });

  it("handles single-word foods", () => {
    const items = parseWithRegex("banana");
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("banana");
    expect(items[0].quantity).toBe(1);
  });

  it("detects preparation methods", () => {
    // "grilled chicken" is a compound food — kept as full name
    const items = parseWithRegex("grilled chicken");
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("grilled chicken");
    // Non-compound: prep should still be extracted
    const steak = parseWithRegex("grilled steak");
    expect(steak).toHaveLength(1);
    expect(steak[0].preparation).toBe("grilled");
    expect(steak[0].name).toBe("steak");
  });

  it("assigns higher confidence to explicit quantities", () => {
    const withQty = parseWithRegex("2 eggs");
    const withoutQty = parseWithRegex("eggs");
    expect(withQty[0].confidence).toBeGreaterThan(withoutQty[0].confidence);
  });

  it("raw fragment preserves original text", () => {
    const items = parseWithRegex("2 eggs and toast");
    expect(items[0].rawFragment).toBe("2 eggs");
    expect(items[1].rawFragment).toBe("toast");
  });
});

// ─── Local Matching ──────────────────────────────────────────────────────────

describe("matchFoodItemLocally", () => {
  it("matches a known food", () => {
    const parsed: ParsedFoodItem = {
      name: "chicken",
      quantity: 1,
      unit: "serving",
      preparation: null,
      confidence: 0.8,
      rawFragment: "chicken",
    };

    const result = matchFoodItemLocally(parsed);
    expect(result.selectedMatch).not.toBeNull();
    expect(result.selectedMatch!.source).toBe("local-fallback");
    expect(result.selectedMatch!.nutrients.calories).toBeGreaterThan(0);
    expect(result.selectedMatch!.nutrients.protein).toBeGreaterThan(0);
  });

  it("returns null match for unknown food", () => {
    const parsed: ParsedFoodItem = {
      name: "xyzunknownfood",
      quantity: 1,
      unit: "serving",
      preparation: null,
      confidence: 0.5,
      rawFragment: "xyzunknownfood",
    };

    const result = matchFoodItemLocally(parsed);
    expect(result.selectedMatch).toBeNull();
    expect(result.matchConfidence).toBeLessThan(0.2);
  });

  it("matches partial food names", () => {
    const parsed: ParsedFoodItem = {
      name: "chicken breast",
      quantity: 1,
      unit: "piece",
      preparation: "grilled",
      confidence: 0.9,
      rawFragment: "grilled chicken breast",
    };

    const result = matchFoodItemLocally(parsed);
    expect(result.selectedMatch).not.toBeNull();
  });
});

// ─── Portion Estimation ──────────────────────────────────────────────────────

describe("estimateFoodItem", () => {
  it("estimates a simple item with match", () => {
    const matched: MatchedFoodItem = {
      parsed: {
        name: "egg",
        quantity: 2,
        unit: "piece",
        preparation: null,
        confidence: 0.85,
        rawFragment: "2 eggs",
      },
      matches: [
        {
          source: "local-fallback",
          sourceId: "local_egg",
          name: "egg",
          nutrients: { calories: 140, protein: 12, carbs: 1, fat: 10 },
          servingSize: 100,
          servingUnit: "g",
          servingDescription: "2 eggs (100g)",
          matchScore: 0.5,
        },
      ],
      selectedMatch: {
        source: "local-fallback",
        sourceId: "local_egg",
        name: "egg",
        nutrients: { calories: 140, protein: 12, carbs: 1, fat: 10 },
        servingSize: 100,
        servingUnit: "g",
        servingDescription: "2 eggs (100g)",
        matchScore: 0.5,
      },
      matchConfidence: 0.42,
    };

    const estimated = estimateFoodItem(matched);
    expect(estimated.nutrients.calories).toBeGreaterThan(0);
    expect(estimated.matchedName).toBe("egg");
    expect(estimated.matchSource).toBe("local-fallback");
  });

  it("returns generic estimate when no match found", () => {
    const matched: MatchedFoodItem = {
      parsed: {
        name: "mystery food",
        quantity: 1,
        unit: "serving",
        preparation: null,
        confidence: 0.3,
        rawFragment: "mystery food",
      },
      matches: [],
      selectedMatch: null,
      matchConfidence: 0.09,
    };

    const estimated = estimateFoodItem(matched);
    expect(estimated.nutrients.calories).toBe(250); // generic fallback
    expect(estimated.needsUserConfirmation).toBe(true);
    expect(estimated.ambiguityReason).toBeDefined();
  });

  it("flags ambiguous units for user confirmation", () => {
    const matched: MatchedFoodItem = {
      parsed: {
        name: "pasta",
        quantity: 1,
        unit: "bowl",
        preparation: null,
        confidence: 0.6,
        rawFragment: "bowl of pasta",
      },
      matches: [
        {
          source: "local-fallback",
          sourceId: "local_pasta",
          name: "pasta",
          nutrients: { calories: 220, protein: 8, carbs: 43, fat: 1 },
          servingSize: 100,
          servingUnit: "g",
          servingDescription: "1 cup cooked (140g)",
          matchScore: 0.5,
        },
      ],
      selectedMatch: {
        source: "local-fallback",
        sourceId: "local_pasta",
        name: "pasta",
        nutrients: { calories: 220, protein: 8, carbs: 43, fat: 1 },
        servingSize: 100,
        servingUnit: "g",
        servingDescription: "1 cup cooked (140g)",
        matchScore: 0.5,
      },
      matchConfidence: 0.3,
    };

    const estimated = estimateFoodItem(matched);
    // Bowl is an ambiguous unit, confidence should be lower
    expect(estimated.confidence).toBeLessThan(CONFIDENCE_HIGH);
  });
});

describe("estimateMeal", () => {
  it("sums nutrients across multiple items", () => {
    const matched: MatchedFoodItem[] = [
      {
        parsed: {
          name: "egg",
          quantity: 2,
          unit: "piece",
          preparation: null,
          confidence: 0.85,
          rawFragment: "2 eggs",
        },
        matches: [],
        selectedMatch: {
          source: "local-fallback",
          sourceId: "local_egg",
          name: "egg",
          nutrients: { calories: 140, protein: 12, carbs: 1, fat: 10 },
          servingSize: 100,
          servingUnit: "g",
          servingDescription: "2 eggs (100g)",
          matchScore: 0.5,
        },
        matchConfidence: 0.42,
      },
      {
        parsed: {
          name: "toast",
          quantity: 1,
          unit: "piece",
          preparation: null,
          confidence: 0.75,
          rawFragment: "toast",
        },
        matches: [],
        selectedMatch: {
          source: "local-fallback",
          sourceId: "local_toast",
          name: "toast",
          nutrients: { calories: 120, protein: 4, carbs: 22, fat: 2 },
          servingSize: 100,
          servingUnit: "g",
          servingDescription: "2 slices (60g)",
          matchScore: 0.5,
        },
        matchConfidence: 0.37,
      },
    ];

    const estimate = estimateMeal(
      matched,
      "2 eggs and toast",
      "voice",
      "regex"
    );
    expect(estimate.items).toHaveLength(2);
    expect(estimate.totals.calories).toBeGreaterThan(0);
    expect(estimate.totals.protein).toBeGreaterThan(0);
    expect(estimate.source).toBe("voice");
    expect(estimate.parseMethod).toBe("regex");
    // Overall confidence = min of items
    expect(estimate.overallConfidence).toBeLessThanOrEqual(
      Math.min(...estimate.items.map((i) => i.confidence))
    );
  });

  it("handles empty matched items", () => {
    const estimate = estimateMeal([], "", "text", "fallback");
    expect(estimate.items).toHaveLength(0);
    expect(estimate.totals.calories).toBe(0);
    expect(estimate.overallConfidence).toBe(0);
  });
});

// ─── Confidence Scoring ──────────────────────────────────────────────────────

describe("confidence scoring", () => {
  it("scoreParserConfidence returns higher for explicit inputs", () => {
    const high = scoreParserConfidence(true, true, 2);
    const low = scoreParserConfidence(false, false, 6);
    expect(high).toBeGreaterThan(low);
  });

  it("scorePortionConfidence rates precise units higher", () => {
    const precise = scorePortionConfidence("piece", 2);
    const ambiguous = scorePortionConfidence("bowl", 1);
    expect(precise).toBeGreaterThan(ambiguous);
  });

  it("computeOverallConfidence uses geometric mean", () => {
    const result = computeOverallConfidence(1.0, 1.0, 1.0);
    expect(result).toBe(1.0);

    const low = computeOverallConfidence(0.5, 0.5, 0.5);
    expect(low).toBe(0.5);
  });

  it("one low score drags overall confidence down", () => {
    const mixed = computeOverallConfidence(0.9, 0.1, 0.9);
    expect(mixed).toBeLessThan(0.5);
  });

  it("getAmbiguityReason returns reason for bowls", () => {
    const reason = getAmbiguityReason("bowl", "usda", CONFIDENCE_LOW);
    expect(reason).toContain("Bowl");
  });

  it("getAmbiguityReason returns undefined for high confidence", () => {
    const reason = getAmbiguityReason("piece", "usda", CONFIDENCE_HIGH);
    expect(reason).toBeUndefined();
  });

  it("threshold constants are ordered correctly", () => {
    expect(CONFIDENCE_LOW).toBeLessThan(CONFIDENCE_NEEDS_REVIEW);
    expect(CONFIDENCE_NEEDS_REVIEW).toBeLessThan(CONFIDENCE_HIGH);
  });
});

// ─── Pipeline Integration ────────────────────────────────────────────────────

describe("mealEstimateToDraft", () => {
  it("converts estimate to a draft with provenance", () => {
    const estimate = {
      items: [
        {
          parsed: {
            name: "banana",
            quantity: 1,
            unit: "piece" as const,
            preparation: null,
            confidence: 0.8,
            rawFragment: "banana",
          },
          matchedName: "banana",
          matchSource: "local-fallback" as const,
          matchId: "local_banana",
          estimatedServings: 1.2,
          nutrients: { calories: 126, protein: 1.2, carbs: 32.4, fat: 0 },
          confidence: 0.55,
          needsUserConfirmation: false,
        },
      ],
      totals: { calories: 126, protein: 1.2, carbs: 32.4, fat: 0 },
      overallConfidence: 0.55,
      rawInput: "banana",
      source: "text" as const,
      parseMethod: "regex",
    };

    const draft = mealEstimateToDraft(estimate);
    expect(draft.title).toBe("banana");
    expect(draft.calories).toBe(126);
    expect(draft.protein).toBe(1.2);
    expect(draft.source).toBe("manual"); // text → manual mapping
    expect(draft.confidence).toBe(0.55);
    expect(draft.parseMethod).toBe("regex");
    expect(draft.estimatedItems).toHaveLength(1);
    expect(draft.rawInput).toBe("banana");
  });

  it("builds a title from multiple items", () => {
    const estimate = {
      items: [
        {
          parsed: {
            name: "eggs",
            quantity: 2,
            unit: "piece" as const,
            preparation: null,
            confidence: 0.85,
            rawFragment: "2 eggs",
          },
          matchedName: "egg",
          matchSource: "local-fallback" as const,
          matchId: "local_egg",
          estimatedServings: 1,
          nutrients: { calories: 140, protein: 12, carbs: 1, fat: 10 },
          confidence: 0.6,
          needsUserConfirmation: false,
        },
        {
          parsed: {
            name: "toast",
            quantity: 1,
            unit: "piece" as const,
            preparation: null,
            confidence: 0.75,
            rawFragment: "toast",
          },
          matchedName: "toast",
          matchSource: "local-fallback" as const,
          matchId: "local_toast",
          estimatedServings: 0.3,
          nutrients: { calories: 36, protein: 1.2, carbs: 6.6, fat: 0.6 },
          confidence: 0.5,
          needsUserConfirmation: true,
        },
      ],
      totals: { calories: 176, protein: 13.2, carbs: 7.6, fat: 10.6 },
      overallConfidence: 0.5,
      rawInput: "2 eggs and toast",
      source: "voice" as const,
      parseMethod: "regex",
    };

    const draft = mealEstimateToDraft(estimate);
    expect(draft.title).toBe("2 egg, toast");
    expect(draft.source).toBe("voice");
    expect(draft.estimatedItems).toHaveLength(2);
  });
});

// ─── Draft to MealEntry (provenance persistence) ─────────────────────────────

describe("buildMealEntryFromDraft with provenance", () => {
  it("carries items and confidence into MealEntry", () => {
    const draft = {
      title: "banana",
      source: "manual" as const,
      rawInput: "banana",
      calories: 105,
      protein: 1,
      carbs: 27,
      fat: 0,
      estimatedItems: [
        {
          parsed: {
            name: "banana",
            quantity: 1,
            unit: "piece" as const,
            preparation: null,
            confidence: 0.8,
            rawFragment: "banana",
          },
          matchedName: "banana",
          matchSource: "local-fallback" as const,
          matchId: "local_banana",
          estimatedServings: 1.2,
          nutrients: { calories: 105, protein: 1, carbs: 27, fat: 0 },
          confidence: 0.55,
          needsUserConfirmation: false,
        },
      ],
      confidence: 0.55,
      parseMethod: "regex",
    };

    const entry = buildMealEntryFromDraft({ draft });
    expect(entry.items).toHaveLength(1);
    expect(entry.items![0].name).toBe("banana");
    expect(entry.items![0].calories).toBe(105);
    expect(entry.items![0].matchSource).toBe("local-fallback");
    expect(entry.items![0].confidence).toBe(0.55);
    expect(entry.confidence).toBe(0.55);
    expect(entry.parseMethod).toBe("regex");
  });

  it("works without provenance (backward compat)", () => {
    const draft = {
      title: "chicken",
      source: "voice" as const,
      rawInput: "chicken",
      calories: 230,
      protein: 31,
      carbs: 0,
      fat: 10,
    };

    const entry = buildMealEntryFromDraft({ draft });
    expect(entry.items).toBeUndefined();
    expect(entry.confidence).toBeUndefined();
    expect(entry.parseMethod).toBeUndefined();
    expect(entry.calories).toBe(230);
  });
});

// ─── End-to-end: parse → local match → estimate → draft → entry ─────────────

describe("full local pipeline", () => {
  it("processes '2 eggs and toast' through the entire chain", () => {
    // 1. Parse
    const parsed = parseWithRegex("2 eggs and toast");
    expect(parsed).toHaveLength(2);

    // 2. Match locally
    const matched = parsed.map(matchFoodItemLocally);
    expect(matched[0].selectedMatch).not.toBeNull();
    expect(matched[1].selectedMatch).not.toBeNull();

    // 3. Estimate
    const estimate = estimateMeal(
      matched,
      "2 eggs and toast",
      "voice",
      "regex"
    );
    expect(estimate.items).toHaveLength(2);
    expect(estimate.totals.calories).toBeGreaterThan(0);
    expect(estimate.totals.protein).toBeGreaterThan(0);

    // 4. Convert to draft
    const draft = mealEstimateToDraft(estimate);
    expect(draft.calories).toBeGreaterThan(0);
    expect(draft.estimatedItems).toHaveLength(2);
    expect(draft.confidence).toBeGreaterThan(0);
    expect(draft.source).toBe("voice");

    // 5. Convert to entry
    const entry = buildMealEntryFromDraft({ draft });
    expect(entry.calories).toBeGreaterThan(0);
    expect(entry.items).toHaveLength(2);
    expect(entry.items![0].matchSource).toBe("local-fallback");
    expect(entry.confidence).toBeGreaterThan(0);
  });

  it("processes 'bowl of pasta' with ambiguity flag", () => {
    const parsed = parseWithRegex("bowl of pasta");
    const matched = parsed.map(matchFoodItemLocally);
    const estimate = estimateMeal(matched, "bowl of pasta", "text", "regex");
    const draft = mealEstimateToDraft(estimate);

    expect(draft.calories).toBeGreaterThan(0);
    // Bowl is ambiguous, should have lower confidence
    expect(draft.confidence).toBeLessThan(CONFIDENCE_HIGH);
  });

  it("handles unknown food gracefully", () => {
    const parsed = parseWithRegex("xyznoexist");
    expect(parsed).toHaveLength(1);

    const matched = parsed.map(matchFoodItemLocally);
    expect(matched[0].selectedMatch).toBeNull();

    const estimate = estimateMeal(matched, "xyznoexist", "text", "regex");
    expect(estimate.items[0].nutrients.calories).toBe(250); // generic fallback
    expect(estimate.items[0].needsUserConfirmation).toBe(true);
  });
});

// ─── Food Ontology ───────────────────────────────────────────────────────────

describe("food ontology", () => {
  it("looks up coffee → beverage, 2 kcal default", () => {
    const entry = lookupOntology("coffee");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("beverage");
    expect(entry!.defaultCalories).toBe(2);
    expect(entry!.defaultAssumption).toBe("black coffee");
    expect(entry!.clarifyIfModifiersMissing).toBe(true);
  });

  it("looks up latte → 190 kcal default", () => {
    const entry = lookupOntology("latte");
    expect(entry).not.toBeNull();
    expect(entry!.defaultCalories).toBe(190);
  });

  it("looks up water → 0 kcal", () => {
    const entry = lookupOntology("water");
    expect(entry).not.toBeNull();
    expect(entry!.defaultCalories).toBe(0);
  });

  it("looks up cigarette → non-food, 0 kcal", () => {
    const entry = lookupOntology("cigarette");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("non-food");
    expect(entry!.defaultCalories).toBe(0);
  });

  it("returns null for unknown items", () => {
    const entry = lookupOntology("xyzunknown");
    expect(entry).toBeNull();
  });

  it("detects modifiers in raw text", () => {
    const entry = lookupOntology("coffee")!;
    const mods = detectModifiers("coffee with milk and sugar", entry);
    expect(mods).toContain("milk");
    expect(mods).toContain("sugar");
  });

  it("detects no modifiers for plain coffee", () => {
    const entry = lookupOntology("coffee")!;
    const mods = detectModifiers("coffee", entry);
    expect(mods).toHaveLength(0);
  });

  it("detects branded intent", () => {
    expect(detectBrandedIntent("starbucks latte")).toBe(true);
    expect(detectBrandedIntent("coca cola")).toBe(true);
    expect(detectBrandedIntent("plain coffee")).toBe(false);
    expect(detectBrandedIntent("chicken breast")).toBe(false);
  });
});

// ─── Synonyms & Fuzzy Matching ───────────────────────────────────────────────

describe("ontology synonyms and fuzzy matching", () => {
  // Non-food synonyms
  it("spliff → cigarette (0 kcal)", () => {
    const entry = lookupOntology("spliff");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("non-food");
    expect(entry!.defaultCalories).toBe(0);
  });

  it("joint → cigarette (0 kcal)", () => {
    const entry = lookupOntology("joint");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("non-food");
  });

  it("blunt → cigarette (0 kcal)", () => {
    const entry = lookupOntology("blunt");
    expect(entry).not.toBeNull();
    expect(entry!.defaultCalories).toBe(0);
  });

  it("cig → cigarette (0 kcal)", () => {
    const entry = lookupOntology("cig");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("non-food");
  });

  it("juul → vape (0 kcal)", () => {
    const entry = lookupOntology("juul");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("non-food");
  });

  it("snus → tobacco (0 kcal)", () => {
    const entry = lookupOntology("snus");
    expect(entry).not.toBeNull();
    expect(entry!.defaultCalories).toBe(0);
  });

  it("zyn → tobacco (0 kcal)", () => {
    const entry = lookupOntology("zyn");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("non-food");
  });

  // Beverage synonyms
  it("cuppa → tea (2 kcal)", () => {
    const entry = lookupOntology("cuppa");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("beverage");
    expect(entry!.defaultCalories).toBe(2);
  });

  it("americano → coffee (2 kcal)", () => {
    const entry = lookupOntology("americano");
    expect(entry).not.toBeNull();
    expect(entry!.defaultCalories).toBe(2);
  });

  it("coke → soda (140 kcal)", () => {
    const entry = lookupOntology("coke");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("beverage");
    expect(entry!.defaultCalories).toBe(140);
  });

  it("oj → juice", () => {
    const entry = lookupOntology("oj");
    expect(entry).not.toBeNull();
    expect(entry!.defaultCalories).toBe(110);
  });

  it("boba → bubble tea", () => {
    const entry = lookupOntology("boba");
    expect(entry).not.toBeNull();
    expect(entry!.defaultCalories).toBe(350);
  });

  it("ipa → beer", () => {
    const entry = lookupOntology("ipa");
    expect(entry).not.toBeNull();
    expect(entry!.defaultCalories).toBe(150);
  });

  // Fuzzy: plurals & suffixes
  it("spliffs (plural) → cigarette", () => {
    const entry = lookupOntology("spliffs");
    expect(entry).not.toBeNull();
    expect(entry!.defaultCalories).toBe(0);
  });

  it("vaping (-ing suffix) → vape", () => {
    const entry = lookupOntology("vaping");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("non-food");
  });

  it("smoked (-ed suffix) → cigarette", () => {
    const entry = lookupOntology("smoked");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("non-food");
  });

  // Full pipeline integration
  it("full pipeline: 'spliff' → 0 kcal", () => {
    const parsed = parseWithRegex("spliff");
    const matched = parsed.map(matchFoodItemLocally);
    const estimate = estimateMeal(matched, "spliff", "text", "regex");
    expect(estimate.totals.calories).toBe(0);
  });

  it("full pipeline: 'coke' → ~140 kcal", () => {
    const parsed = parseWithRegex("coke");
    const matched = parsed.map(matchFoodItemLocally);
    const estimate = estimateMeal(matched, "coke", "text", "regex");
    expect(estimate.totals.calories).toBe(140);
  });

  it("full pipeline: 'americano' → ~2 kcal", () => {
    const parsed = parseWithRegex("americano");
    const matched = parsed.map(matchFoodItemLocally);
    const estimate = estimateMeal(matched, "americano", "text", "regex");
    expect(estimate.totals.calories).toBeLessThanOrEqual(5);
  });
});

// ─── Source Router ───────────────────────────────────────────────────────────

describe("source router", () => {
  const makeParsed = (name: string, rawFragment?: string): ParsedFoodItem => ({
    name,
    quantity: 1,
    unit: "serving",
    preparation: null,
    confidence: 0.7,
    rawFragment: rawFragment ?? name,
  });

  it("routes plain coffee → ontology-only", () => {
    const result = routeSource(makeParsed("coffee"));
    expect(result.preference).toBe("ontology-only");
    expect(result.useOntologyDefaults).toBe(true);
    expect(result.assumptionLabel).toContain("black coffee");
  });

  it("routes water → ontology-only", () => {
    const result = routeSource(makeParsed("water"));
    expect(result.preference).toBe("ontology-only");
    expect(result.useOntologyDefaults).toBe(true);
  });

  it("routes cigarette → ontology-only", () => {
    const result = routeSource(makeParsed("cigarette"));
    expect(result.preference).toBe("ontology-only");
    expect(result.category).toBe("non-food");
  });

  it("routes 'coffee with milk' → API search (has modifiers)", () => {
    const result = routeSource(makeParsed("coffee", "coffee with milk"));
    expect(result.preference).not.toBe("ontology-only");
    expect(result.useOntologyDefaults).toBe(false);
    expect(result.detectedModifiers).toContain("milk");
  });

  it("routes 'starbucks latte' → off-first (branded)", () => {
    const result = routeSource(makeParsed("latte", "starbucks latte"));
    expect(result.preference).toBe("off-first");
    expect(result.isBranded).toBe(true);
  });

  it("routes chicken → usda-first", () => {
    const result = routeSource(makeParsed("chicken"));
    expect(result.preference).toBe("usda-first");
  });

  it("routes unknown food → usda-first (default)", () => {
    const result = routeSource(makeParsed("xyzfood"));
    expect(result.preference).toBe("usda-first");
    expect(result.ontologyEntry).toBeNull();
  });

  it("builds ontology match with correct calories", () => {
    const entry = lookupOntology("coffee")!;
    const match = buildOntologyMatch(entry, "coffee");
    expect(match.nutrients.calories).toBe(2);
    expect(match.source).toBe("local-fallback");
    expect(match.servingUnit).toBe("ml");
  });
});

// ─── Candidate Ranker ────────────────────────────────────────────────────────

describe("candidate ranker", () => {
  const makeParsed = (name: string): ParsedFoodItem => ({
    name,
    quantity: 1,
    unit: "serving",
    preparation: null,
    confidence: 0.7,
    rawFragment: name,
  });

  it("ranks exact-name matches higher than partial matches", () => {
    const candidates: FoodMatch[] = [
      {
        source: "usda",
        sourceId: "1",
        name: "Coffee-Mate creamer",
        nutrients: { calories: 50, protein: 0, carbs: 5, fat: 3 },
        servingSize: 15,
        servingUnit: "ml",
        servingDescription: "1 tbsp",
        matchScore: 0.7,
      },
      {
        source: "usda",
        sourceId: "2",
        name: "coffee",
        nutrients: { calories: 2, protein: 0, carbs: 0, fat: 0 },
        servingSize: 240,
        servingUnit: "ml",
        servingDescription: "1 cup (240ml)",
        matchScore: 0.6,
      },
    ];

    const routing = routeSource(makeParsed("coffee"));
    // Force non-ontology routing for this test
    const testRouting = { ...routing, useOntologyDefaults: false };
    const ranked = rankCandidates(
      candidates,
      makeParsed("coffee"),
      testRouting
    );

    // "coffee" should rank higher than "Coffee-Mate creamer"
    expect(ranked[0].name).toBe("coffee");
  });

  it("scores branded matches higher for branded queries", () => {
    const candidates: FoodMatch[] = [
      {
        source: "usda",
        sourceId: "1",
        name: "cola, generic",
        nutrients: { calories: 140, protein: 0, carbs: 39, fat: 0 },
        servingSize: 355,
        servingUnit: "ml",
        servingDescription: "1 can",
        matchScore: 0.6,
      },
      {
        source: "openfoodfacts",
        sourceId: "2",
        name: "Coca Cola",
        brand: "The Coca-Cola Company",
        nutrients: { calories: 140, protein: 0, carbs: 39, fat: 0 },
        servingSize: 330,
        servingUnit: "ml",
        servingDescription: "1 can (330ml)",
        matchScore: 0.65,
      },
    ];

    const routing = routeSource(makeParsed("coca cola"));
    const ranked = rankCandidates(candidates, makeParsed("coca cola"), routing);

    // Branded product with brand info should rank first
    expect(ranked[0].brand).toBe("The Coca-Cola Company");
  });

  it("returns empty array for no candidates", () => {
    const routing = routeSource(makeParsed("test"));
    const ranked = rankCandidates([], makeParsed("test"), routing);
    expect(ranked).toHaveLength(0);
  });
});

// ─── Ontology integration in local matching ──────────────────────────────────

describe("ontology-aware local matching", () => {
  it("coffee locally matches to ~2 kcal via ontology", () => {
    const parsed: ParsedFoodItem = {
      name: "coffee",
      quantity: 1,
      unit: "serving",
      preparation: null,
      confidence: 0.6,
      rawFragment: "coffee",
    };

    const result = matchFoodItemLocally(parsed);
    expect(result.selectedMatch).not.toBeNull();
    expect(result.selectedMatch!.nutrients.calories).toBe(2);
    expect(result.assumptionLabel).toContain("black coffee");
  });

  it("water locally matches to 0 kcal via ontology", () => {
    const parsed: ParsedFoodItem = {
      name: "water",
      quantity: 1,
      unit: "serving",
      preparation: null,
      confidence: 0.7,
      rawFragment: "water",
    };

    const result = matchFoodItemLocally(parsed);
    expect(result.selectedMatch).not.toBeNull();
    expect(result.selectedMatch!.nutrients.calories).toBe(0);
  });

  it("tea locally matches to 2 kcal via ontology", () => {
    const parsed: ParsedFoodItem = {
      name: "tea",
      quantity: 1,
      unit: "serving",
      preparation: null,
      confidence: 0.6,
      rawFragment: "tea",
    };

    const result = matchFoodItemLocally(parsed);
    expect(result.selectedMatch).not.toBeNull();
    expect(result.selectedMatch!.nutrients.calories).toBe(2);
  });

  it("full pipeline: 'coffee' → 2 kcal", () => {
    const parsed = parseWithRegex("coffee");
    const matched = parsed.map(matchFoodItemLocally);
    const estimate = estimateMeal(matched, "coffee", "text", "regex");

    expect(estimate.totals.calories).toBe(2);
  });

  it("full pipeline: 'coffee and toast' → coffee is 2, toast is from fallback", () => {
    const parsed = parseWithRegex("coffee and toast");
    const matched = parsed.map(matchFoodItemLocally);
    const estimate = estimateMeal(matched, "coffee and toast", "text", "regex");

    // Coffee should be ~2 cal, toast should be from local DB
    const coffeeItem = estimate.items.find((i) => i.parsed.name === "coffee");
    const toastItem = estimate.items.find((i) => i.parsed.name === "toast");

    expect(coffeeItem).toBeDefined();
    expect(coffeeItem!.nutrients.calories).toBeLessThanOrEqual(5); // black coffee
    expect(toastItem).toBeDefined();
    expect(toastItem!.nutrients.calories).toBeGreaterThan(10); // real toast
  });
});

// ─── Transcript Cleaner ──────────────────────────────────────────────────────

describe("transcript cleaner", () => {
  it("removes filler words from voice input", () => {
    const result = cleanTranscript("uh I had like two eggs", "voice");
    expect(result.cleaned).not.toContain("uh");
    expect(result.cleaned).not.toContain("like");
    expect(result.cleaned).toContain("two eggs");
  });

  it("removes leading ASR garbage ('on a')", () => {
    const result = cleanTranscript("on a protein shake", "voice");
    expect(result.cleaned).not.toMatch(/^on a/);
    expect(result.cleaned).toContain("protein shake");
  });

  it("removes 'I had a' prefix", () => {
    const result = cleanTranscript("I had a banana", "voice");
    expect(result.cleaned).not.toContain("i had a");
    expect(result.cleaned).toContain("banana");
  });

  it("normalizes conjunction noise", () => {
    const result = cleanTranscript("eggs and then toast", "voice");
    expect(result.cleaned).toContain("eggs and toast");
  });

  it("fixes ASR stuttering (repeated words)", () => {
    const result = cleanTranscript("I I had eggs", "voice");
    expect(result.cleaned).not.toMatch(/\bi i\b/i);
  });

  it("returns lower ASR confidence for noisy input", () => {
    const clean = cleanTranscript("2 eggs", "voice");
    const noisy = cleanTranscript(
      "uh like I had um two eggs basically",
      "voice"
    );
    expect(noisy.asrConfidence).toBeLessThan(clean.asrConfidence);
  });

  it("gives high ASR confidence for text input", () => {
    const result = cleanTranscript("2 eggs and toast", "text");
    expect(result.asrConfidence).toBeGreaterThanOrEqual(0.9);
  });

  it("handles empty input", () => {
    const result = cleanTranscript("", "voice");
    expect(result.cleaned).toBe("");
    expect(result.asrConfidence).toBe(1.0);
  });
});

// ─── Phrase Grouper ──────────────────────────────────────────────────────────

describe("phrase grouper", () => {
  it("keeps simple separate items apart", () => {
    const groups = groupFoodPhrases("2 eggs and toast");
    expect(groups).toHaveLength(2);
    expect(groups[0].groupingConfidence).toBeGreaterThan(0.7);
  });

  it("detects compound food with container word", () => {
    const groups = groupFoodPhrases("banana protein smoothie");
    expect(groups).toHaveLength(1);
    expect(groups[0].text).toContain("smoothie");
  });

  it("merges modifier + container across delimiters", () => {
    // "protein shake, banana, smoothie" — shake and smoothie overlap
    const groups = groupFoodPhrases("protein shake, banana, smoothie");
    // Should detect "shake" and "smoothie" as overlapping
    const merged = groups.find((g) => g.isMerged);
    expect(merged).toBeDefined();
    expect(merged!.groupingConfidence).toBeLessThan(0.8);
  });

  it("keeps genuinely separate items apart", () => {
    const groups = groupFoodPhrases("chicken and rice");
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => !g.isMerged)).toBe(true);
  });

  it("handles single item input", () => {
    const groups = groupFoodPhrases("banana");
    expect(groups).toHaveLength(1);
    expect(groups[0].groupingConfidence).toBe(1.0);
  });

  it("handles empty input", () => {
    const groups = groupFoodPhrases("");
    expect(groups).toHaveLength(0);
  });

  it("splits 'with' clauses for substantial foods but keeps prep attached", () => {
    const groups = groupFoodPhrases("toast with butter");
    expect(groups).toHaveLength(1);
    expect(groups[0].text).toBe("toast with butter");
  });

  it("splits avocado and olive oil dressing from chicken salad", () => {
    const groups = groupFoodPhrases(
      "chicken salad with avocado with olive oil dressing"
    );
    expect(groups).toHaveLength(3);
    const texts = groups.map((g) => g.text);
    expect(texts).toContain("chicken salad");
    expect(texts).toContain("avocado");
    expect(texts).toContain("olive oil dressing");
  });

  it("splits protein shake with banana and peanut butter", () => {
    const groups = groupFoodPhrases(
      "protein shake with a banana and peanut butter"
    );
    expect(groups).toHaveLength(3);
    const texts = groups.map((g) => g.text);
    expect(texts).toContain("protein shake");
    expect(texts).toContain("banana");
    expect(texts).toContain("peanut butter");
  });
});

describe("conversational sentence end-to-end parsing", () => {
  it("parses 'i had two eggs and toast with butter'", () => {
    const cleaned = cleanTranscript(
      "i had two eggs and toast with butter",
      "voice"
    );
    const groups = groupFoodPhrases(cleaned.cleaned);
    const toParse = groups.map((g) => g.text).join(", ");
    const parsed = parseWithRegex(toParse);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].name).toBe("eggs");
    expect(parsed[0].quantity).toBe(2);
    expect(parsed[1].name).toBe("toast");
    expect(parsed[1].preparation).toBe("with butter");
  });

  it("parses 'Just ate a chicken salad with avocado with olive oil dressing'", () => {
    const cleaned = cleanTranscript(
      "Just ate a chicken salad with avocado with olive oil dressing",
      "voice"
    );
    const groups = groupFoodPhrases(cleaned.cleaned);
    const toParse = groups.map((g) => g.text).join(", ");
    const parsed = parseWithRegex(toParse);
    expect(parsed).toHaveLength(3);
    const names = parsed.map((p: ParsedFoodItem) => p.name);
    expect(names).toContain("chicken salad");
    expect(names).toContain("avocado");
    expect(names).toContain("olive oil dressing");
  });

  it("parses 'had a protein shake with a banana and peanut butter'", () => {
    const cleaned = cleanTranscript(
      "had a protein shake with a banana and peanut butter",
      "voice"
    );
    const groups = groupFoodPhrases(cleaned.cleaned);
    const toParse = groups.map((g) => g.text).join(", ");
    const parsed = parseWithRegex(toParse);
    expect(parsed).toHaveLength(3);
    const names = parsed.map((p: ParsedFoodItem) => p.name);
    expect(names).toContain("protein shake");
    expect(names).toContain("banana");
    expect(names).toContain("peanut butter");
  });
});

// ─── Multi-layer Confidence ─────────────────────────────────────────────────

describe("multi-layer confidence", () => {
  it("buildItemConfidence produces all layers + overall", () => {
    const layers = buildItemConfidence({
      asr: 0.8,
      parse: 0.9,
      grouping: 1.0,
      match: 0.7,
      portion: 0.6,
    });
    expect(layers.asr).toBe(0.8);
    expect(layers.parse).toBe(0.9);
    expect(layers.grouping).toBe(1.0);
    expect(layers.match).toBe(0.7);
    expect(layers.portion).toBe(0.6);
    expect(layers.overall).toBeGreaterThan(0);
    expect(layers.overall).toBeLessThanOrEqual(1);
  });

  it("overall is geometric mean (one low drags it down)", () => {
    const good = buildItemConfidence({
      asr: 0.9,
      parse: 0.9,
      grouping: 0.9,
      match: 0.9,
      portion: 0.9,
    });
    const oneBad = buildItemConfidence({
      asr: 0.9,
      parse: 0.9,
      grouping: 0.9,
      match: 0.2,
      portion: 0.9,
    });
    expect(oneBad.overall).toBeLessThan(good.overall);
  });

  it("buildConfidenceInsight returns meaningful summary for high confidence", () => {
    const layers = buildItemConfidence({
      asr: 0.9,
      parse: 0.9,
      grouping: 1.0,
      match: 0.8,
      portion: 0.8,
    });
    const insight = buildConfidenceInsight("banana", layers, "usda", false);
    expect(insight.summary).toContain("Banana");
    expect(insight.needsClarification).toBe(false);
  });

  it("buildConfidenceInsight flags portion uncertainty", () => {
    const layers = buildItemConfidence({
      asr: 0.9,
      parse: 0.8,
      grouping: 1.0,
      match: 0.7,
      portion: 0.4,
    });
    const insight = buildConfidenceInsight("pasta", layers, "usda", false);
    expect(
      insight.issues.some((i) => i.toLowerCase().includes("portion"))
    ).toBe(true);
  });

  it("buildConfidenceInsight flags merged items for clarification", () => {
    const layers = buildItemConfidence({
      asr: 0.7,
      parse: 0.8,
      grouping: 0.5,
      match: 0.7,
      portion: 0.7,
    });
    const insight = buildConfidenceInsight(
      "smoothie",
      layers,
      "local-fallback",
      true
    );
    expect(insight.needsClarification).toBe(true);
    expect(insight.issues.length).toBeGreaterThan(0);
  });

  it("estimateFoodItem produces confidenceLayers and insight", () => {
    const matched: MatchedFoodItem = {
      parsed: {
        name: "banana",
        quantity: 1,
        unit: "piece",
        preparation: null,
        confidence: 0.85,
        rawFragment: "banana",
      },
      matches: [],
      selectedMatch: {
        source: "local-fallback",
        sourceId: "local_banana",
        name: "banana",
        nutrients: { calories: 105, protein: 1, carbs: 27, fat: 0 },
        servingSize: 120,
        servingUnit: "g",
        servingDescription: "1 medium (120g)",
        matchScore: 0.5,
      },
      matchConfidence: 0.42,
    };

    const estimated = estimateFoodItem(matched, 0.75);
    expect(estimated.confidenceLayers).toBeDefined();
    expect(estimated.confidenceLayers!.asr).toBe(0.75);
    expect(estimated.confidenceLayers!.parse).toBe(0.85);
    expect(estimated.insight).toBeDefined();
    expect(estimated.insight!.summary).toBeTruthy();
  });
});

describe("recipe templates", () => {
  it("finds goulash by canonical name", () => {
    const template = lookupRecipeTemplate("goulash");
    expect(template).not.toBeNull();
    expect(template!.canonical).toBe("goulash");
    expect(template!.caloriesPer100g).toBeGreaterThan(50);
  });

  it("finds goulash by regional alias", () => {
    expect(lookupRecipeTemplate("guláš")).not.toBeNull();
    expect(lookupRecipeTemplate("gulasch")).not.toBeNull();
    expect(lookupRecipeTemplate("gulyas")).not.toBeNull();
  });

  it("finds biryani", () => {
    const template = lookupRecipeTemplate("chicken biryani");
    expect(template).not.toBeNull();
    expect(template!.canonical).toBe("biryani");
  });

  it("builds a recipe match with correct serving calories", () => {
    const template = lookupRecipeTemplate("goulash")!;
    const match = buildRecipeMatch(template, "goulash");
    // 350g serving × 120 kcal/100g = 420 kcal
    expect(match.nutrients.calories).toBe(420);
    expect(match.source).toBe("recipe-template");
    expect(match.servingDescription).toBe("1 bowl (350g)");
  });

  it("covers common regional dishes", () => {
    [
      "goulash",
      "moussaka",
      "biryani",
      "pad thai",
      "jollof rice",
      "shawarma",
      "empanada",
      "shakshuka",
      "ramen",
      "pho",
      "carbonara",
      "bolognese",
    ].forEach((dish) => {
      expect(lookupRecipeTemplate(dish)).not.toBeNull();
    });
  });

  it("returns null for unknown dishes", () => {
    expect(lookupRecipeTemplate("xyzfood123")).toBeNull();
  });
});

// ─── Food Aliases (Multilingual) ─────────────────────────────────────────────

describe("food aliases (multilingual)", () => {
  it("translates Spanish food names", () => {
    expect(translateFoodAlias("pollo")).toEqual({
      translated: "chicken",
      wasTranslated: true,
    });
    expect(translateFoodAlias("arroz")).toEqual({
      translated: "rice",
      wasTranslated: true,
    });
  });

  it("translates French food names", () => {
    expect(translateFoodAlias("poulet")).toEqual({
      translated: "chicken",
      wasTranslated: true,
    });
    expect(translateFoodAlias("fromage")).toEqual({
      translated: "cheese",
      wasTranslated: true,
    });
  });

  it("translates German food names", () => {
    expect(translateFoodAlias("hähnchen")).toEqual({
      translated: "chicken",
      wasTranslated: true,
    });
    expect(translateFoodAlias("käse")).toEqual({
      translated: "cheese",
      wasTranslated: true,
    });
  });

  it("passes through English names unchanged", () => {
    const result = translateFoodAlias("chicken");
    expect(result.wasTranslated).toBe(false);
    expect(result.translated).toBe("chicken");
  });

  it("handles multi-word alias translation", () => {
    const result = translateFoodAlias("café con leche");
    expect(result.wasTranslated).toBe(true);
    expect(result.translated).toBe("latte");
  });

  it("translates individual words in compounds", () => {
    const result = translateFoodAlias("poulet et riz");
    expect(result.wasTranslated).toBe(true);
    // "poulet" → "chicken", "et" unchanged, "riz" → "rice"
    expect(result.translated).toContain("chicken");
    expect(result.translated).toContain("rice");
  });
});

// ─── Evaluation Harness ──────────────────────────────────────────────────────

describe("evaluation harness — ontology + matching accuracy", () => {
  // Tests that specific food queries resolve to reasonable results
  // through the ontology lookup + local matching pipeline

  const evaluationCorpus: {
    input: string;
    expectedOntologyCategory: string | null;
    calorieRange: [number, number]; // acceptable range for local match
    description: string;
  }[] = [
    {
      input: "coffee",
      expectedOntologyCategory: "beverage",
      calorieRange: [0, 10],
      description: "Plain coffee should be near-zero calories",
    },
    {
      input: "banana",
      expectedOntologyCategory: "fruit",
      calorieRange: [80, 130],
      description: "A banana should be ~105 kcal",
    },
    {
      input: "cornflakes",
      expectedOntologyCategory: "grain",
      calorieRange: [100, 200],
      description: "Plain cornflakes should be ~150 kcal per bowl",
    },
    {
      input: "honey cornflakes",
      expectedOntologyCategory: "grain",
      calorieRange: [120, 220],
      description: "Honey cornflakes should NOT match honey condiment",
    },
    {
      input: "goulash",
      expectedOntologyCategory: "meal",
      calorieRange: [300, 600],
      description: "Goulash should have reasonable meal calories",
    },
    {
      input: "chicken",
      expectedOntologyCategory: "protein",
      calorieRange: [150, 350],
      description: "Chicken should match as a protein",
    },
    {
      input: "rice",
      expectedOntologyCategory: "grain",
      calorieRange: [150, 300],
      description: "Rice should match as a grain",
    },
    {
      input: "avocado",
      expectedOntologyCategory: "fruit",
      calorieRange: [150, 350],
      description: "Avocado should match as a fruit",
    },
    {
      input: "cigarettes",
      expectedOntologyCategory: "non-food",
      calorieRange: [0, 0],
      description: "Non-food should have 0 calories",
    },
    {
      input: "protein shake",
      expectedOntologyCategory: "beverage",
      calorieRange: [100, 350],
      description: "Protein shake is a beverage supplement",
    },
  ];

  for (const testCase of evaluationCorpus) {
    it(`${testCase.input}: ${testCase.description}`, () => {
      // Test ontology lookup
      const ontology = lookupOntology(testCase.input);
      if (testCase.expectedOntologyCategory) {
        expect(ontology).not.toBeNull();
        expect(ontology!.category).toBe(testCase.expectedOntologyCategory);
      }

      // Test local matching returns reasonable calories
      const parsed: ParsedFoodItem = {
        name: testCase.input,
        quantity: 1,
        unit: "serving" as const,
        confidence: 0.8,
        rawFragment: testCase.input,
        preparation: null,
      };
      const matched = matchFoodItemLocally(parsed);
      if (matched.selectedMatch) {
        const cal = matched.selectedMatch.nutrients.calories;
        expect(cal).toBeGreaterThanOrEqual(testCase.calorieRange[0]);
        expect(cal).toBeLessThanOrEqual(testCase.calorieRange[1]);
      }
    });
  }
});

// ─── Ontology Lookup Regression ──────────────────────────────────────────────

describe("ontology lookup — compound food priority", () => {
  it("'honey cornflakes' matches grain, not condiment", () => {
    const entry = lookupOntology("honey cornflakes");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("grain");
  });

  it("'chocolate cereal' matches grain", () => {
    const entry = lookupOntology("chocolate cereal");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("grain");
  });

  it("'frosted flakes' matches grain", () => {
    const entry = lookupOntology("frosted flakes");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("grain");
  });

  it("'goulash' matches meal", () => {
    const entry = lookupOntology("goulash");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("meal");
  });

  it("'guláš' synonym matches goulash", () => {
    const entry = lookupOntology("guláš");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("meal");
  });

  it("'schnitzel' matches meal", () => {
    const entry = lookupOntology("schnitzel");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("meal");
  });

  it("'shawarma' matches meal", () => {
    const entry = lookupOntology("shawarma");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("meal");
  });

  it("'honey' alone still matches condiment", () => {
    const entry = lookupOntology("honey");
    expect(entry).not.toBeNull();
    expect(entry!.category).toBe("condiment");
  });
});

// ─── Candidate Ranker — Extra Word Penalty ───────────────────────────────────

describe("candidate ranker — extra word penalty", () => {
  it("penalizes matches with extra qualifying words", () => {
    const plainCornflakes: FoodMatch = {
      source: "usda",
      sourceId: "usda_1",
      name: "Corn Flakes",
      nutrients: { calories: 150, protein: 2, carbs: 36, fat: 0 },
      servingSize: 40,
      servingUnit: "g",
      servingDescription: "1 cup (40g)",
      matchScore: 0,
    };
    const chocolateCornflakes: FoodMatch = {
      source: "usda",
      sourceId: "usda_2",
      name: "Milk Chocolate Coated Cornflakes",
      nutrients: { calories: 700, protein: 5, carbs: 80, fat: 30 },
      servingSize: 100,
      servingUnit: "g",
      servingDescription: "100g",
      matchScore: 0,
    };

    const parsed: ParsedFoodItem = {
      name: "cornflakes",
      quantity: 1,
      unit: "serving" as const,
      confidence: 0.8,
      rawFragment: "cornflakes",
      preparation: null,
    };

    const routing = routeSource(parsed);
    const ranked = rankCandidates(
      [chocolateCornflakes, plainCornflakes],
      parsed,
      routing
    );

    // Plain cornflakes should rank higher than chocolate coated
    expect(ranked[0].name).toBe("Corn Flakes");
  });

  it("uses ontology calorie anchor to penalize wildly off results", () => {
    const genericCereal: FoodMatch = {
      source: "usda",
      sourceId: "usda_3",
      name: "Cereal",
      nutrients: { calories: 180, protein: 4, carbs: 38, fat: 2 },
      servingSize: 40,
      servingUnit: "g",
      servingDescription: "1 cup (40g)",
      matchScore: 0,
    };
    const weirdCereal: FoodMatch = {
      source: "usda",
      sourceId: "usda_4",
      name: "Cereal, chocolate coated puffs",
      nutrients: { calories: 500, protein: 3, carbs: 70, fat: 20 },
      servingSize: 100,
      servingUnit: "g",
      servingDescription: "100g",
      matchScore: 0,
    };

    const parsed: ParsedFoodItem = {
      name: "cereal",
      quantity: 1,
      unit: "serving" as const,
      confidence: 0.8,
      rawFragment: "cereal",
      preparation: null,
    };

    const routing = routeSource(parsed);
    const ranked = rankCandidates(
      [weirdCereal, genericCereal],
      parsed,
      routing
    );

    // Generic cereal (180 cal, close to ontology 150) should beat
    // chocolate puffs (500 cal, way off) — the single-word filter removes
    // compound names entirely, leaving only the plain match
    expect(ranked[0].name).toBe("Cereal");
    expect(ranked.length).toBe(1);
  });

  it("ranks plain 'omelette' above 'cheesy omelette' for query 'omelette'", () => {
    const plain: FoodMatch = {
      source: "dataset",
      sourceId: "d_1",
      name: "Omelette",
      nutrients: { calories: 250, protein: 16, carbs: 2, fat: 20 },
      servingSize: 150,
      servingUnit: "g",
      servingDescription: "1 omelette (150g)",
      matchScore: 0,
    };
    const cheesy: FoodMatch = {
      source: "dataset",
      sourceId: "d_2",
      name: "Cheesy Omelette",
      nutrients: { calories: 300, protein: 18, carbs: 3, fat: 24 },
      servingSize: 150,
      servingUnit: "g",
      servingDescription: "1 omelette (150g)",
      matchScore: 0,
    };
    const spanish: FoodMatch = {
      source: "dataset",
      sourceId: "d_3",
      name: "Spanish Omelette With Peppers",
      nutrients: { calories: 280, protein: 14, carbs: 8, fat: 20 },
      servingSize: 200,
      servingUnit: "g",
      servingDescription: "1 omelette (200g)",
      matchScore: 0,
    };

    const parsed: ParsedFoodItem = {
      name: "omelette",
      quantity: 1,
      unit: "serving" as const,
      confidence: 0.75,
      rawFragment: "omelette",
      preparation: null,
    };

    const routing = routeSource(parsed);
    const ranked = rankCandidates([cheesy, spanish, plain], parsed, routing);

    expect(ranked[0].name).toBe("Omelette");
    expect(ranked[0].matchScore).toBeGreaterThan(ranked[1].matchScore);
  });

  it("single-word query 'egg' filters out compound names like 'egg mcmuffin'", () => {
    const plain: FoodMatch = {
      source: "usda",
      sourceId: "u_1",
      name: "Egg",
      nutrients: { calories: 78, protein: 6, carbs: 1, fat: 5 },
      servingSize: 50,
      servingUnit: "g",
      servingDescription: "1 large egg (50g)",
      matchScore: 0,
    };
    const compound: FoodMatch = {
      source: "usda",
      sourceId: "u_2",
      name: "Egg McMuffin With Cheese",
      nutrients: { calories: 300, protein: 17, carbs: 30, fat: 12 },
      servingSize: 135,
      servingUnit: "g",
      servingDescription: "1 sandwich",
      matchScore: 0,
    };
    const threeWord: FoodMatch = {
      source: "usda",
      sourceId: "u_3",
      name: "Scrambled Eggs With Cheese",
      nutrients: { calories: 200, protein: 14, carbs: 3, fat: 15 },
      servingSize: 100,
      servingUnit: "g",
      servingDescription: "100g",
      matchScore: 0,
    };
    const twoWord: FoodMatch = {
      source: "usda",
      sourceId: "u_4",
      name: "Boiled Egg",
      nutrients: { calories: 78, protein: 6, carbs: 1, fat: 5 },
      servingSize: 50,
      servingUnit: "g",
      servingDescription: "1 egg",
      matchScore: 0,
    };

    const parsed: ParsedFoodItem = {
      name: "egg",
      quantity: 1,
      unit: "serving" as const,
      confidence: 0.8,
      rawFragment: "egg",
      preparation: null,
    };

    const routing = routeSource(parsed);
    const ranked = rankCandidates(
      [compound, threeWord, plain, twoWord],
      parsed,
      routing
    );

    // Compound 3+ word names should be filtered out for a single-word query
    const names = ranked.map((r) => r.name);
    expect(names).not.toContain("Egg McMuffin With Cheese");
    expect(names).not.toContain("Scrambled Eggs With Cheese");
    // Plain "Egg" and 2-word "Boiled Egg" should remain
    expect(names).toContain("Egg");
    expect(names).toContain("Boiled Egg");
    // Plain exact match should be ranked first
    expect(ranked[0].name).toBe("Egg");
  });
});

// ─── Clarification Triggers ──────────────────────────────────────────────────

describe("clarification triggers", () => {
  it("flags cereal as needing clarification", () => {
    const layers = buildItemConfidence({
      asr: 0.9,
      parse: 0.8,
      grouping: 0.9,
      match: 0.7,
      portion: 0.6,
    });
    const insight = buildConfidenceInsight("cornflakes", layers, "usda", false);
    expect(
      insight.issues.some((i) => i.includes("Cereal") || i.includes("cereal"))
    ).toBe(true);
  });

  it("flags smoothie as needing clarification", () => {
    const layers = buildItemConfidence({
      asr: 0.9,
      parse: 0.8,
      grouping: 0.9,
      match: 0.7,
      portion: 0.6,
    });
    const insight = buildConfidenceInsight("smoothie", layers, "usda", false);
    expect(
      insight.issues.some((i) => i.toLowerCase().includes("smoothie"))
    ).toBe(true);
  });

  it("does not flag simple items", () => {
    const layers = buildItemConfidence({
      asr: 0.9,
      parse: 0.9,
      grouping: 0.9,
      match: 0.9,
      portion: 0.9,
    });
    const insight = buildConfidenceInsight("banana", layers, "usda", false);
    // banana is not in any clarification trigger category
    expect(insight.issues.length).toBe(0);
  });
});

// ─── Food Emoji Mapping ─────────────────────────────────────────────────────

describe("getFoodEmoji", () => {
  it("maps common foods to correct emoji", () => {
    expect(getFoodEmoji("banana")).toBe("🍌");
    expect(getFoodEmoji("apple")).toBe("🍎");
    expect(getFoodEmoji("coffee")).toBe("☕");
    expect(getFoodEmoji("chicken breast")).toBe("🍗");
    expect(getFoodEmoji("pizza")).toBe("🍕");
    expect(getFoodEmoji("rice")).toBe("🍚");
    expect(getFoodEmoji("egg")).toBe("🥚");
    expect(getFoodEmoji("beer")).toBe("🍺");
  });

  it("maps cereal/breakfast items to bowl emoji", () => {
    expect(getFoodEmoji("cornflakes")).toBe("🥣");
    expect(getFoodEmoji("oatmeal")).toBe("🥣");
    expect(getFoodEmoji("granola")).toBe("🥣");
    expect(getFoodEmoji("porridge")).toBe("🥣");
  });

  it("handles case-insensitive matching", () => {
    expect(getFoodEmoji("BANANA")).toBe("🍌");
    expect(getFoodEmoji("Coffee")).toBe("☕");
    expect(getFoodEmoji("PIZZA")).toBe("🍕");
  });

  it("uses category fallback for unknown foods", () => {
    expect(getFoodEmoji("some weird fruit", "fruit")).toBe("🍎");
    expect(getFoodEmoji("exotic meat", "protein")).toBe("🍗");
    expect(getFoodEmoji("mystery vegetable", "vegetable")).toBe("🥦");
  });

  it("returns default plate emoji for completely unknown foods", () => {
    expect(getFoodEmoji("xyzzy_unknown")).toBe("🍽️");
    expect(getFoodEmoji("xyzzy_unknown", null)).toBe("🍽️");
  });

  it("matches substring foods correctly", () => {
    expect(getFoodEmoji("grilled salmon fillet")).toBe("🐟");
    expect(getFoodEmoji("chocolate chip cookie")).toBe("🍪");
    expect(getFoodEmoji("strawberry smoothie")).toBe("🍓");
  });
});

describe("getMealEmoji", () => {
  it("picks emoji from highest-calorie item", () => {
    const emoji = getMealEmoji([
      { name: "chicken breast", calories: 300 },
      { name: "rice", calories: 200 },
      { name: "broccoli", calories: 50 },
    ]);
    expect(emoji).toBe("🍗");
  });

  it("returns default for empty items", () => {
    expect(getMealEmoji([])).toBe("🍽️");
  });

  it("handles single item", () => {
    expect(getMealEmoji([{ name: "banana", calories: 105 }])).toBe("🍌");
  });
});

// ─── Emoji in Pipeline Integration ──────────────────────────────────────────

describe("emoji in estimation pipeline", () => {
  it("estimateFoodItem includes emoji field", () => {
    const match: MatchedFoodItem = {
      parsed: {
        name: "banana",
        quantity: 1,
        unit: "piece",
        preparation: null,
        confidence: 0.9,
        rawFragment: "a banana",
      },
      matches: [
        {
          source: "local-fallback",
          sourceId: "local_banana",
          name: "Banana, raw",
          nutrients: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
          servingSize: 118,
          servingUnit: "g",
          servingDescription: "1 medium banana (118g)",
          matchScore: 0.9,
        },
      ],
      selectedMatch: {
        source: "local-fallback",
        sourceId: "local_banana",
        name: "Banana, raw",
        nutrients: { calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
        servingSize: 118,
        servingUnit: "g",
        servingDescription: "1 medium banana (118g)",
        matchScore: 0.9,
      },
      matchConfidence: 0.9,
    };
    const result = estimateFoodItem(match);
    expect(result.emoji).toBeDefined();
    expect(result.emoji).toBe("🍌");
  });

  it("mealEstimateToDraft includes emoji field", () => {
    const matched: MatchedFoodItem = {
      parsed: {
        name: "coffee",
        quantity: 1,
        unit: "cup",
        preparation: null,
        confidence: 0.9,
        rawFragment: "a coffee",
      },
      matches: [
        {
          source: "local-fallback",
          sourceId: "local_coffee",
          name: "Coffee, brewed",
          nutrients: { calories: 2, protein: 0.3, carbs: 0, fat: 0 },
          servingSize: 237,
          servingUnit: "ml",
          servingDescription: "1 cup (237ml)",
          matchScore: 0.9,
        },
      ],
      selectedMatch: {
        source: "local-fallback",
        sourceId: "local_coffee",
        name: "Coffee, brewed",
        nutrients: { calories: 2, protein: 0.3, carbs: 0, fat: 0 },
        servingSize: 237,
        servingUnit: "ml",
        servingDescription: "1 cup (237ml)",
        matchScore: 0.9,
      },
      matchConfidence: 0.9,
    };
    const estimate = estimateMeal([matched], "a coffee", "text", "regex");
    const draft = mealEstimateToDraft(estimate);
    expect(draft.emoji).toBeDefined();
    expect(draft.emoji).toBe("☕");
  });
});

// ─── Singularization ─────────────────────────────────────────────────────────

describe("singularize", () => {
  it("handles regular plurals", () => {
    expect(singularize("eggs")).toBe("egg");
    expect(singularize("bananas")).toBe("banana");
    expect(singularize("steaks")).toBe("steak");
    expect(singularize("apples")).toBe("apple");
    expect(singularize("carrots")).toBe("carrot");
  });

  it("handles -ies plurals", () => {
    expect(singularize("berries")).toBe("berry");
    expect(singularize("cherries")).toBe("cherry");
    expect(singularize("strawberries")).toBe("strawberry");
    expect(singularize("blueberries")).toBe("blueberry");
    expect(singularize("raspberries")).toBe("raspberry");
  });

  it("handles -oes plurals", () => {
    expect(singularize("potatoes")).toBe("potato");
    expect(singularize("tomatoes")).toBe("tomato");
  });

  it("handles -ches/-shes plurals", () => {
    expect(singularize("sandwiches")).toBe("sandwich");
    expect(singularize("peaches")).toBe("peach");
  });

  it("does NOT singularize mass nouns", () => {
    expect(singularize("hummus")).toBe("hummus");
    expect(singularize("couscous")).toBe("couscous");
    expect(singularize("asparagus")).toBe("asparagus");
    expect(singularize("quinoa")).toBe("quinoa");
    expect(singularize("tofu")).toBe("tofu");
    expect(singularize("pasta")).toBe("pasta");
    expect(singularize("ramen")).toBe("ramen");
    expect(singularize("sushi")).toBe("sushi");
  });

  it("does NOT singularize -ss words", () => {
    expect(singularize("grass")).toBe("grass");
    expect(singularize("swiss")).toBe("swiss");
  });

  it("handles short/empty words", () => {
    expect(singularize("")).toBe("");
    expect(singularize("go")).toBe("go");
    expect(singularize("egg")).toBe("egg");
  });
});

// ─── Per-food Calorie Sanity Check ──────────────────────────────────────────

describe("isCaloriePlausibleForFood", () => {
  it("accepts egg within expected range", () => {
    expect(isCaloriePlausibleForFood("egg", 70)).toBe(true);
    expect(isCaloriePlausibleForFood("egg", 140)).toBe(true);
  });

  it("rejects egg with wildly high calories (e.g. egg noodles)", () => {
    expect(isCaloriePlausibleForFood("egg", 512)).toBe(false);
    expect(isCaloriePlausibleForFood("eggs", 512)).toBe(false);
    expect(isCaloriePlausibleForFood("egg", 1024)).toBe(false);
  });

  it("handles plural forms via singularization", () => {
    expect(isCaloriePlausibleForFood("eggs", 70)).toBe(true);
    expect(isCaloriePlausibleForFood("bananas", 105)).toBe(true);
    expect(isCaloriePlausibleForFood("steaks", 300)).toBe(true);
  });

  it("accepts unknown foods (no expectation data)", () => {
    expect(isCaloriePlausibleForFood("unicorn fruit", 500)).toBe(true);
    expect(isCaloriePlausibleForFood("xyz123", 9999)).toBe(true);
  });

  it("rejects banana at 500+ cal", () => {
    expect(isCaloriePlausibleForFood("banana", 500)).toBe(false);
  });

  it("rejects broccoli at 300+ cal", () => {
    expect(isCaloriePlausibleForFood("broccoli", 300)).toBe(false);
  });

  it("accepts pizza in normal range", () => {
    expect(isCaloriePlausibleForFood("pizza", 300)).toBe(true);
    expect(isCaloriePlausibleForFood("pizza", 450)).toBe(true);
  });
});

// ─── Plural Local Match (the original "2 eggs = 1024 cal" bug) ──────────────

describe("plural local matching", () => {
  it('"eggs" matches local egg entry with high confidence', () => {
    const result = matchFoodItemLocally({
      name: "eggs",
      quantity: 2,
      unit: "piece",
      confidence: 0.85,
      rawFragment: "2 eggs",
      preparation: null,
    });
    // Should match "egg" from LOCAL_FOODS, not fall through to a wrong API match
    expect(result.selectedMatch).toBeDefined();
    expect(result.selectedMatch!.name.toLowerCase()).toContain("egg");
    // 2 eggs ≈ 140 cal (LOCAL_FOODS.egg = 140 cal / 2 eggs serving)
    // The important thing is it should NOT be 1024 cal
    expect(result.selectedMatch!.nutrients.calories).toBeLessThan(300);
  });

  it('"bananas" matches local banana entry', () => {
    const result = matchFoodItemLocally({
      name: "bananas",
      quantity: 1,
      unit: "piece",
      confidence: 0.85,
      rawFragment: "bananas",
      preparation: null,
    });
    expect(result.selectedMatch).toBeDefined();
    expect(result.selectedMatch!.name.toLowerCase()).toContain("banana");
  });

  it('"steaks" matches local steak entry', () => {
    const result = matchFoodItemLocally({
      name: "steaks",
      quantity: 1,
      unit: "piece",
      confidence: 0.85,
      rawFragment: "steaks",
      preparation: null,
    });
    expect(result.selectedMatch).toBeDefined();
    expect(result.selectedMatch!.name.toLowerCase()).toContain("steak");
  });
});

// ─── Compound Food Matching (filled wraps, modifiers) ────────────────────────

describe("Compound food substring matching prefers longest key", () => {
  it('"chicken wrap" matches "chicken wrap" not plain "wrap"', () => {
    const result = matchFoodItemLocally({
      name: "chicken wrap",
      quantity: 1,
      unit: "piece",
      confidence: 0.85,
      rawFragment: "chicken wrap",
      preparation: null,
    });
    expect(result.selectedMatch).toBeDefined();
    expect(result.selectedMatch!.name).toBe("chicken wrap");
    expect(result.selectedMatch!.nutrients.calories).toBeGreaterThan(400);
  });

  it('"beef wrap" matches "beef wrap" not "wrap" or "beef"', () => {
    const result = matchFoodItemLocally({
      name: "beef wrap",
      quantity: 1,
      unit: "piece",
      confidence: 0.85,
      rawFragment: "beef wrap",
      preparation: null,
    });
    expect(result.selectedMatch).toBeDefined();
    expect(result.selectedMatch!.name).toBe("beef wrap");
    expect(result.selectedMatch!.nutrients.calories).toBeGreaterThan(400);
  });

  it('"falafel wrap" matches "falafel wrap" not "falafel"', () => {
    const result = matchFoodItemLocally({
      name: "falafel wrap",
      quantity: 1,
      unit: "piece",
      confidence: 0.85,
      rawFragment: "falafel wrap",
      preparation: null,
    });
    expect(result.selectedMatch).toBeDefined();
    expect(result.selectedMatch!.name).toBe("falafel wrap");
    expect(result.selectedMatch!.nutrients.calories).toBeGreaterThan(400);
  });

  it('"plain wrap" still matches "wrap" (flour tortilla)', () => {
    const result = matchFoodItemLocally({
      name: "wrap",
      quantity: 1,
      unit: "piece",
      confidence: 0.85,
      rawFragment: "wrap",
      preparation: null,
    });
    expect(result.selectedMatch).toBeDefined();
    expect(result.selectedMatch!.name).toBe("wrap");
    expect(result.selectedMatch!.nutrients.calories).toBe(200);
  });

  it('"grilled chicken wrap" uses chicken wrap ontology with user qualifier', () => {
    const result = matchFoodItemLocally({
      name: "grilled chicken wrap",
      quantity: 1,
      unit: "piece",
      confidence: 0.85,
      rawFragment: "grilled chicken wrap",
      preparation: "grilled",
    });
    expect(result.selectedMatch).toBeDefined();
    // Ontology preserves the user's qualifier "grilled" in display name
    expect(result.selectedMatch!.name).toBe("grilled chicken wrap");
    // Calories should come from the "chicken wrap" ontology entry (480 cal)
    expect(result.selectedMatch!.nutrients.calories).toBe(480);
  });

  it('"french fries" matches "french fries" not "fries"', () => {
    const result = matchFoodItemLocally({
      name: "french fries",
      quantity: 1,
      unit: "serving",
      confidence: 0.85,
      rawFragment: "french fries",
      preparation: null,
    });
    expect(result.selectedMatch).toBeDefined();
    // Should match "french fries" (13 chars) over "fries" (5 chars)
    expect(result.selectedMatch!.name).toBe("french fries");
  });
});
