export type ScanFramingState =
  | "start_strong"
  | "on_track"
  | "protein_boost"
  | "tight_budget"
  | "streak_saver"
  | "overshoot_risk";

export interface ScanFramingInput {
  /** Calories already consumed today */
  consumedCalories: number;
  /** Daily calorie budget */
  calorieBudget: number;
  /** Calories in the meal being logged */
  mealCalories: number;
  /** Current streak length in days */
  currentStreak: number;
  /** Protein consumed today (grams) */
  consumedProtein: number;
  /** Daily protein target (grams) */
  proteinTarget: number;
  /** Current hour of day (0–23) */
  hourOfDay: number;
}

export interface ScanFraming {
  state: ScanFramingState;
  title: string;
  subtitle: string;
  /** Primary CTA button label */
  cta: string;
  /** Accent color hint for DayContextCard (maps to theme token) */
  tintColor: "success" | "warning" | "error" | "primary" | "info";
}
