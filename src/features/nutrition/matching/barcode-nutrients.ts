import type { NutrientProfile } from "./matching.types";

/**
 * Guard against low-quality barcode rows that resolve with all-zero nutrients.
 * We treat "0 kcal and all macros 0" as unusable and force a fallback lookup.
 */
export function hasUsableBarcodeNutrients(
  nutrients: NutrientProfile | null | undefined
): boolean {
  if (!nutrients) return false;
  const calories = Number(nutrients.calories ?? 0);
  const protein = Number(nutrients.protein ?? 0);
  const carbs = Number(nutrients.carbs ?? 0);
  const fat = Number(nutrients.fat ?? 0);

  const hasAnyFiniteValue =
    Number.isFinite(calories) ||
    Number.isFinite(protein) ||
    Number.isFinite(carbs) ||
    Number.isFinite(fat);
  if (!hasAnyFiniteValue) return false;

  // Main failure mode from dataset noise: every key resolves to 0.
  return calories > 0 || protein > 0 || carbs > 0 || fat > 0;
}

/**
 * Some sources return 0/empty calories while macros are present.
 * In those cases derive calories from macros so Track Calories
 * never lands on an obviously wrong 0 kcal draft.
 */
export function normalizeBarcodeNutrients(
  nutrients: NutrientProfile
): NutrientProfile {
  const protein = Number.isFinite(Number(nutrients.protein))
    ? Number(nutrients.protein)
    : 0;
  const carbs = Number.isFinite(Number(nutrients.carbs))
    ? Number(nutrients.carbs)
    : 0;
  const fat = Number.isFinite(Number(nutrients.fat))
    ? Number(nutrients.fat)
    : 0;
  const calories = Number.isFinite(Number(nutrients.calories))
    ? Number(nutrients.calories)
    : 0;

  if (calories > 0) return nutrients;

  const derivedCalories = Math.round(protein * 4 + carbs * 4 + fat * 9);
  if (derivedCalories <= 0) return nutrients;

  return {
    ...nutrients,
    calories: derivedCalories,
  };
}

