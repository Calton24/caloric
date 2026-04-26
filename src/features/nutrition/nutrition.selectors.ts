import { toLocalDate } from "../../lib/utils/date";
import { DailyNutritionSummary, MealEntry } from "./nutrition.types";

/**
 * Get all meals logged on a specific local date (YYYY-MM-DD).
 * Converts meal timestamps from UTC to local timezone before comparison
 * to handle meals logged near midnight in different timezones.
 */
export function getMealsForDate(meals: MealEntry[], date: string): MealEntry[] {
  return meals.filter((meal) => {
    // Convert UTC timestamp to local date (YYYY-MM-DD)
    const mealLocalDate = toLocalDate(new Date(meal.loggedAt));
    return mealLocalDate === date;
  });
}

export function getNutritionTotals(meals: MealEntry[]) {
  return meals.reduce(
    (acc, meal) => {
      acc.calories += meal.calories;
      acc.protein += meal.protein;
      acc.carbs += meal.carbs;
      acc.fat += meal.fat;
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
