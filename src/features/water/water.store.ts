/**
 * Water Store
 * Persists daily water intake keyed by ISO date string.
 * Uses AsyncStorage (via getStorage) so data survives app restarts.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getStorage } from "../../infrastructure/storage";

interface WaterState {
  /** Map of ISO date → ml consumed that day */
  intakeByDate: Record<string, number>;
  /** Add ml to a given day */
  addMl: (date: string, ml: number) => void;
  /** Remove ml from a given day (floors at 0) */
  subtractMl: (date: string, ml: number) => void;
  /** Directly set ml for a given day */
  setMl: (date: string, ml: number) => void;
  /** Get ml for a specific date (0 if not tracked) */
  getMl: (date: string) => number;
}

export const useWaterStore = create<WaterState>()(
  persist(
    (set, get) => ({
      intakeByDate: {},

      addMl: (date, ml) =>
        set((state) => ({
          intakeByDate: {
            ...state.intakeByDate,
            [date]: (state.intakeByDate[date] ?? 0) + ml,
          },
        })),

      subtractMl: (date, ml) =>
        set((state) => ({
          intakeByDate: {
            ...state.intakeByDate,
            [date]: Math.max(0, (state.intakeByDate[date] ?? 0) - ml),
          },
        })),

      setMl: (date, ml) =>
        set((state) => ({
          intakeByDate: { ...state.intakeByDate, [date]: Math.max(0, ml) },
        })),

      getMl: (date) => get().intakeByDate[date] ?? 0,
    }),
    {
      name: "caloric-water",
      storage: createJSONStorage(() => ({
        getItem: (key: string) => getStorage().getItem(key),
        setItem: (key: string, value: string) =>
          getStorage().setItem(key, value),
        removeItem: (key: string) => getStorage().removeItem(key),
      })),
    }
  )
);
