/**
 * Bridges AsyncStorage meal rows into the in-memory nutrition store.
 * Meals are not part of Zustand persist partialize — they live in the
 * repository — so after hot reload / rehydrate the store must be refilled
 * from disk before cloud restore or UI reads.
 */

import { recomputeStreakAfterMealListChange } from "../streak/recompute-streak-after-meal-list-change";
import { useNutritionStore } from "../nutrition/nutrition.store";
import { listMeals } from "./repositories/meal.repository";

export async function hydrateNutritionStoreMealsFromLocalRepository(
  userId: string
): Promise<void> {
  const rows = await listMeals(userId);
  useNutritionStore.getState().mergeMealsFromRepositorySnapshot(rows);
  recomputeStreakAfterMealListChange("local_repository_hydrated");
}
