import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getStorage } from "../../infrastructure/storage";
import { MealEntry } from "./nutrition.types";

interface NutritionStore {
  meals: MealEntry[];
  /**
   * IDs of meals the user has deleted locally. Used as client-side
   * tombstones so that `restoreFromSupabase` can never re-add a meal
   * the user has removed (and so the deletion survives until the
   * server-side hard-delete confirms).
   */
  deletedMealIds: string[];
  /**
   * IDs known to exist (or to have existed) on the server. Set after a
   * successful `pushMeal` upsert OR after appearing in a `pullMeals`
   * response. Used by `reconcileWithServer` to safely distinguish:
   *   - a local meal that hasn't been pushed yet (keep)
   *   - a local meal the server confirmed and now reports as gone (drop)
   */
  syncedMealIds: string[];

  addMeal: (meal: MealEntry) => void;
  updateMeal: (mealId: string, updates: Partial<Omit<MealEntry, "id">>) => void;
  removeMeal: (mealId: string) => void;
  /** Drop a tombstone after the server confirms the delete (or after TTL). */
  forgetTombstone: (mealId: string) => void;
  /** Mark a meal id as known to the server. Idempotent. */
  markMealSynced: (mealId: string) => void;
  /**
   * Reconcile local state against an authoritative snapshot from the
   * server. Removes local meals that the server has soft-deleted, and
   * removes previously-synced local meals that the server no longer
   * lists as active (i.e. hard-deleted from another device). Local
   * meals that have NEVER been synced are kept — they're pending push.
   */
  reconcileWithServer: (
    serverActiveIds: ReadonlySet<string>,
    serverDeletedIds: ReadonlySet<string>
  ) => void;
  clearMealsForDate: (date: string) => void;
  resetMeals: () => void;
}

/**
 * Schema version for true storage migrations (NOT for day rollovers).
 *
 * v1 → v2: normalise legacy local-time `loggedAt` strings to UTC ISO so that
 * `new Date(loggedAt)` is timezone-correct everywhere. Old entries written by
 * `toLocalDateTime()` looked like `"2026-04-25T23:00:00"` (no `Z`) and were
 * being parsed as local time on the client but stored as UTC on Supabase,
 * causing a 1-hour drift that wrapped meals onto the wrong calendar day.
 */
const STORAGE_VERSION = 2;

/**
 * Convert a legacy local-time string (no timezone offset) to UTC ISO.
 * Already-UTC strings (containing `Z` or `+HH:MM`/`-HH:MM`) are left alone.
 */
function normaliseLoggedAt(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    return new Date().toISOString();
  }
  const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
  if (hasTimezone) return value;
  // Treat the legacy string as local wall-clock time and convert to UTC ISO
  const local = new Date(value);
  if (Number.isNaN(local.getTime())) {
    return new Date().toISOString();
  }
  return local.toISOString();
}

export const useNutritionStore = create<NutritionStore>()(
  persist(
    (set) => ({
      meals: [],
      deletedMealIds: [],
      syncedMealIds: [],

      addMeal: (meal) =>
        set((state) => ({
          meals: [meal, ...state.meals],
          // If the user re-logs a previously-deleted meal id, clear the tombstone
          deletedMealIds: state.deletedMealIds.filter((id) => id !== meal.id),
        })),

      updateMeal: (mealId, updates) =>
        set((state) => ({
          meals: state.meals.map((meal) =>
            meal.id === mealId ? { ...meal, ...updates } : meal
          ),
        })),

      removeMeal: (mealId) =>
        set((state) => ({
          meals: state.meals.filter((meal) => meal.id !== mealId),
          deletedMealIds: state.deletedMealIds.includes(mealId)
            ? state.deletedMealIds
            : [...state.deletedMealIds, mealId],
          // Once the user deletes locally, drop the synced flag — re-pulling
          // would otherwise behave as if it were "still confirmed by server".
          syncedMealIds: state.syncedMealIds.filter((id) => id !== mealId),
        })),

      forgetTombstone: (mealId) =>
        set((state) => ({
          deletedMealIds: state.deletedMealIds.filter((id) => id !== mealId),
        })),

      markMealSynced: (mealId) =>
        set((state) =>
          state.syncedMealIds.includes(mealId)
            ? state
            : { syncedMealIds: [...state.syncedMealIds, mealId] }
        ),

      reconcileWithServer: (serverActiveIds, serverDeletedIds) =>
        set((state) => {
          const droppedIds: string[] = [];
          const remaining = state.meals.filter((meal) => {
            // Server says deleted (soft-delete tombstone visible) → drop
            if (serverDeletedIds.has(meal.id)) {
              droppedIds.push(meal.id);
              return false;
            }
            // Previously synced and now missing from server's active set →
            // it was deleted from another device (hard or soft) → drop
            if (
              state.syncedMealIds.includes(meal.id) &&
              !serverActiveIds.has(meal.id)
            ) {
              droppedIds.push(meal.id);
              return false;
            }
            return true;
          });
          if (droppedIds.length === 0) return state;
          if (__DEV__) {
            console.log(
              `[Nutrition] reconcile: dropped ${droppedIds.length} meal(s) deleted on another device`,
              droppedIds
            );
          }
          return {
            meals: remaining,
            // The dropped ids are no longer "ours" — drop their synced flag
            // so we never resurrect them via a future race.
            syncedMealIds: state.syncedMealIds.filter(
              (id) => !droppedIds.includes(id)
            ),
          };
        }),

      clearMealsForDate: (date) =>
        set((state) => {
          const removedIds: string[] = [];
          const remaining = state.meals.filter((meal) => {
            // Compare by UTC-derived local date so this matches getMealsForDate
            const mealDate = new Date(meal.loggedAt);
            const localDate = `${mealDate.getFullYear()}-${String(
              mealDate.getMonth() + 1
            ).padStart(2, "0")}-${String(mealDate.getDate()).padStart(2, "0")}`;
            if (localDate === date) {
              removedIds.push(meal.id);
              return false;
            }
            return true;
          });
          return {
            meals: remaining,
            deletedMealIds: [
              ...state.deletedMealIds,
              ...removedIds.filter((id) => !state.deletedMealIds.includes(id)),
            ],
            syncedMealIds: state.syncedMealIds.filter(
              (id) => !removedIds.includes(id)
            ),
          };
        }),

      resetMeals: () =>
        set({ meals: [], deletedMealIds: [], syncedMealIds: [] }),
    }),
    {
      name: "caloric-meals",
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => ({
        getItem: (key: string) => getStorage().getItem(key),
        setItem: (key: string, value: string) =>
          getStorage().setItem(key, value),
        removeItem: (key: string) => getStorage().removeItem(key),
      })),
      /**
       * Real storage migration. Runs ONCE per user, only when the persisted
       * version differs from STORAGE_VERSION. Do NOT use this for day-rollover
       * cleanup — `migrate` is not invoked on hot reload, app start, or resume
       * once the version matches. Old meals stay in storage; the UI filters
       * them out on read via `getMealsForDate(meals, today)`.
       */
      migrate: (persistedState, version) => {
        const incoming = (persistedState ?? {}) as Partial<NutritionStore>;

        // Ensure tombstones array exists (added in v2)
        const deletedMealIds = Array.isArray(incoming.deletedMealIds)
          ? incoming.deletedMealIds
          : [];

        // v1 (and earlier) stored some loggedAt values as bare local datetimes.
        // Normalise every meal's timestamp to UTC ISO so date math is stable.
        const meals = Array.isArray(incoming.meals)
          ? incoming.meals.map((m) => ({
              ...m,
              loggedAt: normaliseLoggedAt(m.loggedAt),
            }))
          : [];

        // Treat every existing meal as already synced. They've been pushed
        // to Supabase across many sessions before this version landed, so
        // assuming they're known to the server is safer than treating them
        // as pending push (which would block reconcile from removing them
        // on the first cross-device delete).
        const syncedMealIds = Array.isArray(incoming.syncedMealIds)
          ? incoming.syncedMealIds
          : meals.map((m) => m.id);

        if (__DEV__ && version < STORAGE_VERSION) {
          console.log(
            `[Nutrition] migrate v${version} → v${STORAGE_VERSION}: normalised ${meals.length} meal timestamps, seeded ${syncedMealIds.length} synced ids`
          );
        }

        return { meals, deletedMealIds, syncedMealIds };
      },
    }
  )
);
