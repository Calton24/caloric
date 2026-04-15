import { GoalPlan } from "../../features/goals/goals.types";
import { MealEntry } from "../../features/nutrition/nutrition.types";
import { UserProfile } from "../../features/profile/profile.types";
import { WeightLog } from "../../features/progress/progress.types";

export const mockProfile: UserProfile = {
  id: "local-user",
  gender: "male",
  birthYear: 1998,
  heightCm: 178,
  currentWeightLbs: 176.4,
  goalWeightLbs: 157,
  activityLevel: "moderate",
  weightUnit: "lbs",
  heightUnit: "cm",
  onboardingCompleted: true,
  waterGoalMl: 2000,
  waterIncrementMl: 250,
};

export const mockPlan: GoalPlan = {
  goalType: "lose",
  maintenanceCalories: 2600,
  calorieBudget: 2050,
  weeklyRateLbs: 1.1,
  timeframeWeeks: 17,
  targetDate: "2026-07-01T00:00:00.000Z",
  macros: {
    protein: 154,
    carbs: 256,
    fat: 46,
  },
};

export const mockMeals: MealEntry[] = [
  {
    id: "meal_1",
    title: "Yazoo Milkshake With Belgian Waffle And Two 6-Foot Bmt Subways",
    source: "manual",
    calories: 2922,
    protein: 150,
    carbs: 367,
    fat: 96,
    loggedAt: "2026-03-06T22:03:00.000Z",
  },
];

export const mockWeightLogs: WeightLog[] = [
  { id: "w1", date: "2026-03-06", weightLbs: 176.4 },
  { id: "w2", date: "2026-03-01", weightLbs: 177.6 },
  { id: "w3", date: "2026-02-20", weightLbs: 178.9 },
];
