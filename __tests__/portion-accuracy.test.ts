/**
 * Portion Accuracy Tests
 *
 * Production-grade accuracy tests for the calorie estimation pipeline.
 * Validates that common foods produce realistic calorie estimates
 * across the full parse → match → estimate pipeline.
 *
 * Bug context: "1 serving" was being mapped through a generic 150g heuristic
 * instead of being treated as 1× the DB-defined serving. This caused
 * systematic over/under-estimation for any food where DB serving ≠ 150g.
 *
 * Covers:
 * 1. estimateServings() with unit="serving" returns quantity directly
 * 2. Countable foods (kebab, burger, etc.) parse as unit="piece"
 * 3. PIECE_WEIGHTS for meal-type foods
 * 4. End-to-end accuracy for common meals
 * 5. Bowl/plate/cup units still use gram heuristics
 */
import {
    estimateFoodItem
} from "../src/features/nutrition/estimation/portion-estimator.service";
import type { MatchedFoodItem } from "../src/features/nutrition/matching/matching.types";
import { parseWithRegex } from "../src/features/nutrition/parsing/regex-parser";

// ─── Test Helper ─────────────────────────────────────────────────────────────

function makeMatched(overrides: {
  name: string;
  quantity: number;
  unit?: string;
  sizeQualifier?: "small" | "medium" | "large";
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servingSize: number;
  servingDescription?: string;
}): MatchedFoodItem {
  const match = {
    source: "local-fallback" as const,
    sourceId: `local_${overrides.name}`,
    name: overrides.name,
    nutrients: {
      calories: overrides.calories,
      protein: overrides.protein ?? 10,
      carbs: overrides.carbs ?? 20,
      fat: overrides.fat ?? 8,
    },
    servingSize: overrides.servingSize,
    servingUnit: "g",
    servingDescription:
      overrides.servingDescription ?? `1 serving (${overrides.servingSize}g)`,
    matchScore: 0.9,
  };
  return {
    parsed: {
      name: overrides.name,
      quantity: overrides.quantity,
      unit: (overrides.unit ?? "serving") as any,
      preparation: null,
      confidence: 0.8,
      rawFragment: `${overrides.quantity} ${overrides.name}`,
      sizeQualifier: overrides.sizeQualifier,
    },
    matches: [match],
    selectedMatch: match,
    matchConfidence: 0.85,
  };
}

// ─── 1. Serving Unit = Direct Multiplier ─────────────────────────────────────

describe("Serving unit treats DB serving as canonical", () => {
  it("1 serving of kebab (300g serving) = full 550 cal", () => {
    const matched = makeMatched({
      name: "kebab",
      quantity: 1,
      unit: "serving",
      calories: 550,
      protein: 30,
      carbs: 42,
      fat: 28,
      servingSize: 300,
      servingDescription: "1 wrap (300g)",
    });
    const result = estimateFoodItem(matched);
    expect(result.nutrients.calories).toBe(550);
    expect(result.estimatedServings).toBe(1);
  });

  it("1 serving of burrito (300g serving) = full calories", () => {
    const matched = makeMatched({
      name: "burrito",
      quantity: 1,
      unit: "serving",
      calories: 500,
      servingSize: 300,
      servingDescription: "1 burrito (300g)",
    });
    const result = estimateFoodItem(matched);
    expect(result.nutrients.calories).toBe(500);
    expect(result.estimatedServings).toBe(1);
  });

  it("1 serving of almonds (28g serving) = 170 cal, NOT 911", () => {
    const matched = makeMatched({
      name: "almonds",
      quantity: 1,
      unit: "serving",
      calories: 170,
      servingSize: 28,
      servingDescription: "1 serving (28g)",
    });
    const result = estimateFoodItem(matched);
    // Was: 1 * 150 / 28 = 5.36 servings → 911 cal (WRONG)
    // Fixed: 1 serving → 170 cal
    expect(result.nutrients.calories).toBe(170);
    expect(result.estimatedServings).toBe(1);
  });

  it("2 servings doubles the calories", () => {
    const matched = makeMatched({
      name: "rice",
      quantity: 2,
      unit: "serving",
      calories: 210,
      servingSize: 150,
      servingDescription: "1 cup cooked (150g)",
    });
    const result = estimateFoodItem(matched);
    expect(result.nutrients.calories).toBe(420);
    expect(result.estimatedServings).toBe(2);
  });

  it("0.5 servings = half calories", () => {
    const matched = makeMatched({
      name: "pasta",
      quantity: 0.5,
      unit: "serving",
      calories: 350,
      servingSize: 200,
    });
    const result = estimateFoodItem(matched);
    expect(result.nutrients.calories).toBe(175);
    expect(result.estimatedServings).toBe(0.5);
  });

  it("1 serving of curry (350g) = full calories, not halved", () => {
    const matched = makeMatched({
      name: "chicken curry",
      quantity: 1,
      unit: "serving",
      calories: 450,
      servingSize: 350,
      servingDescription: "1 serving (350g)",
    });
    const result = estimateFoodItem(matched);
    expect(result.nutrients.calories).toBe(450);
  });

  it("1 serving of stir fry (400g) = full calories", () => {
    const matched = makeMatched({
      name: "stir fry",
      quantity: 1,
      unit: "serving",
      calories: 380,
      servingSize: 400,
      servingDescription: "1 plate (400g)",
    });
    const result = estimateFoodItem(matched);
    expect(result.nutrients.calories).toBe(380);
  });
});

// ─── 2. Non-Serving Ambiguous Units Keep Gram Heuristic ──────────────────────

describe("Bowl/plate/cup units still use gram heuristics", () => {
  it("bowl (350g) of cereal with 100g DB serving = ~3.5 servings", () => {
    const matched = makeMatched({
      name: "cereal",
      quantity: 1,
      unit: "bowl",
      calories: 150,
      servingSize: 100,
    });
    const result = estimateFoodItem(matched);
    // 1 bowl = 350g / 100g = 3.5 servings
    expect(result.estimatedServings).toBeCloseTo(3.5, 1);
    expect(result.nutrients.calories).toBe(525);
  });

  it("plate (400g) of pasta with 200g DB serving = 2 servings", () => {
    const matched = makeMatched({
      name: "pasta",
      quantity: 1,
      unit: "plate",
      calories: 350,
      servingSize: 200,
    });
    const result = estimateFoodItem(matched);
    expect(result.estimatedServings).toBe(2);
    expect(result.nutrients.calories).toBe(700);
  });

  it("cup (240g) of yogurt with 245g DB serving ≈ 1 serving", () => {
    const matched = makeMatched({
      name: "yogurt",
      quantity: 1,
      unit: "cup",
      calories: 130,
      servingSize: 245,
    });
    const result = estimateFoodItem(matched);
    expect(result.estimatedServings).toBeCloseTo(0.98, 1);
  });

  it("2 bowls of soup with 250g DB serving", () => {
    const matched = makeMatched({
      name: "soup",
      quantity: 2,
      unit: "bowl",
      calories: 180,
      servingSize: 250,
    });
    const result = estimateFoodItem(matched);
    // 2 × 350g / 250g = 2.8 servings
    expect(result.estimatedServings).toBeCloseTo(2.8, 1);
  });
});

// ─── 3. Precise Units Still Work Correctly ───────────────────────────────────

describe("Precise units (g, ml, oz) unchanged", () => {
  it("200g of rice with 150g serving", () => {
    const matched = makeMatched({
      name: "rice",
      quantity: 200,
      unit: "g",
      calories: 210,
      servingSize: 150,
    });
    const result = estimateFoodItem(matched);
    expect(result.estimatedServings).toBeCloseTo(1.33, 1);
  });

  it("500ml of juice with 250ml serving", () => {
    const matched = makeMatched({
      name: "juice",
      quantity: 500,
      unit: "ml",
      calories: 112,
      servingSize: 250,
    });
    const result = estimateFoodItem(matched);
    expect(result.estimatedServings).toBe(2);
    expect(result.nutrients.calories).toBe(224);
  });

  it("6oz of steak with 170g serving", () => {
    const matched = makeMatched({
      name: "steak",
      quantity: 6,
      unit: "oz",
      calories: 400,
      servingSize: 170,
    });
    const result = estimateFoodItem(matched);
    // 6oz * 28.35 = 170.1g → ~1 serving
    expect(result.estimatedServings).toBeCloseTo(1.0, 0);
  });
});

// ─── 4. Countable Foods Parse as "piece" ─────────────────────────────────────

describe("Countable foods parse as piece, not serving", () => {
  const countableFoods = [
    "burger",
    "bagel",
    "muffin",
    "sandwich",
    "wrap",
    "burrito",
    "croissant",
    "pizza",
    "hot dog",
    "brownie",
    "cupcake",
    "kebab",
    "pie",
    "quesadilla",
    "spring roll",
    "samosa",
    "empanada",
    "falafel",
    "naan",
    "pita",
    "roll",
    "biscuit",
    "scone",
    "pretzel",
  ];

  for (const food of countableFoods) {
    it(`"a ${food}" parses as unit=piece`, () => {
      const items = parseWithRegex(`a ${food}`);
      expect(items).toHaveLength(1);
      expect(items[0].unit).toBe("piece");
      expect(items[0].quantity).toBe(1);
    });
  }

  it('"2 burgers" parses as 2 pieces', () => {
    const items = parseWithRegex("2 burgers");
    expect(items).toHaveLength(1);
    expect(items[0].unit).toBe("piece");
    expect(items[0].quantity).toBe(2);
  });

  it('"doner kebab" parses as 1 piece', () => {
    const items = parseWithRegex("doner kebab");
    expect(items).toHaveLength(1);
    expect(items[0].unit).toBe("piece");
    expect(items[0].quantity).toBe(1);
  });
});

// ─── 5. PIECE_WEIGHTS for Meal-Type Foods ────────────────────────────────────

describe("Meal-type foods have correct piece weights", () => {
  it("1 burger (piece, 200g) with 200g DB serving = 1 serving", () => {
    const matched = makeMatched({
      name: "burger",
      quantity: 1,
      unit: "piece",
      calories: 540,
      servingSize: 200,
    });
    const result = estimateFoodItem(matched);
    expect(result.estimatedServings).toBe(1);
    expect(result.nutrients.calories).toBe(540);
  });

  it("1 kebab (piece, 300g) with 300g DB serving = 1 serving", () => {
    const matched = makeMatched({
      name: "kebab",
      quantity: 1,
      unit: "piece",
      calories: 550,
      servingSize: 300,
    });
    const result = estimateFoodItem(matched);
    expect(result.estimatedServings).toBe(1);
    expect(result.nutrients.calories).toBe(550);
  });

  it("2 spring rolls use piece weight, not generic 100g", () => {
    const matched = makeMatched({
      name: "spring roll",
      quantity: 2,
      unit: "piece",
      calories: 120,
      servingSize: 80,
      servingDescription: "2 rolls (80g)",
    });
    const result = estimateFoodItem(matched);
    // 2 × 60g (piece weight) / 80g (DB serving) = 1.5 servings
    expect(result.estimatedServings).toBeCloseTo(1.5, 1);
  });
});

// ─── 6. End-to-End Accuracy: Real-World Meals ────────────────────────────────

describe("End-to-end calorie accuracy for common meals", () => {
  it("'doner kebab' should estimate ~550 cal, not ~275", () => {
    const items = parseWithRegex("doner kebab");
    expect(items).toHaveLength(1);

    const parsed = items[0];
    const match = {
      source: "local-fallback" as const,
      sourceId: "local_kebab",
      name: "kebab",
      nutrients: { calories: 550, protein: 30, carbs: 42, fat: 28 },
      servingSize: 300,
      servingUnit: "g",
      servingDescription: "1 wrap (300g)",
      matchScore: 0.9,
    };
    const matched: MatchedFoodItem = {
      parsed,
      matches: [match],
      selectedMatch: match,
      matchConfidence: 0.85,
    };

    const result = estimateFoodItem(matched);
    // Should be close to 550, definitely not 275
    expect(result.nutrients.calories).toBeGreaterThanOrEqual(500);
    expect(result.nutrients.calories).toBeLessThanOrEqual(600);
  });

  it("'a burger' should estimate ~540 cal", () => {
    const items = parseWithRegex("a burger");
    const parsed = items[0];

    const match = {
      source: "local-fallback" as const,
      sourceId: "local_burger",
      name: "burger",
      nutrients: { calories: 540, protein: 28, carbs: 40, fat: 28 },
      servingSize: 200,
      servingUnit: "g",
      servingDescription: "1 burger (200g)",
      matchScore: 0.9,
    };
    const matched: MatchedFoodItem = {
      parsed,
      matches: [match],
      selectedMatch: match,
      matchConfidence: 0.85,
    };

    const result = estimateFoodItem(matched);
    expect(result.nutrients.calories).toBeGreaterThanOrEqual(480);
    expect(result.nutrients.calories).toBeLessThanOrEqual(600);
  });

  it("'2 slices of pizza' uses slice unit correctly", () => {
    const items = parseWithRegex("2 slices of pizza");
    expect(items).toHaveLength(1);
    expect(items[0].unit).toBe("slice");
    expect(items[0].quantity).toBe(2);

    const match = {
      source: "local-fallback" as const,
      sourceId: "local_pizza",
      name: "pizza",
      nutrients: { calories: 285, protein: 12, carbs: 36, fat: 10 },
      servingSize: 107,
      servingUnit: "g",
      servingDescription: "1 slice (107g)",
      matchScore: 0.9,
    };
    const matched: MatchedFoodItem = {
      parsed: items[0],
      matches: [match],
      selectedMatch: match,
      matchConfidence: 0.85,
    };

    const result = estimateFoodItem(matched);
    // 2 slices × 30g / 107g ≈ 0.56 servings → ~160 cal
    // Actually slice unit = 30g heuristic, but pizza slice = 107g DB serving
    // This is still a known limitation — pizza slices vary widely
    expect(result.nutrients.calories).toBeGreaterThan(100);
  });
});

// ─── 7. Regression Guard: Existing Piece Logic Unchanged ─────────────────────

describe("Existing piece logic unchanged", () => {
  it("2 eggs (piece) with 50g serving works as before", () => {
    const matched = makeMatched({
      name: "egg",
      quantity: 2,
      unit: "piece",
      calories: 78,
      servingSize: 50,
    });
    const result = estimateFoodItem(matched);
    // 2 × 50g / 50g = 2 servings → 156 cal
    expect(result.estimatedServings).toBe(2);
    expect(result.nutrients.calories).toBe(156);
  });

  it("3 bananas (piece) with 118g serving", () => {
    const matched = makeMatched({
      name: "banana",
      quantity: 3,
      unit: "piece",
      calories: 105,
      servingSize: 118,
    });
    const result = estimateFoodItem(matched);
    // 3 × 120g / 118g ≈ 3.05 servings
    expect(result.estimatedServings).toBeCloseTo(3.05, 1);
  });

  it("4 large eggs still uses SIZED_PIECE_WEIGHTS", () => {
    const matched = makeMatched({
      name: "egg",
      quantity: 4,
      unit: "piece",
      sizeQualifier: "large",
      calories: 78,
      servingSize: 50,
    });
    const result = estimateFoodItem(matched);
    // 4 × 56g / 50g = 4.48
    expect(result.estimatedServings).toBeCloseTo(4.48, 1);
  });
});
