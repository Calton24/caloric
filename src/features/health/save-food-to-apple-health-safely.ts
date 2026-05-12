import { reportError } from "../../infrastructure/errorReporting";
import { addFoodLoggingBreadcrumb } from "../../infrastructure/errorReporting/foodLoggingErrors";
import { getHealthService } from "./health.factory";
import { buildAppleHealthFoodPayload } from "./apple-health-food.adapter";

type MealForHealthKit = {
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

export const ENABLE_APPLE_HEALTH_FOOD_WRITE = !__DEV__;

export async function saveFoodToAppleHealthSafely(
  meal: MealForHealthKit,
  opts?: { forceEnable?: boolean }
): Promise<void> {
  const writesEnabled = opts?.forceEnable ?? ENABLE_APPLE_HEALTH_FOOD_WRITE;
  if (!writesEnabled) {
    addFoodLoggingBreadcrumb("[AppleHealthFood] skipped_by_flag", {
      meal_id: meal.id ?? null,
    });
    return;
  }

  const built = buildAppleHealthFoodPayload(meal);
  if (!built.ok) {
    addFoodLoggingBreadcrumb("[AppleHealthFood] skipped_invalid_payload", {
      meal_id: meal.id ?? null,
      reason: built.reason,
      ...built.debug,
    });
    reportError(new Error(`AppleHealth food skipped: ${built.reason}`), {
      area: "food_log",
      action: "apple_health_food_skipped",
      extra: {
        mealId: meal.id ?? null,
        reason: built.reason,
        debug: built.debug,
      },
    });
    return;
  }

  const payloadShape = Object.fromEntries(
    Object.entries(built.payload).map(([key, value]) => [
      key,
      {
        type: typeof value,
        isNullish: value == null,
        isFiniteNumber:
          typeof value === "number" ? Number.isFinite(value) : undefined,
      },
    ])
  );

  addFoodLoggingBreadcrumb("[AppleHealthFood] save_started", {
    meal_id: meal.id ?? null,
    payloadShape,
  });

  try {
    const healthService = getHealthService();
    await healthService.writeCalories(
      built.payload.calories,
      new Date(built.payload.startDate),
      new Date(built.payload.endDate)
    );
    addFoodLoggingBreadcrumb("[AppleHealthFood] save_finished", {
      meal_id: meal.id ?? null,
    });
  } catch (error) {
    addFoodLoggingBreadcrumb("[AppleHealthFood] save_failed", {
      meal_id: meal.id ?? null,
    });
    reportError(error, {
      area: "food_log",
      action: "apple_health_save_food_failed",
      extra: {
        mealId: meal.id ?? null,
        title: meal.title ?? meal.name ?? null,
      },
    });
  }
}

