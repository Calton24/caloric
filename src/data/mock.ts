/**
 * Caloric — Mock Data
 *
 * Realistic sample data for all screens.
 * @deprecated Use src/lib/constants/mock-data.ts for new code.
 */

import type {
    DailyNutritionSummary,
    GoalPlan,
    MacroTargets,
    MealEntry,
    PermissionState,
    SubscriptionState,
    UserProfile,
    WeightLog,
} from "../types/nutrition";

// ─── User Profile ──────────────────────────────────────────────
export const MOCK_USER: UserProfile = {
  id: "usr_001",
  gender: "male",
  birthYear: 1998,
  heightCm: 173,
  currentWeightLbs: 176.4,
  goalWeightLbs: 157,
  activityLevel: "moderate",
  weightUnit: "lbs",
  heightUnit: "cm",
  onboardingCompleted: true,
  waterGoalMl: 2000,
  waterIncrementMl: 250,
};

// ─── Goal Plan ─────────────────────────────────────────────────
export const MOCK_GOAL_PLAN: GoalPlan = {
  goalType: "lose",
  calorieBudget: 2050,
  maintenanceCalories: 2550,
  weeklyRateLbs: 1.0,
  timeframeWeeks: 17,
  targetDate: "2026-07-09",
  macros: {
    protein: 154,
    carbs: 256,
    fat: 46,
  },
};

// ─── Macro Targets (convenience) ───────────────────────────────
export const MOCK_MACRO_TARGET: MacroTargets = {
  protein: MOCK_GOAL_PLAN.macros.protein,
  carbs: MOCK_GOAL_PLAN.macros.carbs,
  fat: MOCK_GOAL_PLAN.macros.fat,
};

// ─── Today\'s Meals ─────────────────────────────────────────────
export const MOCK_MEALS: MealEntry[] = [
  {
    id: "meal_001",
    title: "Oatmeal with Blueberries and Honey",
    calories: 380,
    protein: 12,
    carbs: 62,
    fat: 8,
    source: "voice",
    loggedAt: "2026-03-07T08:15:00.000Z",
  },
  {
    id: "meal_002",
    title: "Grilled Chicken Salad with Avocado",
    calories: 520,
    protein: 42,
    carbs: 28,
    fat: 22,
    source: "manual",
    loggedAt: "2026-03-07T12:30:00.000Z",
  },
  {
    id: "meal_003",
    title: "Greek Yogurt with Granola",
    calories: 280,
    protein: 18,
    carbs: 38,
    fat: 6,
    source: "voice",
    loggedAt: "2026-03-07T15:00:00.000Z",
  },
  {
    id: "meal_004",
    title: "Salmon with Rice and Vegetables",
    calories: 640,
    protein: 45,
    carbs: 58,
    fat: 18,
    source: "manual",
    loggedAt: "2026-03-07T19:00:00.000Z",
  },
];

// ─── Daily Summary ─────────────────────────────────────────────
export function buildDailySummary(
  meals: MealEntry[],
  date: string
): DailyNutritionSummary {
  const dayMeals = meals.filter((m) => m.loggedAt.startsWith(date));
  return {
    date,
    totalCalories: dayMeals.reduce((s, m) => s + m.calories, 0),
    totalProtein: dayMeals.reduce((s, m) => s + m.protein, 0),
    totalCarbs: dayMeals.reduce((s, m) => s + m.carbs, 0),
    totalFat: dayMeals.reduce((s, m) => s + m.fat, 0),
    meals: dayMeals,
  };
}

// ─── Weight History ────────────────────────────────────────────
export const MOCK_WEIGHT_LOGS: WeightLog[] = [
  { id: "wl_01", date: "2026-01-15", weightLbs: 182.0 },
  { id: "wl_02", date: "2026-01-22", weightLbs: 181.2 },
  { id: "wl_03", date: "2026-01-29", weightLbs: 180.5 },
  { id: "wl_04", date: "2026-02-05", weightLbs: 179.8 },
  { id: "wl_05", date: "2026-02-12", weightLbs: 179.1 },
  { id: "wl_06", date: "2026-02-19", weightLbs: 178.3 },
  { id: "wl_07", date: "2026-02-26", weightLbs: 177.6 },
  { id: "wl_08", date: "2026-03-02", weightLbs: 177.0 },
  { id: "wl_09", date: "2026-03-05", weightLbs: 176.8 },
  { id: "wl_10", date: "2026-03-07", weightLbs: 176.4 },
];

// ─── Permissions ───────────────────────────────────────────────
export const MOCK_PERMISSIONS: PermissionState = {
  microphone: "unknown",
  speechRecognition: "unknown",
  camera: "unknown",
  notifications: "unknown",
  liveActivitiesEnabled: false,
  appleHealthReadEnabled: false,
  appleHealthWriteEnabled: false,
};

// ─── Subscription ──────────────────────────────────────────────
export const MOCK_SUBSCRIPTION: SubscriptionState = {
  hasActiveSubscription: false,
  trialStarted: false,
  trialEndsAt: null,
  plan: null,
  paywallSeen: false,
  lastServerVerifiedAt: null,
};

// ─── Weekday helpers ───────────────────────────────────────────
export const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;
export const MONTH_LABELS = [
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
] as const;
