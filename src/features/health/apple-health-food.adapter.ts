import type { WriteDietaryEnergySampleInput } from "./health.types";

export type AppleHealthFoodPayload = {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  startDate: string;
  endDate: string;
};

type AppleHealthMealInput = {
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

export type BuildAppleHealthFoodResult =
  | { ok: true; payload: AppleHealthFoodPayload }
  | {
      ok: false;
      reason: "invalid_calories" | "invalid_date" | "invalid_payload";
      debug: Record<string, unknown>;
    };

function finiteNumber(value: unknown, fallback = 0): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(n) ? n : fallback;
}

function positiveNumber(value: unknown): number | null {
  const n = finiteNumber(value, Number.NaN);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function safeIsoDate(value: unknown): string | null {
  if (typeof value === "string") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return null;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }
  return null;
}

export function buildAppleHealthFoodPayload(
  meal: AppleHealthMealInput
): BuildAppleHealthFoodResult {
  const mealId = meal.id ?? null;
  const rawName = String(meal.title ?? meal.name ?? "").trim();
  const name = rawName || "Food";

  const calories = positiveNumber(meal.calories);
  if (calories === null) {
    return {
      ok: false,
      reason: "invalid_calories",
      debug: {
        mealId,
        calories: meal.calories ?? null,
      },
    };
  }

  const startDate = safeIsoDate(meal.loggedAt) ?? safeIsoDate(meal.createdAt);
  if (!startDate) {
    return {
      ok: false,
      reason: "invalid_date",
      debug: {
        mealId,
        loggedAt: typeof meal.loggedAt,
        createdAt: typeof meal.createdAt,
      },
    };
  }

  const payload: AppleHealthFoodPayload = {
    name,
    calories,
    protein: finiteNumber(meal.protein, 0),
    carbs: finiteNumber(meal.carbs, 0),
    fat: finiteNumber(meal.fat, 0),
    startDate,
    endDate: startDate,
  };

  const hasNil = Object.values(payload).some((v) => v == null);
  const hasInvalidNumber = [payload.calories, payload.protein, payload.carbs, payload.fat].some(
    (v) => !Number.isFinite(v)
  );
  if (hasNil || hasInvalidNumber) {
    return {
      ok: false,
      reason: "invalid_payload",
      debug: { mealId },
    };
  }

  return { ok: true, payload };
}

const DEFAULT_HK_MEAL_TYPE = "Lunch";

/**
 * Maps a validated app payload to the shape expected by
 * `RCTAppleHealthKit+Methods_Dietary.m` `saveFood:` (react-native-health).
 */
export function toWriteDietaryEnergySampleInput(
  payload: AppleHealthFoodPayload,
  mealType?: string | null
): WriteDietaryEnergySampleInput {
  const when = new Date(payload.startDate);
  const date = Number.isNaN(when.getTime()) ? new Date() : when;
  const mt = String(mealType ?? "").trim() || DEFAULT_HK_MEAL_TYPE;
  return {
    foodName: payload.name,
    mealType: mt,
    energyKcal: payload.calories,
    date,
    proteinG: payload.protein,
    carbohydratesG: payload.carbs,
    fatG: payload.fat,
  };
}

