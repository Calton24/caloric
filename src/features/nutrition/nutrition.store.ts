import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  resolveMealLoggedAtUtc,
  resolveMealLoggedDateLocal,
} from "../food-logging/time/create-meal-timestamp-fields";
import { getStorage } from "../../infrastructure/storage";
import { mergeMealWithRemoteSnapshot } from "./meal-merge";
import { normaliseMealTime } from "./mealtime";
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
  /**
   * Merges repository-backed meal rows into the in-memory list.
   * Rows win on id collision (authoritative snapshot); meals only in memory
   * are kept so a not-yet-indexed persist cannot wipe the UI.
   */
  mergeMealsFromRepositorySnapshot: (meals: MealEntry[]) => void;
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
const STORAGE_VERSION = 3;

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
          meals: state.meals.map((meal) => {
            if (meal.id !== mealId) return meal;
            const merged = { ...meal, ...updates };
            return {
              ...merged,
              ...(merged.mealTime !== undefined
                ? { mealTime: normaliseMealTime(merged.mealTime) }
                : {}),
              updatedAt: updates.updatedAt ?? new Date().toISOString(),
            } satisfies MealEntry;
          }),
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
            if (resolveMealLoggedDateLocal(meal) === date) {
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
      mergeMealsFromRepositorySnapshot: (rows) =>
        set((state) => {
          const deleted = new Set(state.deletedMealIds);
          const byId = new Map<string, MealEntry>();
          for (const m of state.meals) {
            if (deleted.has(m.id)) continue;
            byId.set(m.id, m);
          }
          for (const m of rows) {
            if (deleted.has(m.id)) continue;
            const local = byId.get(m.id);
            if (local) {
              byId.set(m.id, mergeMealWithRemoteSnapshot(local, m));
            } else {
              byId.set(m.id, m);
            }
          }
          const meals = Array.from(byId.values()).sort(
            (a, b) =>
              +new Date(resolveMealLoggedAtUtc(b)) -
              +new Date(resolveMealLoggedAtUtc(a))
          );
          return { meals };
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

        // Meals are runtime-only now (persisted separately via repository), so
        // synced ids can only come from previous synced ids or stay empty.
        const syncedMealIds = Array.isArray(incoming.syncedMealIds)
          ? incoming.syncedMealIds
          : [];

        if (__DEV__ && version < STORAGE_VERSION) {
          console.log(
            `[Nutrition] migrate v${version} → v${STORAGE_VERSION}: meals moved to repository; retained ${syncedMealIds.length} synced ids`
          );
        }

        return { meals: [], deletedMealIds, syncedMealIds };
      },
      partialize: (state) => ({
        deletedMealIds: state.deletedMealIds,
        syncedMealIds: state.syncedMealIds,
      }),
    }
  )
);
