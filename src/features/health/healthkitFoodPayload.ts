/**
 * HealthKit dietary `saveFood` — JS-side guards before the native bridge.
 *
 * The iOS implementation builds NSDictionary literals with NSString values that
 * must not be nil (see RCTAppleHealthKit+Methods_Dietary.m `saveFood:`).
 */

import {
  buildAppleHealthFoodPayload,
  toWriteDietaryEnergySampleInput,
} from "./apple-health-food.adapter";
import type { WriteDietaryEnergySampleInput } from "./health.types";

export type MealForHealthKit = {
  id?: string | null;
  title?: string | null;
  name?: string | null;
  calories?: unknown;
  protein?: unknown;
  carbs?: unknown;
  fat?: unknown;
  loggedAt?: unknown;
  createdAt?: unknown;
};

/**
 * Returns a validated write input for {@link HealthService.writeCalories}, or
 * `null` when the meal must not be sent to HealthKit (zero/invalid calories, etc.).
 */
export function buildWriteDietaryEnergySampleInputFromMeal(
  meal: MealForHealthKit,
  opts?: { mealType?: string | null }
): WriteDietaryEnergySampleInput | null {
  const built = buildAppleHealthFoodPayload(meal);
  if (!built.ok) return null;
  return toWriteDietaryEnergySampleInput(built.payload, opts?.mealType);
}
