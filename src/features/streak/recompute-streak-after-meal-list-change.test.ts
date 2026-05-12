import { endPostFoodLogSettling } from "../food-logging/post-food-log-settling";
import type { MealEntry } from "../nutrition/nutrition.types";
import { useNutritionStore } from "../nutrition/nutrition.store";
import { toISODate } from "../../lib/utils/date";
import { useStreakStore } from "./streak.store";
import { recomputeStreakAfterMealListChange } from "./recompute-streak-after-meal-list-change";

function todayMeal(id: string): MealEntry {
  const today = toISODate(new Date());
  const loggedAt = new Date().toISOString();
  return {
    id,
    title: "Test",
    source: "manual",
    calories: 100,
    protein: 10,
    carbs: 10,
    fat: 5,
    loggedAt,
    loggedAtUtc: loggedAt,
    loggedDateLocal: today,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

describe("recomputeStreakAfterMealListChange", () => {
  beforeEach(() => {
    endPostFoodLogSettling();
    useNutritionStore.setState({
      meals: [],
      deletedMealIds: [],
      syncedMealIds: [],
    });
    useStreakStore.setState({
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null,
      streakStartDate: null,
      streakFreezeAvailable: false,
      streakFreezeUsed: false,
    });
  });

  it("sets a non-zero streak when a meal is logged for today", () => {
    useNutritionStore.setState({ meals: [todayMeal("meal_today")] });

    recomputeStreakAfterMealListChange("food_logged");

    expect(useStreakStore.getState().currentStreak).toBeGreaterThanOrEqual(1);
  });

  it("does not leave streak at 0 after simulating local repository hydrate", () => {
    useNutritionStore.setState({ meals: [todayMeal("meal_hydrate")] });

    recomputeStreakAfterMealListChange("local_repository_hydrated");

    expect(useStreakStore.getState().currentStreak).toBeGreaterThanOrEqual(1);
  });
});
