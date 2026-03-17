/**
 * Portion Size Detection Tests
 *
 * TDD tests for production-quality portion parsing that handles
 * natural language portion descriptions like "four medium sized eggs".
 *
 * Covers:
 * 1. Size qualifier extraction from text input
 * 2. Size-aware portion weight estimation
 * 3. End-to-end quantity × size × nutrition calculation
 */
import { parseWithRegex } from "../src/features/nutrition/parsing/regex-parser";

// ─── 2. Size-Aware Portion Estimation ────────────────────────────────────────

import { estimateFoodItem } from "../src/features/nutrition/estimation/portion-estimator.service";
import type { MatchedFoodItem } from "../src/features/nutrition/matching/matching.types";

// ─── 1. Size Qualifier Extraction ────────────────────────────────────────────

describe("Size qualifier extraction", () => {
  it("extracts size from 'four medium sized eggs'", () => {
    const items = parseWithRegex("four medium sized eggs");
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(4);
    expect(items[0].name).toBe("eggs");
    expect(items[0].sizeQualifier).toBe("medium");
    expect(items[0].unit).toBe("piece");
  });

  it("extracts size from '2 large bananas'", () => {
    const items = parseWithRegex("2 large bananas");
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(items[0].name).toBe("bananas");
    expect(items[0].sizeQualifier).toBe("large");
    expect(items[0].unit).toBe("piece");
  });

  it("extracts size from '3 small apples'", () => {
    const items = parseWithRegex("3 small apples");
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
    expect(items[0].name).toBe("apples");
    expect(items[0].sizeQualifier).toBe("small");
  });

  it("extracts size from 'one large egg'", () => {
    const items = parseWithRegex("one large egg");
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(1);
    expect(items[0].name).toBe("egg");
    expect(items[0].sizeQualifier).toBe("large");
  });

  it("handles 'medium' without 'sized'", () => {
    const items = parseWithRegex("3 medium eggs");
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
    expect(items[0].name).toBe("eggs");
    expect(items[0].sizeQualifier).toBe("medium");
  });

  it("returns undefined sizeQualifier when no size is given", () => {
    const items = parseWithRegex("2 eggs");
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(2);
    expect(items[0].name).toBe("eggs");
    expect(items[0].sizeQualifier).toBeUndefined();
  });

  it("handles 'extra large' as 'large'", () => {
    const items = parseWithRegex("2 extra large eggs");
    expect(items).toHaveLength(1);
    expect(items[0].sizeQualifier).toBe("large");
    expect(items[0].name).toBe("eggs");
  });

  it("does NOT strip size from compound food names", () => {
    // "large fries" should NOT extract "large" as a size — it's a menu size
    // But "large banana" should. We handle this by only extracting size
    // when it precedes a known countable/portionable food.
    const items = parseWithRegex("a medium coffee");
    expect(items).toHaveLength(1);
    // Coffee isn't a sized countable item — "medium" stays in the name
    expect(items[0].name).toBe("medium coffee");
    expect(items[0].sizeQualifier).toBeUndefined();
  });

  it("handles multi-item input with sizes", () => {
    const items = parseWithRegex("3 large eggs and 2 small bananas");
    expect(items).toHaveLength(2);
    expect(items[0].quantity).toBe(3);
    expect(items[0].name).toBe("eggs");
    expect(items[0].sizeQualifier).toBe("large");
    expect(items[1].quantity).toBe(2);
    expect(items[1].name).toBe("bananas");
    expect(items[1].sizeQualifier).toBe("small");
  });
});

function makeMatchedItem(overrides: {
  name: string;
  quantity: number;
  unit?: string;
  sizeQualifier?: "small" | "medium" | "large";
  servingSize?: number;
  caloriesPer100g?: number;
}): MatchedFoodItem {
  const servingSize = overrides.servingSize ?? 100;
  const calPer100 = overrides.caloriesPer100g ?? 155; // egg-like
  const scale = servingSize / 100;
  const match = {
    source: "usda" as const,
    sourceId: "test-123",
    name: overrides.name,
    nutrients: {
      calories: Math.round(calPer100 * scale),
      protein: Math.round(13 * scale * 10) / 10,
      carbs: Math.round(1.1 * scale * 10) / 10,
      fat: Math.round(11 * scale * 10) / 10,
    },
    servingSize,
    servingUnit: "g",
    servingDescription: `1 ${overrides.name}`,
    matchScore: 0.95,
  };
  return {
    parsed: {
      name: overrides.name,
      quantity: overrides.quantity,
      unit: (overrides.unit ?? "piece") as any,
      preparation: null,
      confidence: 0.9,
      rawFragment: `${overrides.quantity} ${overrides.name}`,
      sizeQualifier: overrides.sizeQualifier,
    },
    matches: [match],
    selectedMatch: match,
    matchConfidence: 0.95,
  };
}

describe("Size-aware portion estimation", () => {
  it("uses medium egg weight (50g) for '4 medium eggs'", () => {
    const matched = makeMatchedItem({
      name: "egg",
      quantity: 4,
      sizeQualifier: "medium",
      servingSize: 50, // DB serving = 1 medium egg
      caloriesPer100g: 155,
    });

    const result = estimateFoodItem(matched);
    // 4 medium eggs × 50g each = 200g total
    // DB serving is 50g → 4 servings
    // 155 cal / 100g × 50g per serving = 77.5 cal/serving → rounds to 78 × 4 = 312
    expect(result.estimatedServings).toBe(4);
    expect(result.nutrients.calories).toBe(312);
  });

  it("uses large egg weight (56g) for '4 large eggs'", () => {
    const matched = makeMatchedItem({
      name: "egg",
      quantity: 4,
      sizeQualifier: "large",
      servingSize: 50,
      caloriesPer100g: 155,
    });

    const result = estimateFoodItem(matched);
    // 4 large eggs × 56g each = 224g total
    // estimateServings = (4 * 56) / 50 = 4.48
    expect(result.estimatedServings).toBeCloseTo(4.48, 1);
    // 155 cal/100g × (224/100) = 347 cal
    expect(result.nutrients.calories).toBeCloseTo(347, -1);
  });

  it("uses small egg weight (38g) for '4 small eggs'", () => {
    const matched = makeMatchedItem({
      name: "egg",
      quantity: 4,
      sizeQualifier: "small",
      servingSize: 50,
      caloriesPer100g: 155,
    });

    const result = estimateFoodItem(matched);
    // 4 small eggs × 38g each = 152g total
    // estimateServings = (4 * 38) / 50 = 3.04
    expect(result.estimatedServings).toBeCloseTo(3.04, 1);
  });

  it("uses default weight when no size qualifier is given", () => {
    const matched = makeMatchedItem({
      name: "egg",
      quantity: 4,
      servingSize: 50,
      caloriesPer100g: 155,
    });

    const result = estimateFoodItem(matched);
    // 4 eggs × 50g default = 200g total → 4 servings
    expect(result.estimatedServings).toBe(4);
  });

  it("handles large bananas correctly", () => {
    const matched = makeMatchedItem({
      name: "banana",
      quantity: 2,
      sizeQualifier: "large",
      servingSize: 118, // DB serving = 1 medium banana
      caloriesPer100g: 89,
    });

    const result = estimateFoodItem(matched);
    // 2 large bananas × 136g each = 272g total
    // estimateServings = (2 * 136) / 118 = 2.305
    expect(result.estimatedServings).toBeCloseTo(2.31, 1);
  });

  it("handles small apples correctly", () => {
    const matched = makeMatchedItem({
      name: "apple",
      quantity: 3,
      sizeQualifier: "small",
      servingSize: 182,
      caloriesPer100g: 52,
    });

    const result = estimateFoodItem(matched);
    // 3 small apples × 150g each = 450g total
    // estimateServings = (3 * 150) / 182 = 2.47
    expect(result.estimatedServings).toBeCloseTo(2.47, 1);
  });
});

// ─── 3. End-to-End: Parse → Estimate ─────────────────────────────────────────

describe("End-to-end portion pipeline", () => {
  it("parses 'four medium sized eggs' with correct sizeQualifier", () => {
    const items = parseWithRegex("four medium sized eggs");
    expect(items).toHaveLength(1);

    const parsed = items[0];
    expect(parsed.quantity).toBe(4);
    expect(parsed.sizeQualifier).toBe("medium");
    expect(parsed.name).toBe("eggs");

    // Now estimate with the parsed result
    const eggMatch = {
      source: "usda" as const,
      sourceId: "egg-123",
      name: "Egg, whole, raw",
      nutrients: { calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3 },
      servingSize: 50,
      servingUnit: "g",
      servingDescription: "1 large egg (50g)",
      matchScore: 0.92,
    };
    const matched: MatchedFoodItem = {
      parsed,
      matches: [eggMatch],
      selectedMatch: eggMatch,
      matchConfidence: 0.92,
    };

    const result = estimateFoodItem(matched);
    // 4 medium eggs × 50g = 200g → 4 servings
    expect(result.estimatedServings).toBe(4);
    expect(result.nutrients.calories).toBe(312); // 78 × 4
  });

  it("parses '2 large bananas' with correct calorie scaling", () => {
    const items = parseWithRegex("2 large bananas");
    const parsed = items[0];

    const bananaMatch = {
      source: "usda" as const,
      sourceId: "banana-456",
      name: "Banana, raw",
      nutrients: { calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
      servingSize: 118, // 1 medium banana
      servingUnit: "g",
      servingDescription: "1 medium banana (118g)",
      matchScore: 0.95,
    };
    const matched: MatchedFoodItem = {
      parsed,
      matches: [bananaMatch],
      selectedMatch: bananaMatch,
      matchConfidence: 0.95,
    };

    const result = estimateFoodItem(matched);
    // 2 × 136g (large) / 118g (serving) = 2.305 servings
    // 105 cal × 2.305 = ~242 cal
    expect(result.nutrients.calories).toBeGreaterThan(230);
    expect(result.nutrients.calories).toBeLessThan(250);
  });
});
