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

      setStreak: (info) => set(info),
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
      onRehydrateStorage: () => (state) => {
        if (state) {
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
