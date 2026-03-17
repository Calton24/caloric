/**
 * Nutrition Trends Service
 *
 * Aggregates daily calorie & macro data for charting on the Progress screen.
 * Mirrors the progress-shaping.service pattern (Week / Month / Year segments).
 */

import { getMealsForDate, getNutritionTotals } from "./nutrition.selectors";
import { MealEntry } from "./nutrition.types";

export interface NutritionChartPoint {
  label: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionStats {
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  daysLogged: number;
  daysTotal: number;
}

// ── Helpers ────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getDatesInRange(startDate: Date, endDate: Date): string[] {
  const dates: string[] = [];
  const d = new Date(startDate);
  while (d <= endDate) {
    dates.push(toISODate(d));
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

function getCutoff(period: "week" | "month" | "year"): Date {
  const now = new Date();
  switch (period) {
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      return d;
    }
    case "month": {
      const d = new Date(now);
      d.setDate(d.getDate() - 29);
      return d;
    }
    case "year": {
      const d = new Date(now);
      d.setFullYear(d.getFullYear() - 1);
      d.setDate(d.getDate() + 1);
      return d;
    }
  }
}

// ── Chart Point Generators ─────────────────────────────────────────────

function getWeeklyNutritionPoints(meals: MealEntry[]): NutritionChartPoint[] {
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const cutoff = getCutoff("week");
  const today = new Date();
  const dates = getDatesInRange(cutoff, today);

  return dates.map((date) => {
    const dayMeals = getMealsForDate(meals, date);
    const totals = getNutritionTotals(dayMeals);
    const d = new Date(date + "T12:00:00");
    return {
      label: dayLabels[d.getDay()],
      ...totals,
    };
  });
}

function getMonthlyNutritionPoints(meals: MealEntry[]): NutritionChartPoint[] {
  const cutoff = getCutoff("month");
  const today = new Date();
  const dates = getDatesInRange(cutoff, today);

  return dates.map((date) => {
    const dayMeals = getMealsForDate(meals, date);
    const totals = getNutritionTotals(dayMeals);
    const d = new Date(date + "T12:00:00");
    return {
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      ...totals,
    };
  });
}

function getYearlyNutritionPoints(meals: MealEntry[]): NutritionChartPoint[] {
  const monthNames = [
    "J",
    "F",
    "M",
    "A",
    "M",
    "J",
    "J",
    "A",
    "S",
    "O",
    "N",
    "D",
  ];

  const cutoff = getCutoff("year");
  const today = new Date();
  const dates = getDatesInRange(cutoff, today);

  // Group by month, average per month
  const byMonth = new Map<
    number,
    { calories: number[]; protein: number[]; carbs: number[]; fat: number[] }
  >();

  for (const date of dates) {
    const dayMeals = getMealsForDate(meals, date);
    if (dayMeals.length === 0) continue;
    const totals = getNutritionTotals(dayMeals);
    const month = new Date(date + "T12:00:00").getMonth();
    const existing = byMonth.get(month) ?? {
      calories: [],
      protein: [],
      carbs: [],
      fat: [],
    };
    existing.calories.push(totals.calories);
    existing.protein.push(totals.protein);
    existing.carbs.push(totals.carbs);
    existing.fat.push(totals.fat);
    byMonth.set(month, existing);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a - b)
    .map(([month, data]) => {
      const avg = (arr: number[]) =>
        Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
      return {
        label: monthNames[month],
        calories: avg(data.calories),
        protein: avg(data.protein),
        carbs: avg(data.carbs),
        fat: avg(data.fat),
      };
    });
}

// ── Public API ──────────────────────────────────────────────────────────

/**
 * Get chart points for a given segment index (0=week, 1=month, 2=year).
 */
export function getNutritionChartPoints(
  meals: MealEntry[],
  segmentIndex: number
): NutritionChartPoint[] {
  switch (segmentIndex) {
    case 0:
      return getWeeklyNutritionPoints(meals);
    case 1:
      return getMonthlyNutritionPoints(meals);
    case 2:
      return getYearlyNutritionPoints(meals);
    default:
      return getWeeklyNutritionPoints(meals);
  }
}

/**
 * Calculate aggregate nutrition stats for the currently visible period.
 */
export function getNutritionStats(
  meals: MealEntry[],
  segmentIndex: number,
  calorieBudget: number
): NutritionStats & { adherencePercent: number } {
  const period = (["week", "month", "year"] as const)[segmentIndex] ?? "week";
  const cutoff = getCutoff(period);
  const today = new Date();
  const dates = getDatesInRange(cutoff, today);

  let totalCals = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;
  let daysLogged = 0;

  for (const date of dates) {
    const dayMeals = getMealsForDate(meals, date);
    if (dayMeals.length > 0) {
      daysLogged++;
      const totals = getNutritionTotals(dayMeals);
      totalCals += totals.calories;
      totalProtein += totals.protein;
      totalCarbs += totals.carbs;
      totalFat += totals.fat;
    }
  }

  const divisor = daysLogged || 1;

  // Adherence: % of logged days within ±10% of budget
  let daysOnTarget = 0;
  if (calorieBudget > 0) {
    for (const date of dates) {
      const dayMeals = getMealsForDate(meals, date);
      if (dayMeals.length === 0) continue;
      const dayCals = getNutritionTotals(dayMeals).calories;
      const ratio = dayCals / calorieBudget;
      if (ratio >= 0.9 && ratio <= 1.1) daysOnTarget++;
    }
  }

  return {
    avgCalories: Math.round(totalCals / divisor),
    avgProtein: Math.round(totalProtein / divisor),
    avgCarbs: Math.round(totalCarbs / divisor),
    avgFat: Math.round(totalFat / divisor),
    daysLogged,
    daysTotal: dates.length,
    adherencePercent:
      daysLogged > 0 ? Math.round((daysOnTarget / daysLogged) * 100) : 0,
  };
}
