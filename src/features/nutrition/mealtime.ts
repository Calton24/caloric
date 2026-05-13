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

/** Canonical meal-time values (display / sync / grouping). */
export const MEAL_TIMES: readonly MealTime[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
];

function isMealTimeString(value: string): value is MealTime {
  return (MEAL_TIMES as readonly string[]).includes(value);
}

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
 * Coerce any value to a valid `MealTime`. Unknown / null / undefined → snack.
 * Use when you must always produce a bucket (e.g. hit-testing fallbacks).
 */
export function normaliseMealTime(value: unknown): MealTime {
  if (typeof value === "string" && isMealTimeString(value)) return value;
  return "snack";
}

/**
 * Map Supabase `meal_time` into the local field. `null` / missing → undefined
 * so the UI can fall back to time-of-day from `loggedAt`. Invalid strings →
 * `snack` so one bad row cannot break grouping.
 */
export function coerceRemoteMealTime(raw: unknown): MealTime | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (typeof raw === "string" && isMealTimeString(raw)) return raw;
  return "snack";
}

/**
 * Meal-time section used on Home (grouping + drag source section). Prefer
 * persisted `mealTime` when set and valid; otherwise infer from `loggedAt`.
 */
export function effectiveMealSectionKey(meal: {
  mealTime?: MealTime | string | null;
  loggedAt: string;
}): MealTime {
  if (meal.mealTime === null || meal.mealTime === undefined || meal.mealTime === "") {
    return mealTimeFromISO(meal.loggedAt);
  }
  return coerceRemoteMealTime(meal.mealTime) ?? mealTimeFromISO(meal.loggedAt);
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
