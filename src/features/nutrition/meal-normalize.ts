/**
 * Strict normalization for meal drafts / entries / barcode pipeline output.
 * External providers return dirty shapes — never trust raw numbers or nested fields.
 */

import type { EstimatedFoodItem } from "./estimation/estimation.types";
import type { MealDraft } from "./nutrition.draft.types";
import type { MealEntry } from "./nutrition.types";
import type { NutrientProfile } from "./matching/matching.types";
import type { ParsedFoodItem } from "./parsing/food-candidate.schema";

const SCAN_FOOD_FALLBACK = "Scanned food";
const MEAL_FALLBACK = "Meal";

export function toSafeNumber(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return fallback;
    return value < 0 ? 0 : value;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/,/g, ".").replace(/\s*kcal/gi, "").trim();
    const m = cleaned.match(/-?\d+(?:\.\d+)?/);
    if (!m) return fallback;
    const n = Number(m[0]);
    if (!Number.isFinite(n)) return fallback;
    return n < 0 ? 0 : n;
  }
  return fallback;
}

/** Quantity / servings — must be strictly positive. */
export function toSafePositiveNumber(value: unknown, fallback = 1): number {
  const n = toSafeNumber(value, fallback);
  return n > 0 ? n : fallback;
}

export function toSafeString(value: unknown, fallback: string): string {
  if (value == null) return fallback;
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 ? t : fallback;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return fallback;
}

export function normalizeNutrientProfile(
  n: Partial<NutrientProfile> | null | undefined,
): NutrientProfile {
  return {
    calories: Math.round(toSafeNumber(n?.calories, 0)),
    protein: Math.round(toSafeNumber(n?.protein, 0) * 10) / 10,
    carbs: Math.round(toSafeNumber(n?.carbs, 0) * 10) / 10,
    fat: Math.round(toSafeNumber(n?.fat, 0) * 10) / 10,
    fiber:
      n?.fiber !== undefined && n.fiber !== null
        ? Math.round(toSafeNumber(n.fiber, 0) * 10) / 10
        : undefined,
    sugar:
      n?.sugar !== undefined && n.sugar !== null
        ? Math.round(toSafeNumber(n.sugar, 0) * 10) / 10
        : undefined,
    sodium:
      n?.sodium !== undefined && n.sodium !== null
        ? Math.round(toSafeNumber(n.sodium, 0))
        : undefined,
  };
}

/** Safe nutrients for an estimated item (handles missing `nutrients`). */
export function getEstimatedItemNutrients(
  item: Pick<EstimatedFoodItem, "nutrients"> | null | undefined,
): NutrientProfile {
  return normalizeNutrientProfile(item?.nutrients);
}

export function getMealCalories(meal: MealEntry | null | undefined): number {
  return toSafeNumber(meal?.calories, 0);
}

export function getMealProtein(meal: MealEntry | null | undefined): number {
  return toSafeNumber(meal?.protein, 0);
}

export function getMealCarbs(meal: MealEntry | null | undefined): number {
  return toSafeNumber(meal?.carbs, 0);
}

export function getMealFat(meal: MealEntry | null | undefined): number {
  return toSafeNumber(meal?.fat, 0);
}

export function isValidMealLoggedAt(loggedAt: string | null | undefined): boolean {
  if (loggedAt == null || typeof loggedAt !== "string") return false;
  const t = Date.parse(loggedAt);
  return Number.isFinite(t);
}

/** YYYY-MM-DD for a meal, or null if timestamp is unusable. */
export function getMealLocalDateString(
  meal: MealEntry | null | undefined,
  toLocalDate: (d: Date) => string,
): string | null {
  if (!meal?.loggedAt) return null;
  if (!isValidMealLoggedAt(meal.loggedAt)) return null;
  try {
    return toLocalDate(new Date(meal.loggedAt));
  } catch {
    return null;
  }
}

function defaultTitleForDraft(draft: MealDraft): string {
  return draft.parseMethod === "barcode-lookup"
    ? SCAN_FOOD_FALLBACK
    : MEAL_FALLBACK;
}

function normalizeParsedFoodItem(
  item: EstimatedFoodItem,
  matchedName: string,
): ParsedFoodItem {
  const p = item.parsed;
  const name =
    toSafeString(p?.name, matchedName).trim().toLowerCase() ||
    matchedName.toLowerCase();
  return {
    name,
    quantity: toSafePositiveNumber(p?.quantity ?? item.estimatedServings, 1),
    unit: p?.unit ?? "serving",
    preparation: p?.preparation ?? null,
    confidence: Math.min(
      1,
      Math.max(0, toSafeNumber(p?.confidence ?? item.confidence, 1)),
    ),
    rawFragment: toSafeString(p?.rawFragment, matchedName),
  };
}

export function normalizeEstimatedItemForStorage(
  item: EstimatedFoodItem,
): EstimatedFoodItem {
  const matchedName = toSafeString(
    item.matchedName,
    toSafeString(item.parsed?.name, SCAN_FOOD_FALLBACK),
  );
  const nutrients = normalizeNutrientProfile(item.nutrients);
  const parsed = normalizeParsedFoodItem(item, matchedName);
  const zeroMacros =
    nutrients.calories === 0 &&
    nutrients.protein === 0 &&
    nutrients.carbs === 0 &&
    nutrients.fat === 0;

  return {
    ...item,
    parsed,
    matchedName,
    matchSource: item.matchSource ?? "openfoodfacts",
    matchId: toSafeString(item.matchId, "unknown"),
    estimatedServings: toSafePositiveNumber(item.estimatedServings, 1),
    nutrients,
    confidence: Math.min(
      1,
      Math.max(0, toSafeNumber(item.confidence, 1)),
    ),
    needsUserConfirmation:
      item.needsUserConfirmation ?? zeroMacros,
  };
}

/**
 * Returns a new draft safe for `validateMealDraft` + `buildMealEntryFromDraft`.
 */
export function normalizeMealDraftForStorage(draft: MealDraft): MealDraft {
  const titleDefault = defaultTitleForDraft(draft);
  const title =
    toSafeString(draft.title, titleDefault).trim() || titleDefault;

  let loggedAt = draft.loggedAt;
  if (loggedAt != null) {
    if (typeof loggedAt !== "string" || loggedAt.trim().length === 0) {
      loggedAt = undefined;
    } else {
      const t = loggedAt.trim();
      if (t.length === 10 && /^\d{4}-\d{2}-\d{2}$/.test(t)) {
        loggedAt = t;
      } else if (!Number.isFinite(Date.parse(t))) {
        loggedAt = undefined;
      }
    }
  }

  if (draft.estimatedItems && draft.estimatedItems.length > 0) {
    const estimatedItems = draft.estimatedItems.map(
      normalizeEstimatedItemForStorage,
    );
    const totals = estimatedItems.reduce(
      (acc, it) => ({
        calories: acc.calories + it.nutrients.calories,
        protein: acc.protein + it.nutrients.protein,
        carbs: acc.carbs + it.nutrients.carbs,
        fat: acc.fat + it.nutrients.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
    return {
      ...draft,
      title,
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
      loggedAt,
      estimatedItems,
    };
  }

  return {
    ...draft,
    title,
    calories: Math.round(toSafeNumber(draft.calories, 0)),
    protein: Math.round(toSafeNumber(draft.protein, 0) * 10) / 10,
    carbs: Math.round(toSafeNumber(draft.carbs, 0) * 10) / 10,
    fat: Math.round(toSafeNumber(draft.fat, 0) * 10) / 10,
    loggedAt,
  };
}

/**
 * Build a fully valid `EstimatedFoodItem` for barcode flows (no `as never` partials).
 */
export function buildBarcodeEstimatedFoodItem(params: {
  productName: string;
  barcode: string;
  matchSource: "dataset" | "openfoodfacts";
  nutrients: NutrientProfile;
  emoji?: string;
}): EstimatedFoodItem {
  const name =
    toSafeString(params.productName, SCAN_FOOD_FALLBACK);
  const nutrients = normalizeNutrientProfile(params.nutrients);
  const zeroMacros =
    nutrients.calories === 0 &&
    nutrients.protein === 0 &&
    nutrients.carbs === 0 &&
    nutrients.fat === 0;
  const parsed: ParsedFoodItem = {
    name: name.toLowerCase(),
    quantity: 1,
    unit: "serving",
    preparation: null,
    confidence: 1,
    rawFragment: `barcode:${params.barcode}`,
  };

  return {
    parsed,
    matchedName: name,
    matchSource: params.matchSource,
    matchId: params.barcode,
    estimatedServings: 1,
    nutrients,
    confidence: 1,
    needsUserConfirmation: zeroMacros,
    emoji: params.emoji,
  };
}

/** Minimum draft shape required before opening confirm-meal (esp. barcode). */
export function isRenderableConfirmMealPayload(
  draft: MealDraft | null | undefined,
): boolean {
  if (!draft) return false;
  const title = toSafeString(draft.title, "").trim();
  if (!title) return false;
  const caloriesOk =
    typeof draft.calories === "number" &&
    Number.isFinite(draft.calories) &&
    draft.calories >= 0;
  if (!caloriesOk) return false;
  for (const key of ["protein", "carbs", "fat"] as const) {
    const v = draft[key];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return false;
  }
  if (draft.estimatedItems?.length) {
    for (const item of draft.estimatedItems) {
      if (!item?.nutrients) return false;
      const n = normalizeNutrientProfile(item.nutrients);
      if (!toSafeString(item.matchedName, "").trim()) return false;
      if (!Number.isFinite(n.calories) || n.calories < 0) return false;
    }
  }
  return true;
}
