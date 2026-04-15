import type { SavedFoodItem } from "./estimation/estimation.types";
import type { MealTime } from "./mealtime";

export type MealSource = "voice" | "manual" | "camera" | "text" | "image";

export interface MealEntry {
  id: string;
  title: string;
  source: MealSource;
  rawInput?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedAt: string;

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
}

export interface DailyNutritionSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  meals: MealEntry[];
}
