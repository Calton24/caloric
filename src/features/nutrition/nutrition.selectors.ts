import { resolveMealLoggedDateLocal } from "../food-logging/time/create-meal-timestamp-fields";
import { DailyNutritionSummary, MealEntry } from "./nutrition.types";
import {
  getMealCalories,
  getMealCarbs,
  getMealFat,
  getMealProtein,
  isValidMealLoggedAt,
} from "./meal-normalize";

/** Aggregated macros for one local calendar day (from `getDailyNutritionTotalsMap`). */
export interface DailyNutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Single-pass index: local YYYY-MM-DD → summed macros for that day.
 * Avoids O(days × meals) when building multi-day charts (progress, insights).
 */
export function getDailyNutritionTotalsMap(
  meals: MealEntry[]
): Map<string, DailyNutritionTotals> {
  const map = new Map<string, DailyNutritionTotals>();
  for (const meal of meals) {
    if (!meal || !isValidMealLoggedAt(meal.loggedAt)) continue;
    const date = resolveMealLoggedDateLocal(meal);
    let row = map.get(date);
    if (!row) {
      row = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      map.set(date, row);
    }
    row.calories += getMealCalories(meal);
    row.protein += getMealProtein(meal);
    row.carbs += getMealCarbs(meal);
    row.fat += getMealFat(meal);
  }
  return map;
}

/**
 * Get all meals logged on a specific local date (YYYY-MM-DD).
 * Converts meal timestamps from UTC to local timezone before comparison
 * to handle meals logged near midnight in different timezones.
 */
export function getMealsForDate(meals: MealEntry[], date: string): MealEntry[] {
  return meals.filter((meal) => {
    if (!meal || !isValidMealLoggedAt(meal.loggedAt)) return false;
    return resolveMealLoggedDateLocal(meal) === date;
  });
}

export function getNutritionTotals(meals: MealEntry[]) {
  return meals.filter(Boolean).reduce(
    (acc, meal) => {
      acc.calories += getMealCalories(meal);
      acc.protein += getMealProtein(meal);
      acc.carbs += getMealCarbs(meal);
      acc.fat += getMealFat(meal);
      return acc;
    },
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }
  );
}

export function getDailyNutritionSummary(
  allMeals: MealEntry[],
  date: string
): DailyNutritionSummary {
  const meals = getMealsForDate(allMeals, date);
  const totals = getNutritionTotals(meals);

  return {
    date,
    meals,
    totalCalories: totals.calories,
    totalProtein: totals.protein,
    totalCarbs: totals.carbs,
    totalFat: totals.fat,
  };
}
