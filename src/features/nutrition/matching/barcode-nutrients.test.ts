import {
  hasUsableBarcodeNutrients,
  normalizeBarcodeNutrients,
} from "./barcode-nutrients";

describe("hasUsableBarcodeNutrients", () => {
  it("returns false for all-zero barcode nutrients", () => {
    expect(
      hasUsableBarcodeNutrients({
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      })
    ).toBe(false);
  });

  it("returns true when calories are present", () => {
    expect(
      hasUsableBarcodeNutrients({
        calories: 156,
        protein: 6,
        carbs: 18,
        fat: 4,
      })
    ).toBe(true);
  });

  it("returns true when calories are zero but macros are present", () => {
    expect(
      hasUsableBarcodeNutrients({
        calories: 0,
        protein: 2.1,
        carbs: 8.5,
        fat: 1.2,
      })
    ).toBe(true);
  });
});

describe("normalizeBarcodeNutrients", () => {
  it("derives calories from macros when missing", () => {
    const normalized = normalizeBarcodeNutrients({
      calories: 0,
      protein: 8,
      carbs: 12,
      fat: 0,
    });
    expect(normalized.calories).toBe(80);
  });

  it("keeps source calories when already present", () => {
    const normalized = normalizeBarcodeNutrients({
      calories: 156,
      protein: 8,
      carbs: 12,
      fat: 4,
    });
    expect(normalized.calories).toBe(156);
  });
});

