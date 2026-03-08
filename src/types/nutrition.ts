/**
 * Caloric — Data Models (re-exports)
 *
 * @deprecated Import directly from src/features/{domain} instead.
 */

// Profile
export type {
  ActivityLevel,
  Gender,
  HeightUnit,
  UserProfile,
  WeightUnit,
} from "../features/profile/profile.types";

// Goals
export type { GoalPlan, GoalType, MacroTargets } from "../features/goals/goals.types";

// Nutrition
export type {
  DailyNutritionSummary,
  MealEntry,
  MealSource,
} from "../features/nutrition/nutrition.types";

// Progress
export type {
  ProgressPoint,
  WeightLog,
} from "../features/progress/progress.types";

// Permissions
export type {
  PermissionState,
  PermissionStatus,
} from "../features/permissions/permissions.types";

// Subscription
export type {
  SubscriptionPlan,
  SubscriptionState,
} from "../features/subscription/subscription.types";
