import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getStorage } from "../../infrastructure/storage";
import { WeightLog } from "./progress.types";

interface ProgressStore {
  weightLogs: WeightLog[];
  addWeightLog: (log: WeightLog) => void;
  updateWeightLog: (id: string, weightLbs: number) => void;
  resetWeightLogs: () => void;
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set) => ({
      weightLogs: [],

      addWeightLog: (log) =>
        set((state) => ({
          weightLogs: [log, ...state.weightLogs].sort((a, b) =>
            a.date < b.date ? 1 : -1
          ),
        })),

      updateWeightLog: (id, weightLbs) =>
        set((state) => ({
          weightLogs: state.weightLogs.map((log) =>
            log.id === id ? { ...log, weightLbs } : log
          ),
        })),

      resetWeightLogs: () => set({ weightLogs: [] }),
    }),
    {
      name: "caloric-weight-logs",
      storage: createJSONStorage(() => ({
        getItem: (key: string) => getStorage().getItem(key),
        setItem: (key: string, value: string) =>
          getStorage().setItem(key, value),
        removeItem: (key: string) => getStorage().removeItem(key),
      })),
    }
  )
);
