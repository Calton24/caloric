import { create } from "zustand";
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

export const useGoalsStore = create<GoalsStore>((set) => ({
  goalType: "lose",
  timeframeWeeks: null,
  plan: null,

  setGoalType: (goalType) => set({ goalType }),
  setTimeframeWeeks: (timeframeWeeks) => set({ timeframeWeeks }),
  setPlan: (plan) => set({ plan }),
  clearPlan: () => set({ plan: null }),
}));
