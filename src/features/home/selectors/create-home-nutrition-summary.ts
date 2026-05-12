import {
  resolveMealLoggedAtUtc,
  resolveMealLoggedDateLocal,
} from "../../food-logging/time/create-meal-timestamp-fields";
import type { MealEntry } from "../../nutrition/nutrition.types";
import {
  getMealCalories,
  getMealCarbs,
  getMealFat,
  getMealProtein,
} from "../../nutrition/meal-normalize";

export type HomeMealPreview = {
  id: string;
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedAt: string;
};

export type HomeNutritionSummary = {
  /** Local date key (YYYY-MM-DD) this summary is for — typically the Home selected day. */
  today: string;
  totalCalories: number;
  goalCalories: number;
  mealCount: number;
  /** All meals for the day (stable list for grouping / edit flows). */
  meals: MealEntry[];
  /** First rows for compact widgets; still guarded. */
  latestMeals: HomeMealPreview[];
  macros: {
    protein: number;
    carbs: number;
    fat: number;
  };
};

function safeMacroSum(meals: MealEntry[], key: "protein" | "carbs" | "fat"): number {
  return meals.reduce((sum, meal) => {
    if (!meal) return sum;
    const v =
      key === "protein"
        ? getMealProtein(meal)
        : key === "carbs"
          ? getMealCarbs(meal)
          : getMealFat(meal);
    const n = Number(v);
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}

function toHomeMealPreview(meal: MealEntry | null | undefined): HomeMealPreview | null {
  if (!meal?.id) return null;
  return {
    id: meal.id,
    title: typeof meal.title === "string" ? meal.title : "",
    calories: getMealCalories(meal),
    protein: getMealProtein(meal),
    carbs: getMealCarbs(meal),
    fat: getMealFat(meal),
    loggedAt: resolveMealLoggedAtUtc(meal),
  };
}

/**
 * Guarded aggregate for Home — avoids NaN propagation and null meals from taking down the tree.
 */
export function createHomeNutritionSummary(
  meals: MealEntry[],
  today: string,
  goalCalories: number
): HomeNutritionSummary {
  const safeMeals = Array.isArray(meals) ? meals.filter(Boolean) : [];

  const todayMeals = safeMeals.filter((meal) => {
    try {
      return resolveMealLoggedDateLocal(meal) === today;
    } catch {
      return false;
    }
  });

  const totalCalories = todayMeals.reduce((sum, meal) => {
    const calories = getMealCalories(meal);
    const n = Number(calories);
    return sum + (Number.isFinite(n) ? Math.max(0, n) : 0);
  }, 0);

  const previews = todayMeals
    .slice(0, 10)
    .map(toHomeMealPreview)
    .filter((m): m is HomeMealPreview => m != null);

  return {
    today,
    totalCalories,
    goalCalories:
      Number.isFinite(goalCalories) && goalCalories > 0 ? goalCalories : 2000,
    mealCount: todayMeals.length,
    meals: todayMeals,
    latestMeals: previews,
    macros: {
      protein: safeMacroSum(todayMeals, "protein"),
      carbs: safeMacroSum(todayMeals, "carbs"),
      fat: safeMacroSum(todayMeals, "fat"),
    },
  };
}
