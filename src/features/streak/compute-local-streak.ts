/**
 * Derives streak Zustand state from local nutrition store (no network).
 */

import { toLocalDate } from "../../lib/utils/date";
import { isPostFoodLogSettling } from "../food-logging/post-food-log-settling";
import { resolveMealLoggedDateLocal } from "../food-logging/time/create-meal-timestamp-fields";
import { useNutritionStore } from "../nutrition/nutrition.store";
import {
  computeCurrentStreakFromMeals,
  getLoggedMealDates,
  getMostRecentLoggedMealDate,
  getStreakStartDateForCurrentStreak,
} from "./streak-from-meals";
import { useStreakStore } from "./streak.store";

/**
 * Compute streak from local meal data (no network needed).
 * Skipped during post–food-log settling except when `force` is true.
 */
export function computeLocalStreakFromStores(options?: {
  force?: boolean;
}): void {
  if (!options?.force && isPostFoodLogSettling()) {
    if (__DEV__) {
      console.log(
        "[Streak] computeLocalStreak skipped (post-food-log settling)"
      );
    }
    return;
  }

  const meals = useNutritionStore.getState().meals;
  const currentInfo = useStreakStore.getState();

  if (meals.length === 0) {
    useStreakStore.getState().setStreak({
      currentStreak: 0,
      longestStreak: currentInfo.longestStreak,
      lastLogDate: null,
      streakStartDate: null,
    });
    return;
  }

  const loggedDates = getLoggedMealDates(meals);
  const streak = computeCurrentStreakFromMeals(meals);
  const lastLoggedDay = getMostRecentLoggedMealDate(meals);
  const streakStart =
    streak > 0 ? getStreakStartDateForCurrentStreak(meals, streak) : null;

  if (__DEV__) {
    const today = toLocalDate();
    const sortedDates = [...loggedDates].sort();
    console.warn(
      `[Streak] computeLocalStreak: today=${today}, totalMeals=${meals.length}, loggedDates=[${sortedDates.join(", ")}], streak=${streak}, lastLog=${lastLoggedDay}`
    );
    const samples = meals
      .slice(0, 8)
      .map((m) => `${m.loggedAt} → ${resolveMealLoggedDateLocal(m)}`);
    console.warn(`[Streak] meal samples: ${samples.join(" | ")}`);
  }

  useStreakStore.getState().setStreak({
    currentStreak: streak,
    longestStreak: Math.max(streak, currentInfo.longestStreak),
    lastLogDate: lastLoggedDay,
    streakStartDate: streakStart,
  });
}
