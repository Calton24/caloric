import { create } from "zustand";
import { WeightLog } from "./progress.types";

interface ProgressStore {
  weightLogs: WeightLog[];
  addWeightLog: (log: WeightLog) => void;
  updateWeightLog: (id: string, weightLbs: number) => void;
  resetWeightLogs: () => void;
}

export const useProgressStore = create<ProgressStore>((set) => ({
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
}));
