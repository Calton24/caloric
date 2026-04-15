#!/usr/bin/env python3
"""Write barrel exports and backward-compat files."""
import os

base = "/Users/calton/Coding/Mobile/caloric/src/features"
src = "/Users/calton/Coding/Mobile/caloric/src"

files = {}

# === BARREL EXPORTS ===

files[f"{base}/profile/index.ts"] = """// Profile Feature — barrel export
export { initialProfile, useProfileStore } from "./profile.store";
export type {
  ActivityLevel,
  Gender,
  HeightUnit,
  UserProfile,
  WeightUnit,
} from "./profile.types";
"""

files[f"{base}/goals/index.ts"] = """// Goals Feature — barrel export
export { buildGoalPlan } from "./goal-calculation.service";
export { useGoalsStore } from "./goals.store";
export type { GoalPlan, GoalType, MacroTargets } from "./goals.types";
"""

files[f"{base}/nutrition/index.ts"] = """// Nutrition Feature — barrel export
export { getMealsForDate, getNutritionTotals } from "./nutrition.selectors";
export { useNutritionStore } from "./nutrition.store";
export type {
  DailyNutritionSummary,
  MealEntry,
  MealSource,
} from "./nutrition.types";
"""

files[f"{base}/progress/index.ts"] = """// Progress Feature — barrel export
export {
  getLatestWeight,
  getWeightTrendPercentage,
} from "./progress.selectors";
export { useProgressStore } from "./progress.store";
export type { ProgressPoint, WeightLog } from "./progress.types";
"""

files[f"{base}/permissions/index.ts"] = """// Permissions Feature — barrel export
export { initialPermissions, usePermissionsStore } from "./permissions.store";
export type { PermissionState, PermissionStatus } from "./permissions.types";
"""

files[f"{base}/subscription/index.ts"] = """// Subscription Feature — barrel export
export {
  initialSubscription,
  useSubscriptionStore,
} from "./subscription.store";
export type { SubscriptionPlan, SubscriptionState } from "./subscription.types";
"""

# === BACKWARD COMPAT: src/stores/index.ts ===

files[f"{src}/stores/index.ts"] = """/**
 * Domain Stores — Barrel Export
 *
 * @deprecated Import directly from src/features/{domain} instead.
 * Re-exports for backward compatibility.
 */

export { useGoalsStore } from "../features/goals";
export { useNutritionStore } from "../features/nutrition";
export { usePermissionsStore, usePermissionsStore as usePermissionStore } from "../features/permissions";
export { useProfileStore } from "../features/profile";
export { useProgressStore } from "../features/progress";
export { useSubscriptionStore, useSubscriptionStore as useBillingStore } from "../features/subscription";
"""

# === BACKWARD COMPAT: src/stores/permissionStore.ts ===

files[f"{src}/stores/permissionStore.ts"] = """/** @deprecated Use usePermissionsStore from ../features/permissions */
export { usePermissionsStore as usePermissionStore } from "../features/permissions/permissions.store";
"""

# === BACKWARD COMPAT: src/stores/billingStore.ts ===

files[f"{src}/stores/billingStore.ts"] = """/** @deprecated Use useSubscriptionStore from ../features/subscription */
export { useSubscriptionStore as useBillingStore } from "../features/subscription/subscription.store";
"""

# === BACKWARD COMPAT: src/stores/profileStore.ts ===

files[f"{src}/stores/profileStore.ts"] = """/** @deprecated Use useProfileStore from ../features/profile */
export { useProfileStore } from "../features/profile/profile.store";
"""

# === BACKWARD COMPAT: src/stores/goalsStore.ts ===

files[f"{src}/stores/goalsStore.ts"] = """/** @deprecated Use useGoalsStore from ../features/goals */
export { useGoalsStore } from "../features/goals/goals.store";
"""

# === BACKWARD COMPAT: src/stores/nutritionStore.ts ===

files[f"{src}/stores/nutritionStore.ts"] = """/** @deprecated Use useNutritionStore from ../features/nutrition */
export { useNutritionStore } from "../features/nutrition/nutrition.store";
"""

# === BACKWARD COMPAT: src/stores/progressStore.ts ===

files[f"{src}/stores/progressStore.ts"] = """/** @deprecated Use useProgressStore from ../features/progress */
export { useProgressStore } from "../features/progress/progress.store";
"""

# === BACKWARD COMPAT: src/types/nutrition.ts ===

files[f"{src}/types/nutrition.ts"] = """/**
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
"""

# === BACKWARD COMPAT: src/services/goalEngine.ts ===

files[f"{src}/services/goalEngine.ts"] = """/**
 * Goal Plan Engine (re-export)
 *
 * @deprecated Import from src/features/goals instead.
 */

export { buildGoalPlan } from "../features/goals/goal-calculation.service";
"""

for path, content in files.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    rel = os.path.relpath(path, "/Users/calton/Coding/Mobile/caloric")
    print(f"OK {rel}")

print(f"\nWrote {len(files)} files total.")
