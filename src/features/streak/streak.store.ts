import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getStorage } from "../../infrastructure/storage";
import { seedStreakCache } from "./streak.service";
import type { StreakInfo } from "./streak.types";

interface StreakStore extends StreakInfo {
  setStreak: (info: StreakInfo) => void;
}

export const useStreakStore = create<StreakStore>()(
  persist(
    (set) => ({
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null,
      streakStartDate: null,

      setStreak: (info) => set(info),
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
