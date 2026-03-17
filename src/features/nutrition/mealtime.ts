/**
 * Meal Time — Time-of-Day Context Layer
 *
 * Auto-detects breakfast / lunch / dinner / snack from the current hour.
 * Used by the pipeline and food memory to provide time-aware portion defaults.
 *
 * Heuristic boundaries (user's local time):
 *   05:00 – 10:59  → breakfast
 *   11:00 – 13:59  → lunch
 *   14:00 – 16:59  → snack
 *   17:00 – 21:59  → dinner
 *   22:00 – 04:59  → snack
 */

export type MealTime = "breakfast" | "lunch" | "dinner" | "snack";

/**
 * Detect mealtime from the current hour.
 */
export function detectMealTime(date: Date = new Date()): MealTime {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 14) return "lunch";
  if (hour >= 17 && hour < 22) return "dinner";
  return "snack";
}

/**
 * Detect mealtime from an ISO date string.
 */
export function mealTimeFromISO(iso: string): MealTime {
  return detectMealTime(new Date(iso));
}

/**
 * Portion scale factors by meal time.
 * Breakfast portions are typically smaller than dinner portions.
 * Applied as a multiplier to the base portion estimate when no
 * personal history exists for this food at this time of day.
 */
export const MEALTIME_PORTION_SCALE: Record<MealTime, number> = {
  breakfast: 0.85,
  lunch: 1.0,
  dinner: 1.1,
  snack: 0.65,
};

/** Display labels */
export const MEALTIME_LABELS: Record<MealTime, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

/** Icons for each mealtime (Ionicons names) */
export const MEALTIME_ICONS: Record<MealTime, string> = {
  breakfast: "sunny-outline",
  lunch: "partly-sunny-outline",
  dinner: "moon-outline",
  snack: "cafe-outline",
};
