import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getStorage } from "../../infrastructure/storage";
import { seedStreakCache } from "./streak.service";
import type { StreakInfo } from "./streak.types";

interface StreakStore extends StreakInfo {
  /** Whether a streak freeze is available (pro users get one per streak) */
  streakFreezeAvailable: boolean;
  /** Whether the freeze was already used in the current streak */
  streakFreezeUsed: boolean;
  setStreak: (info: StreakInfo) => void;
  /** Grant a streak freeze (called when user goes pro) */
  grantFreeze: () => void;
  /** Consume the streak freeze (auto-called when streak would break) */
  useFreeze: () => void;
  /** Reset freeze when a new streak starts */
  resetFreeze: () => void;
}

export const useStreakStore = create<StreakStore>()(
  persist(
    (set) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null,
      streakStartDate: null,
      streakFreezeAvailable: false,
      streakFreezeUsed: false,

      setStreak: (info) => {
        if (__DEV__) {
          console.log(
            `[Streak] setStreak called: current=${info.currentStreak}, longest=${info.longestStreak}, lastLog=${info.lastLogDate}`,
            new Error().stack?.split("\n").slice(1, 4).join("\n")
          );
        }
        set(info);
      },
      grantFreeze: () =>
        set({ streakFreezeAvailable: true, streakFreezeUsed: false }),
      useFreeze: () =>
        set({ streakFreezeAvailable: false, streakFreezeUsed: true }),
      resetFreeze: () =>
        set({ streakFreezeAvailable: false, streakFreezeUsed: false }),
    }),
    {
      name: "caloric-streak",
      storage: createJSONStorage(() => ({
        getItem: (key: string) => getStorage().getItem(key),
        setItem: (key: string, value: string) =>
          getStorage().setItem(key, value),
        removeItem: (key: string) => getStorage().removeItem(key),
      })),
      // Exclude currentStreak from persistence — it is always derived
      // fresh from local meals by computeLocalStreak(). Persisting it
      // caused a race condition where a stale value from AsyncStorage
      // would overwrite the freshly computed streak.
      partialize: (state) => ({
        longestStreak: state.longestStreak,
        lastLogDate: state.lastLogDate,
        streakStartDate: state.streakStartDate,
        streakFreezeAvailable: state.streakFreezeAvailable,
        streakFreezeUsed: state.streakFreezeUsed,
      }),
      // Version 1: strip currentStreak from old persisted data that
      // was written before the partialize fix. Without this, Zustand skips
      // the merge function when versions differ and logs a console error.
      version: 1,
      migrate: (persisted: unknown, version: number) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        if (version === 0) {
          // v0 → v1: remove stale currentStreak
          const { currentStreak: _drop, ...rest } = p;
          if (__DEV__) {
            console.log(
              `[Streak] migrate v0→v1: dropping persisted currentStreak=${p.currentStreak}`
            );
          }
          return rest;
        }
        return p;
      },
      // Belt-and-suspenders: also strip currentStreak from any persisted
      // state during merge, in case storage was written incorrectly.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { currentStreak: _drop, ...safe } = p;
        return { ...current, ...safe };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (__DEV__) {
            console.log(
              `[Streak] onRehydrateStorage: current=${state.currentStreak}, longest=${state.longestStreak}, lastLog=${state.lastLogDate}`
            );
          }
          seedStreakCache({
            currentStreak: state.currentStreak,
            longestStreak: state.longestStreak,
            lastLogDate: state.lastLogDate,
            streakStartDate: state.streakStartDate,
          });
        }
      },
    }
  )
);
