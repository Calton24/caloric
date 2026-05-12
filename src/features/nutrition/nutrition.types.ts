import type { SavedFoodItem } from "./estimation/estimation.types";
import type { MealTime } from "./mealtime";

export type MealSource =
  | "voice"
  | "manual"
  | "camera"
  | "text"
  | "image"
  | "barcode";

export interface MealEntry {
  id: string;
  title: string;
  source: MealSource;
  rawInput?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** Backward-compatible alias for UTC timestamp (use loggedAtUtc for new code). */
  loggedAt: string;
  /** Absolute UTC instant used for sorting/sync. */
  loggedAtUtc?: string;
  /** Local wall-clock datetime captured at log time (no timezone suffix). */
  loggedAtLocal?: string;
  /** Local calendar date captured at log time (YYYY-MM-DD). */
  loggedDateLocal?: string;
  /** IANA timezone identifier captured at log time (e.g. Europe/London). */
  timezone?: string;
  /** Device offset from UTC in minutes at log time. */
  timezoneOffsetMinutes?: number;

  // ── Provenance (optional — backward compatible) ──
  /** Individual parsed + matched food items in this meal */
  items?: SavedFoodItem[];
  /** Overall confidence score (0.0 – 1.0) */
  confidence?: number;
  /** Which parser produced the structured output */
  parseMethod?: string;

  /** Emoji representing the dominant food in this meal */
  emoji?: string;

  /** Time-of-day context when meal was logged */
  mealTime?: MealTime;

  /** Local URI of the meal photo (camera scans only) */
  imageUri?: string;

  /** Optional remote/public image URL alias (legacy-compatible). */
  imageUrl?: string;

  /** Optional thumbnail alias used by older meal surfaces. */
  thumbnailUri?: string;

  /** Storage object path inside `meal-review-images`. Server-authoritative
   *  reference for the captured photo; preferred over `imageUri` when set. */
  imagePath?: string;
}

export interface DailyNutritionSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  meals: MealEntry[];
}
