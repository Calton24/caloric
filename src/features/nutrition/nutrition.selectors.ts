import { DailyNutritionSummary, MealEntry } from "./nutrition.types";

export function getMealsForDate(meals: MealEntry[], date: string): MealEntry[] {
  return meals.filter((meal) => meal.loggedAt.startsWith(date));
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
