import { normaliseMealTime } from "./mealtime";
import type { MealEntry } from "./nutrition.types";

/** Milliseconds for conflict resolution; prefers `updatedAt`, then UTC log instant. */
export function mealEditTimestampMs(meal: MealEntry): number {
  const raw =
    (meal.updatedAt && meal.updatedAt.trim()) ||
    (meal.loggedAtUtc && meal.loggedAtUtc.trim()) ||
    (meal.loggedAt && meal.loggedAt.trim()) ||
    "";
  const n = Date.parse(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Merge a local meal with a repository / remote snapshot for the same id.
 * When local is newer or same age as remote, local fields win (so a recent
 * meal-time drag is not overwritten by a stale pull). When remote is newer,
 * remote wins.
 */
export function mergeMealWithRemoteSnapshot(
  local: MealEntry,
  remote: MealEntry
): MealEntry {
  const localMs = mealEditTimestampMs(local);
  const remoteMs = mealEditTimestampMs(remote);
  const base =
    localMs >= remoteMs ? { ...remote, ...local } : { ...local, ...remote };
  if (base.mealTime !== undefined) {
    return { ...base, mealTime: normaliseMealTime(base.mealTime) };
  }
  return base;
}
