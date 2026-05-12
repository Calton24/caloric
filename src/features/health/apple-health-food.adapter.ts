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
      reason:
        | "missing_name"
        | "invalid_calories"
        | "invalid_date"
        | "invalid_payload";
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
  const name = String(meal.title ?? meal.name ?? "").trim();
  if (!name) {
    return {
      ok: false,
      reason: "missing_name",
      debug: { mealId },
    };
  }

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

