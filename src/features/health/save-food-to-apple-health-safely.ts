import {
  addFoodLoggingBreadcrumb,
  captureFoodLoggingError,
} from "../../infrastructure/errorReporting/foodLoggingErrors";
import { getHealthService } from "./health.factory";
import {
  buildWriteDietaryEnergySampleInputFromMeal,
  type MealForHealthKit,
} from "./healthkitFoodPayload";

let healthKitFoodWriteBlockedUntil = 0;

/** Test helper — clears the post-failure write cooldown. */
export function resetAppleHealthFoodWriteCircuitBreakerForTests(): void {
  healthKitFoodWriteBlockedUntil = 0;
}

function isHealthKitFoodWriteBlocked(): boolean {
  return Date.now() < healthKitFoodWriteBlockedUntil;
}

function blockHealthKitFoodWritesFromFailure(): void {
  healthKitFoodWriteBlockedUntil = Date.now() + 10 * 60 * 1000;
}

/** Opt-in: set `EXPO_PUBLIC_HEALTHKIT_FOOD_WRITE_ENABLED=1` in the build env. */
export function isHealthKitFoodWriteExplicitlyEnabled(): boolean {
  return process.env.EXPO_PUBLIC_HEALTHKIT_FOOD_WRITE_ENABLED === "1";
}

export type SaveFoodToAppleHealthSafelyOptions = {
  /** Unit tests / dev tools only — bypasses env gate. */
  forceEnable?: boolean;
  /** HKFoodMeal string (e.g. Breakfast, Lunch, Dinner, Snacks). */
  mealType?: string | null;
};

export type SaveFoodToAppleHealthResult =
  | { ok: true }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; error: unknown };

/**
 * Writes one meal to Apple Health (dietary energy) when enabled.
 * Never throws — food logging must succeed even when HealthKit fails.
 */
export async function saveFoodToAppleHealthSafely(
  meal: MealForHealthKit,
  opts?: SaveFoodToAppleHealthSafelyOptions
): Promise<SaveFoodToAppleHealthResult> {
  const enabledByEnv = isHealthKitFoodWriteExplicitlyEnabled();
  const writesEnabled = opts?.forceEnable === true || enabledByEnv;

  if (!writesEnabled) {
    addFoodLoggingBreadcrumb("[AppleHealthFood] skipped_not_enabled", {
      meal_id: meal.id ?? null,
      env_flag: enabledByEnv,
    });
    return { ok: false, skipped: true, reason: "disabled_by_config" };
  }

  if (isHealthKitFoodWriteBlocked()) {
    addFoodLoggingBreadcrumb("[AppleHealthFood] skipped_breaker_active", {
      meal_id: meal.id ?? null,
    });
    return { ok: false, skipped: true, reason: "healthkit_blocked" };
  }

  const writeInput = buildWriteDietaryEnergySampleInputFromMeal(meal, {
    mealType: opts?.mealType,
  });
  if (!writeInput) {
    addFoodLoggingBreadcrumb("[AppleHealthFood] skipped_invalid_payload", {
      meal_id: meal.id ?? null,
    });
    return { ok: false, skipped: true, reason: "invalid_payload" };
  }

  addFoodLoggingBreadcrumb("[AppleHealthFood] save_started", {
    meal_id: meal.id ?? null,
    energy_kcal: writeInput.energyKcal,
  });

  try {
    const healthService = getHealthService();
    await healthService.writeCalories(writeInput);
    addFoodLoggingBreadcrumb("[AppleHealthFood] save_finished", {
      meal_id: meal.id ?? null,
    });
    return { ok: true };
  } catch (error) {
    blockHealthKitFoodWritesFromFailure();
    addFoodLoggingBreadcrumb("[AppleHealthFood] save_failed", {
      meal_id: meal.id ?? null,
    });
    captureFoodLoggingError(error, {
      flow: "healthkit",
      step: "save_food_failed",
      mealId: meal.id ?? undefined,
      foodTitle:
        typeof meal.title === "string"
          ? meal.title
          : typeof meal.name === "string"
            ? meal.name
            : undefined,
      extras: {
        energyKcal: writeInput.energyKcal,
        mealType: writeInput.mealType,
      },
    });
    return { ok: false, error };
  }
}
