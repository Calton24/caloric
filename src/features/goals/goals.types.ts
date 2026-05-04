export type GoalType = "lose" | "maintain" | "gain" | "health";

export interface MacroTargets {
  protein: number;
  carbs: number;
  fat: number;
}

export interface GoalPlan {
  goalType: GoalType;
  maintenanceCalories: number;
  calorieBudget: number;
  weeklyRateLbs: number;
  timeframeWeeks: number;
  targetDate: string | null;
  macros: MacroTargets;
}
