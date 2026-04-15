/**
 * Daily Insights Service
 *
 * Generates contextual insights by comparing today's meals against
 * historical data: yesterday, same day last week, and recent patterns.
 *
 * Pure functions — no side effects, no store access.
 */

import { toISODate } from "../../lib/utils/date";
import { getMealsForDate, getNutritionTotals } from "./nutrition.selectors";
import type { MealEntry } from "./nutrition.types";

// ─── Types ───────────────────────────────────────────────────────────────────

export type InsightKind =
  | "pacing" // "You're 300 cal ahead of yesterday at this hour"
  | "yesterday" // "Yesterday you ate 2,100 cal total"
  | "last-week" // "Same day last week: 1,950 cal"
  | "similar-meal" // "Similar to your chicken salad on Tuesday"
  | "streak"; // "3-day logging streak!"

export interface DailyInsight {
  kind: InsightKind;
  icon: string; // Ionicons name
  message: string;
  /** Secondary detail (optional) */
  detail?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Get calories logged before a given hour on a specific date */
function caloriesBeforeHour(meals: MealEntry[], hour: number): number {
  return meals
    .filter((m) => {
      const h = new Date(m.loggedAt).getHours();
      return h < hour;
    })
    .reduce((sum, m) => sum + m.calories, 0);
}

/** Day of week label: "Monday", "Tuesday", etc. */
function dayLabel(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

/** Normalize title for comparison */
function normTitle(title: string): string {
  return title.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Jaccard similarity on word sets */
function wordSimilarity(a: string, b: string): number {
  const setA = new Set(normTitle(a).split(" "));
  const setB = new Set(normTitle(b).split(" "));
  const intersection = new Set([...setA].filter((w) => setB.has(w)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// ─── Insight Generators ──────────────────────────────────────────────────────

function pacingInsight(
  allMeals: MealEntry[],
  todayDate: string,
  currentHour: number
): DailyInsight | null {
  const yesterdayDate = shiftDate(todayDate, -1);
  const yesterdayMeals = getMealsForDate(allMeals, yesterdayDate);
  if (yesterdayMeals.length === 0) return null;

  const todayMeals = getMealsForDate(allMeals, todayDate);
  const todaySoFar = caloriesBeforeHour(todayMeals, 24); // all of today
  const yesterdaySameTime = caloriesBeforeHour(yesterdayMeals, currentHour);

  if (yesterdaySameTime === 0) return null;

  const diff = Math.round(todaySoFar - yesterdaySameTime);
  const absDiff = Math.abs(diff);

  if (absDiff < 50) return null; // not worth showing

  const direction = diff > 0 ? "ahead of" : "behind";
  return {
    kind: "pacing",
    icon: diff > 0 ? "trending-up-outline" : "trending-down-outline",
    message: `${absDiff} cal ${direction} yesterday at this time`,
    detail: `Yesterday by ${currentHour}:00 → ${Math.round(yesterdaySameTime)} cal`,
  };
}

function yesterdayInsight(
  allMeals: MealEntry[],
  todayDate: string
): DailyInsight | null {
  const yesterdayDate = shiftDate(todayDate, -1);
  const yesterdayMeals = getMealsForDate(allMeals, yesterdayDate);
  if (yesterdayMeals.length === 0) return null;

  const totals = getNutritionTotals(yesterdayMeals);
  return {
    kind: "yesterday",
    icon: "calendar-outline",
    message: `Yesterday: ${Math.round(totals.calories)} cal`,
    detail: `${Math.round(totals.protein)}P · ${Math.round(totals.carbs)}C · ${Math.round(totals.fat)}F`,
  };
}

function lastWeekInsight(
  allMeals: MealEntry[],
  todayDate: string
): DailyInsight | null {
  const lastWeekDate = shiftDate(todayDate, -7);
  const lastWeekMeals = getMealsForDate(allMeals, lastWeekDate);
  if (lastWeekMeals.length === 0) return null;

  const totals = getNutritionTotals(lastWeekMeals);
  const day = dayLabel(lastWeekDate);
  return {
    kind: "last-week",
    icon: "repeat-outline",
    message: `Last ${day}: ${Math.round(totals.calories)} cal`,
    detail: `${Math.round(totals.protein)}P · ${Math.round(totals.carbs)}C · ${Math.round(totals.fat)}F`,
  };
}

function similarMealInsight(
  allMeals: MealEntry[],
  todayDate: string
): DailyInsight | null {
  const todayMeals = getMealsForDate(allMeals, todayDate);
  if (todayMeals.length === 0) return null;

  // Look at the most recent meal logged today
  const latest = todayMeals[todayMeals.length - 1];

  // Search past 14 days (excluding today) for a similar meal
  let bestMatch: { meal: MealEntry; date: string; similarity: number } | null =
    null;

  for (let d = 1; d <= 14; d++) {
    const pastDate = shiftDate(todayDate, -d);
    const pastMeals = getMealsForDate(allMeals, pastDate);
    for (const pm of pastMeals) {
      const sim = wordSimilarity(latest.title, pm.title);
      if (sim >= 0.5 && (!bestMatch || sim > bestMatch.similarity)) {
        bestMatch = { meal: pm, date: pastDate, similarity: sim };
      }
    }
  }

  if (!bestMatch) return null;

  const day = dayLabel(bestMatch.date);
  const calDiff = Math.round(latest.calories - bestMatch.meal.calories);
  const calNote =
    Math.abs(calDiff) < 20
      ? "same calories"
      : calDiff > 0
        ? `${calDiff} cal more this time`
        : `${Math.abs(calDiff)} cal less this time`;

  return {
    kind: "similar-meal",
    icon: "sparkles-outline",
    message: `Similar to your "${bestMatch.meal.title}" on ${day}`,
    detail: `${Math.round(bestMatch.meal.calories)} cal then — ${calNote}`,
  };
}

function streakInsight(
  allMeals: MealEntry[],
  todayDate: string
): DailyInsight | null {
  let streak = 0;
  let checkDate = todayDate;

  // Count consecutive days with at least 1 meal (including today)
  for (let i = 0; i < 365; i++) {
    const dayMeals = getMealsForDate(allMeals, checkDate);
    if (dayMeals.length === 0) break;
    streak++;
    checkDate = shiftDate(checkDate, -1);
  }

  if (streak < 2) return null;

  return {
    kind: "streak",
    icon: "flame-outline",
    message: `${streak}-day logging streak!`,
    detail: streak >= 7 ? "Keep it going!" : undefined,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Generate daily insights from meal history.
 * Returns up to 3 most relevant insights, prioritized by kind.
 */
export function generateDailyInsights(
  allMeals: MealEntry[],
  todayDate: string,
  currentHour?: number
): DailyInsight[] {
  const hour = currentHour ?? new Date().getHours();

  // Generate all possible insights
  const candidates: (DailyInsight | null)[] = [
    similarMealInsight(allMeals, todayDate),
    pacingInsight(allMeals, todayDate, hour),
    streakInsight(allMeals, todayDate),
    lastWeekInsight(allMeals, todayDate),
    yesterdayInsight(allMeals, todayDate),
  ];

  // Filter nulls, take top 3
  return candidates.filter((c): c is DailyInsight => c !== null).slice(0, 3);
}
