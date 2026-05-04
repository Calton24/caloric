/**
 * Meal-derived streak metrics — single source of truth for "consecutive days
 * logged" so Progress week dots, headline count, and Zustand stay aligned.
 */

import { toLocalDate } from "../../lib/utils/date";
import type { MealEntry } from "../nutrition/nutrition.types";

function mealLocalDate(loggedAt: string): string {
  return toLocalDate(new Date(loggedAt));
}

export function getLoggedMealDates(meals: MealEntry[]): Set<string> {
  const dates = new Set<string>();
  for (const m of meals) {
    dates.add(mealLocalDate(m.loggedAt));
  }
  return dates;
}

/** Latest calendar day (YYYY-MM-DD) that has at least one meal. */
export function getMostRecentLoggedMealDate(meals: MealEntry[]): string | null {
  if (meals.length === 0) return null;
  let max: string | null = null;
  for (const m of meals) {
    const d = mealLocalDate(m.loggedAt);
    if (max == null || d > max) max = d;
  }
  return max;
}

/**
 * Consecutive logging streak: walk backward from today; if today has no meals,
 * walk backward from yesterday (streak still alive until end of today).
 * Missing yesterday (with no log today) resets the streak — matches week UX.
 */
export function computeCurrentStreakFromMeals(meals: MealEntry[]): number {
  if (meals.length === 0) return 0;
  const loggedDates = getLoggedMealDates(meals);

  let streak = 0;
  const check = new Date();
  while (true) {
    const dateStr = toLocalDate(check);
    if (!loggedDates.has(dateStr)) break;
    streak++;
    check.setDate(check.getDate() - 1);
  }

  if (streak === 0) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const check2 = new Date(yesterday);
    while (true) {
      const dateStr = toLocalDate(check2);
      if (!loggedDates.has(dateStr)) break;
      streak++;
      check2.setDate(check2.getDate() - 1);
    }
  }

  return streak;
}

/** First calendar day of the current consecutive chain (requires streak > 0). */
export function getStreakStartDateForCurrentStreak(
  meals: MealEntry[],
  streak: number
): string | null {
  if (streak <= 0 || meals.length === 0) return null;
  const lastIso = getMostRecentLoggedMealDate(meals);
  if (lastIso == null) return null;
  const end = new Date(`${lastIso}T12:00:00`);
  const start = new Date(end);
  start.setDate(start.getDate() - (streak - 1));
  return toLocalDate(start);
}
