/**
 * Single entry point to refresh streak state from the canonical in-memory
 * meal list (`useNutritionStore`). Call after any bulk meal change that does
 * not reliably flow through the meal subscription (e.g. repository hydrate,
 * cloud restore merge).
 */

import { useNutritionStore } from "../nutrition/nutrition.store";
import { computeLocalStreakFromStores } from "./compute-local-streak";

export type MealListStreakRecomputeReason =
  | "food_logged"
  | "meal_deleted"
  | "local_repository_hydrated"
  | "cloud_restore_complete"
  | "repository_snapshot_merged"
  /** Meals array changed while cloud upload was suppressed (initial hydration). */
  | "meal_list_changed_while_upload_suppressed";

/**
 * Re-derives streak from `useNutritionStore.getState().meals` (force bypasses
 * post–food-log settling guard).
 */
export function recomputeStreakAfterMealListChange(
  reason: MealListStreakRecomputeReason
): void {
  if (__DEV__) {
    console.log("[Streak] recompute_after_meal_list_change", {
      reason,
      mealCount: useNutritionStore.getState().meals.length,
    });
  }
  computeLocalStreakFromStores({ force: true });
}
