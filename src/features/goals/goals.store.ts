import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getStorage } from "../../infrastructure/storage";
import { GoalPlan, GoalType } from "./goals.types";

interface GoalsStore {
  goalType: GoalType;
  timeframeWeeks: number | null;
  plan: GoalPlan | null;
  setGoalType: (goalType: GoalType) => void;
  setTimeframeWeeks: (weeks: number) => void;
  setPlan: (plan: GoalPlan) => void;
  clearPlan: () => void;
}

export const useGoalsStore = create<GoalsStore>()(
  persist(
    (set) => ({
      goalType: "lose",
      timeframeWeeks: null,
      plan: null,

      setGoalType: (goalType) => set({ goalType }),
      setTimeframeWeeks: (timeframeWeeks) => set({ timeframeWeeks }),
      setPlan: (plan) => set({ plan }),
      clearPlan: () => set({ plan: null }),
    }),
    {
      name: "caloric-goals",
      storage: createJSONStorage(() => ({
        getItem: (key: string) => getStorage().getItem(key),
        setItem: (key: string, value: string) =>
          getStorage().setItem(key, value),
        removeItem: (key: string) => getStorage().removeItem(key),
      })),
    }
  )
);
