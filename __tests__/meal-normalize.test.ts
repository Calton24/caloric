import { computeCurrentStreakFromMeals } from "../src/features/streak/streak-from-meals";
import {
  buildBarcodeEstimatedFoodItem,
  isRenderableConfirmMealPayload,
  normalizeMealDraftForStorage,
  normalizeNutrientProfile,
  toSafeNumber,
} from "../src/features/nutrition/meal-normalize";
import type { MealDraft } from "../src/features/nutrition/nutrition.draft.types";
import type { MealEntry } from "../src/features/nutrition/nutrition.types";
import {
  getMealsForDate,
  getNutritionTotals,
} from "../src/features/nutrition/nutrition.selectors";

describe("meal-normalize", () => {
  it("toSafeNumber parses strings and rejects NaN", () => {
    expect(toSafeNumber("120 kcal", 0)).toBe(120);
    expect(toSafeNumber("12,5", 0)).toBe(12.5);
    expect(toSafeNumber(Number.NaN, 7)).toBe(7);
    expect(toSafeNumber(Number.POSITIVE_INFINITY, 7)).toBe(7);
    expect(toSafeNumber(-3, 0)).toBe(0);
  });

  it("normalizeNutrientProfile fills missing fields with zeros", () => {
    expect(normalizeNutrientProfile({})).toEqual({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: undefined,
      sugar: undefined,
      sodium: undefined,
    });
  });

  it("buildBarcodeEstimatedFoodItem always has parsed + nutrients", () => {
    const item = buildBarcodeEstimatedFoodItem({
      productName: "Test Bar",
      barcode: "1234567890123",
      matchSource: "openfoodfacts",
      nutrients: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    });
    expect(item.parsed.name).toBeTruthy();
    expect(item.needsUserConfirmation).toBe(true);
    expect(item.nutrients.calories).toBe(0);
  });

  it("normalizeMealDraftForStorage fixes barcode title and items", () => {
    const draft: MealDraft = {
      title: "",
      source: "barcode",
      rawInput: "barcode: 123",
      calories: Number.NaN as unknown as number,
      protein: "2" as unknown as number,
      carbs: undefined as unknown as number,
      fat: null as unknown as number,
      parseMethod: "barcode-lookup",
      estimatedItems: [
        buildBarcodeEstimatedFoodItem({
          productName: "",
          barcode: "123",
          matchSource: "dataset",
          nutrients: { calories: 10, protein: 1, carbs: 2, fat: 3 },
        }),
      ],
    };
    const n = normalizeMealDraftForStorage(draft);
    expect(n.title.length).toBeGreaterThan(0);
    expect(n.calories).toBe(10);
    expect(n.protein).toBe(1);
    expect(n.estimatedItems?.[0].parsed).toBeTruthy();
  });

  it("isRenderableConfirmMealPayload rejects empty title or bad macros", () => {
    const base: MealDraft = {
      title: "Test Bar",
      source: "barcode",
      rawInput: "barcode: 123",
      calories: 100,
      protein: 1,
      carbs: 2,
      fat: 3,
      confidence: 1,
      parseMethod: "barcode-lookup",
      estimatedItems: [
        buildBarcodeEstimatedFoodItem({
          productName: "Test Bar",
          barcode: "1234567890123",
          matchSource: "openfoodfacts",
          nutrients: { calories: 100, protein: 1, carbs: 2, fat: 3 },
        }),
      ],
    };
    expect(isRenderableConfirmMealPayload(base)).toBe(true);
    expect(isRenderableConfirmMealPayload({ ...base, title: "  " })).toBe(
      false
    );
    expect(
      isRenderableConfirmMealPayload({
        ...base,
        calories: Number.NaN as unknown as number,
      })
    ).toBe(false);
    expect(
      isRenderableConfirmMealPayload({
        ...base,
        estimatedItems: [
          {
            ...base.estimatedItems![0],
            matchedName: "",
          },
        ],
      })
    ).toBe(false);
  });
});

describe("nutrition selectors tolerate malformed meals", () => {
  const meals: MealEntry[] = [
    {
      id: "1",
      title: "ok",
      source: "manual",
      calories: 100,
      protein: 1,
      carbs: 2,
      fat: 3,
      loggedAt: "2026-05-07T12:00:00.000Z",
    },
    {
      id: "2",
      title: "bad",
      source: "barcode",
      calories: Number.NaN as unknown as number,
      protein: undefined as unknown as number,
      carbs: Number.NaN as unknown as number,
      fat: 1,
      loggedAt: "not-a-date",
    },
  ];

  it("getNutritionTotals ignores NaN via safe getters", () => {
    const t = getNutritionTotals(meals);
    expect(Number.isFinite(t.calories)).toBe(true);
    expect(Number.isFinite(t.protein)).toBe(true);
  });

  it("getMealsForDate drops invalid loggedAt", () => {
    const badOnly: MealEntry[] = [meals[1]];
    expect(getMealsForDate(badOnly, "2026-05-07")).toEqual([]);
  });

  it("streak ignores invalid meal dates", () => {
    const streak = computeCurrentStreakFromMeals(meals);
    expect(streak).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(streak)).toBe(true);
  });
});
