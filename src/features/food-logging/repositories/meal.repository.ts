import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MealEntry } from "../../nutrition/nutrition.types";
import { resolveMealLoggedAtUtc } from "../time/create-meal-timestamp-fields";

const MEAL_KEY = (userId: string, mealId: string) => `meal:${userId}:${mealId}`;
const MEAL_INDEX_KEY = (userId: string) => `meal_index:${userId}`;

type PersistedMealDto = Pick<
  MealEntry,
  | "id"
  | "title"
  | "source"
  | "calories"
  | "protein"
  | "carbs"
  | "fat"
  | "loggedAt"
  | "loggedAtUtc"
  | "loggedAtLocal"
  | "loggedDateLocal"
  | "timezone"
  | "timezoneOffsetMinutes"
  | "mealTime"
  | "emoji"
  | "imageUri"
  | "imageUrl"
  | "thumbnailUri"
  | "imagePath"
> & {
  barcode?: string | null;
  rawInput?: string | null;
  localDate: string;
  userId: string;
};

function toLocalDateFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function toFiniteNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toSafeTitle(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length > 0 ? s.slice(0, 256) : "Logged food";
}

export function sanitizeMealForPersistence(
  userId: string,
  meal: MealEntry
): PersistedMealDto {
  const loggedAtUtc =
    typeof meal.loggedAtUtc === "string" && meal.loggedAtUtc
      ? meal.loggedAtUtc
      : typeof meal.loggedAt === "string" && meal.loggedAt
        ? meal.loggedAt
        : new Date().toISOString();
  return {
    id: typeof meal.id === "string" && meal.id ? meal.id : `meal_${Date.now()}`,
    userId,
    title: toSafeTitle(meal.title),
    source: meal.source ?? "manual",
    calories: toFiniteNumber(meal.calories),
    protein: toFiniteNumber(meal.protein),
    carbs: toFiniteNumber(meal.carbs),
    fat: toFiniteNumber(meal.fat),
    loggedAt: loggedAtUtc,
    loggedAtUtc,
    loggedAtLocal: meal.loggedAtLocal,
    loggedDateLocal: meal.loggedDateLocal,
    timezone: meal.timezone,
    timezoneOffsetMinutes: meal.timezoneOffsetMinutes,
    localDate:
      typeof meal.loggedDateLocal === "string" && meal.loggedDateLocal
        ? meal.loggedDateLocal
        : toLocalDateFromIso(loggedAtUtc),
    mealTime: meal.mealTime,
    emoji: meal.emoji,
    imageUri:
      typeof meal.imageUri === "string" && meal.imageUri.trim().length > 0
        ? meal.imageUri
        : undefined,
    imageUrl:
      typeof meal.imageUrl === "string" && meal.imageUrl.trim().length > 0
        ? meal.imageUrl
        : undefined,
    thumbnailUri:
      typeof meal.thumbnailUri === "string" && meal.thumbnailUri.trim().length > 0
        ? meal.thumbnailUri
        : undefined,
    imagePath:
      typeof meal.imagePath === "string" && meal.imagePath.trim().length > 0
        ? meal.imagePath
        : undefined,
    barcode: typeof meal.rawInput === "string" ? meal.rawInput : null,
    rawInput: typeof meal.rawInput === "string" ? meal.rawInput : null,
  };
}

function fromDto(dto: PersistedMealDto): MealEntry {
  return {
    id: dto.id,
    title: dto.title,
    source: dto.source,
    calories: dto.calories,
    protein: dto.protein,
    carbs: dto.carbs,
    fat: dto.fat,
    loggedAt: dto.loggedAt,
    loggedAtUtc: dto.loggedAtUtc ?? dto.loggedAt,
    loggedAtLocal: dto.loggedAtLocal,
    loggedDateLocal: dto.loggedDateLocal ?? dto.localDate,
    timezone: dto.timezone,
    timezoneOffsetMinutes: dto.timezoneOffsetMinutes,
    mealTime: dto.mealTime,
    emoji: dto.emoji,
    imageUri: dto.imageUri,
    imageUrl: dto.imageUrl,
    thumbnailUri: dto.thumbnailUri,
    imagePath: dto.imagePath,
    rawInput: dto.rawInput ?? dto.barcode ?? undefined,
  };
}

export async function persistMeal(userId: string, meal: MealEntry): Promise<MealEntry> {
  const dto = sanitizeMealForPersistence(userId, meal);
  const serialized = JSON.stringify(dto);
  if (!serialized || serialized.length > 50_000) {
    throw new Error(`[MealRepository] unsafe meal payload size=${serialized?.length ?? 0}`);
  }

  const indexKey = MEAL_INDEX_KEY(userId);
  const mealKey = MEAL_KEY(userId, dto.id);
  const existingIndexRaw = await AsyncStorage.getItem(indexKey);
  const parsedIndex = existingIndexRaw ? JSON.parse(existingIndexRaw) : [];
  const existingIndex = Array.isArray(parsedIndex) ? (parsedIndex as string[]) : [];

  const nextIndex = [dto.id, ...existingIndex.filter((id) => id !== dto.id)];
  await AsyncStorage.multiSet([
    [mealKey, serialized],
    [indexKey, JSON.stringify(nextIndex)],
  ]);
  return fromDto(dto);
}

export async function listMeals(userId: string): Promise<MealEntry[]> {
  const indexRaw = await AsyncStorage.getItem(MEAL_INDEX_KEY(userId));
  const parsed = indexRaw ? JSON.parse(indexRaw) : [];
  const ids = Array.isArray(parsed) ? (parsed as string[]) : [];
  if (ids.length === 0) return [];

  const rows = await AsyncStorage.multiGet(ids.map((id) => MEAL_KEY(userId, id)));
  const out: MealEntry[] = [];
  for (const [, raw] of rows) {
    if (!raw) continue;
    try {
      out.push(fromDto(JSON.parse(raw) as PersistedMealDto));
    } catch {
      // Ignore malformed rows.
    }
  }
  out.sort(
    (a, b) =>
      +new Date(resolveMealLoggedAtUtc(b)) - +new Date(resolveMealLoggedAtUtc(a))
  );
  return out;
}

/** Removes the meal index and all persisted meal rows for one user from AsyncStorage. */
export async function clearPersistedMealsForUser(userId: string): Promise<void> {
  const indexKey = MEAL_INDEX_KEY(userId);
  let ids: string[] = [];
  try {
    const indexRaw = await AsyncStorage.getItem(indexKey);
    const parsed = indexRaw ? JSON.parse(indexRaw) : [];
    ids = Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    ids = [];
  }
  const keys = [indexKey, ...ids.map((id) => MEAL_KEY(userId, id))];
  await AsyncStorage.multiRemove(keys);
}

export async function deletePersistedMeal(
  userId: string,
  mealId: string
): Promise<void> {
  const indexKey = MEAL_INDEX_KEY(userId);
  const mealKey = MEAL_KEY(userId, mealId);
  const indexRaw = await AsyncStorage.getItem(indexKey);
  const parsed = indexRaw ? JSON.parse(indexRaw) : [];
  const ids = Array.isArray(parsed) ? (parsed as string[]) : [];
  const nextIds = ids.filter((id) => id !== mealId);
  await AsyncStorage.multiSet([[indexKey, JSON.stringify(nextIds)]]);
  await AsyncStorage.removeItem(mealKey);
}
