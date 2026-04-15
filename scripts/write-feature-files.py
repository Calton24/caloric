#!/usr/bin/env python3
"""Write all feature files to exact specifications."""
import os

base = "/Users/calton/Coding/Mobile/caloric/src/features"
lib_base = "/Users/calton/Coding/Mobile/caloric/src/lib"

files = {}

# === TYPE FILES ===

files[f"{base}/profile/profile.types.ts"] = """export type Gender = "male" | "female" | "other";
export type WeightUnit = "lbs" | "kg";
export type HeightUnit = "cm" | "ft_in";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very"
  | "super";

export interface UserProfile {
  id: string;
  gender: Gender | null;
  birthYear: number | null;
  heightCm: number | null;
  currentWeightLbs: number | null;
  goalWeightLbs: number | null;
  activityLevel: ActivityLevel | null;
  weightUnit: WeightUnit;
  heightUnit: HeightUnit;
  onboardingCompleted: boolean;
}
"""

files[f"{base}/goals/goals.types.ts"] = """export type GoalType = "lose" | "maintain" | "gain";

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
"""

files[f"{base}/nutrition/nutrition.types.ts"] = """export type MealSource = "voice" | "manual" | "camera";

export interface MealEntry {
  id: string;
  title: string;
  source: MealSource;
  rawInput?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  loggedAt: string;
}

export interface DailyNutritionSummary {
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  meals: MealEntry[];
}
"""

files[f"{base}/progress/progress.types.ts"] = """export interface WeightLog {
  id: string;
  date: string;
  weightLbs: number;
}

export interface ProgressPoint {
  label: string;
  weightLbs: number;
  goalWeightLbs: number;
}
"""

files[f"{base}/permissions/permissions.types.ts"] = """export type PermissionStatus = "unknown" | "granted" | "denied";

export interface PermissionState {
  microphone: PermissionStatus;
  speechRecognition: PermissionStatus;
  camera: PermissionStatus;
  notifications: PermissionStatus;
  liveActivitiesEnabled: boolean;
  appleHealthReadEnabled: boolean;
  appleHealthWriteEnabled: boolean;
}
"""

files[f"{base}/subscription/subscription.types.ts"] = """export type SubscriptionPlan = "monthly" | "annual" | null;

export interface SubscriptionState {
  hasActiveSubscription: boolean;
  trialStarted: boolean;
  trialEndsAt: string | null;
  plan: SubscriptionPlan;
  paywallSeen: boolean;
}
"""

# === STORE FILES ===

files[f"{base}/profile/profile.store.ts"] = """import { create } from "zustand";
import { ActivityLevel, Gender, UserProfile } from "./profile.types";

interface ProfileStore {
  profile: UserProfile;
  setGender: (gender: Gender) => void;
  setBirthYear: (year: number) => void;
  setHeightCm: (heightCm: number) => void;
  setCurrentWeightLbs: (weight: number) => void;
  setGoalWeightLbs: (weight: number) => void;
  setActivityLevel: (level: ActivityLevel) => void;
  setOnboardingCompleted: (completed: boolean) => void;
  resetProfile: () => void;
}

export const initialProfile: UserProfile = {
  id: "local-user",
  gender: null,
  birthYear: null,
  heightCm: null,
  currentWeightLbs: null,
  goalWeightLbs: null,
  activityLevel: null,
  weightUnit: "lbs",
  heightUnit: "cm",
  onboardingCompleted: false,
};

export const useProfileStore = create<ProfileStore>((set) => ({
  profile: initialProfile,

  setGender: (gender) =>
    set((state) => ({
      profile: { ...state.profile, gender },
    })),

  setBirthYear: (birthYear) =>
    set((state) => ({
      profile: { ...state.profile, birthYear },
    })),

  setHeightCm: (heightCm) =>
    set((state) => ({
      profile: { ...state.profile, heightCm },
    })),

  setCurrentWeightLbs: (currentWeightLbs) =>
    set((state) => ({
      profile: { ...state.profile, currentWeightLbs },
    })),

  setGoalWeightLbs: (goalWeightLbs) =>
    set((state) => ({
      profile: { ...state.profile, goalWeightLbs },
    })),

  setActivityLevel: (activityLevel) =>
    set((state) => ({
      profile: { ...state.profile, activityLevel },
    })),

  setOnboardingCompleted: (onboardingCompleted) =>
    set((state) => ({
      profile: { ...state.profile, onboardingCompleted },
    })),

  resetProfile: () => set({ profile: initialProfile }),
}));
"""

files[f"{base}/goals/goals.store.ts"] = """import { create } from "zustand";
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
"""

files[f"{base}/nutrition/nutrition.store.ts"] = """import { create } from "zustand";
import { MealEntry } from "./nutrition.types";

interface NutritionStore {
  meals: MealEntry[];
  addMeal: (meal: MealEntry) => void;
  removeMeal: (mealId: string) => void;
  clearMealsForDate: (date: string) => void;
  resetMeals: () => void;
}

export const useNutritionStore = create<NutritionStore>((set) => ({
  meals: [],

  addMeal: (meal) =>
    set((state) => ({
      meals: [meal, ...state.meals],
    })),

  removeMeal: (mealId) =>
    set((state) => ({
      meals: state.meals.filter((meal) => meal.id !== mealId),
    })),

  clearMealsForDate: (date) =>
    set((state) => ({
      meals: state.meals.filter((meal) => !meal.loggedAt.startsWith(date)),
    })),

  resetMeals: () => set({ meals: [] }),
}));
"""

files[f"{base}/progress/progress.store.ts"] = """import { create } from "zustand";
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
"""

files[f"{base}/permissions/permissions.store.ts"] = """import { create } from "zustand";
import { PermissionState, PermissionStatus } from "./permissions.types";

interface PermissionsStore {
  permissions: PermissionState;
  setPermission: (
    key: "microphone" | "speechRecognition" | "camera" | "notifications",
    status: PermissionStatus
  ) => void;
  setLiveActivitiesEnabled: (enabled: boolean) => void;
  setAppleHealthReadEnabled: (enabled: boolean) => void;
  setAppleHealthWriteEnabled: (enabled: boolean) => void;
  resetPermissions: () => void;
}

export const initialPermissions: PermissionState = {
  microphone: "unknown",
  speechRecognition: "unknown",
  camera: "unknown",
  notifications: "unknown",
  liveActivitiesEnabled: false,
  appleHealthReadEnabled: false,
  appleHealthWriteEnabled: false,
};

export const usePermissionsStore = create<PermissionsStore>((set) => ({
  permissions: initialPermissions,

  setPermission: (key, status) =>
    set((state) => ({
      permissions: {
        ...state.permissions,
        [key]: status,
      },
    })),

  setLiveActivitiesEnabled: (liveActivitiesEnabled) =>
    set((state) => ({
      permissions: {
        ...state.permissions,
        liveActivitiesEnabled,
      },
    })),

  setAppleHealthReadEnabled: (appleHealthReadEnabled) =>
    set((state) => ({
      permissions: {
        ...state.permissions,
        appleHealthReadEnabled,
      },
    })),

  setAppleHealthWriteEnabled: (appleHealthWriteEnabled) =>
    set((state) => ({
      permissions: {
        ...state.permissions,
        appleHealthWriteEnabled,
      },
    })),

  resetPermissions: () => set({ permissions: initialPermissions }),
}));
"""

files[f"{base}/subscription/subscription.store.ts"] = """import { create } from "zustand";
import { SubscriptionPlan, SubscriptionState } from "./subscription.types";

interface SubscriptionStore {
  subscription: SubscriptionState;
  startTrial: (
    plan: Exclude<SubscriptionPlan, null>,
    trialEndsAt: string
  ) => void;
  activateSubscription: (plan: Exclude<SubscriptionPlan, null>) => void;
  markPaywallSeen: () => void;
  resetSubscription: () => void;
}

export const initialSubscription: SubscriptionState = {
  hasActiveSubscription: false,
  trialStarted: false,
  trialEndsAt: null,
  plan: null,
  paywallSeen: false,
};

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  subscription: initialSubscription,

  startTrial: (plan, trialEndsAt) =>
    set({
      subscription: {
        hasActiveSubscription: true,
        trialStarted: true,
        trialEndsAt,
        plan,
        paywallSeen: true,
      },
    }),

  activateSubscription: (plan) =>
    set((state) => ({
      subscription: {
        ...state.subscription,
        hasActiveSubscription: true,
        plan,
      },
    })),

  markPaywallSeen: () =>
    set((state) => ({
      subscription: {
        ...state.subscription,
        paywallSeen: true,
      },
    })),

  resetSubscription: () => set({ subscription: initialSubscription }),
}));
"""

# === SELECTORS ===

files[f"{base}/nutrition/nutrition.selectors.ts"] = """import { MealEntry } from "./nutrition.types";

export function getMealsForDate(meals: MealEntry[], date: string): MealEntry[] {
  return meals.filter((meal) => meal.loggedAt.startsWith(date));
}

export function getNutritionTotals(meals: MealEntry[]) {
  return meals.reduce(
    (acc, meal) => {
      acc.calories += meal.calories;
      acc.protein += meal.protein;
      acc.carbs += meal.carbs;
      acc.fat += meal.fat;
      return acc;
    },
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }
  );
}
"""

files[f"{base}/progress/progress.selectors.ts"] = """import { WeightLog } from "./progress.types";

export function getLatestWeight(weightLogs: WeightLog[]): number | null {
  if (!weightLogs.length) return null;
  return weightLogs[0].weightLbs;
}

export function getWeightTrendPercentage(weightLogs: WeightLog[]): number | null {
  if (weightLogs.length < 2) return null;

  const latest = weightLogs[0].weightLbs;
  const previous = weightLogs[1].weightLbs;

  if (previous === 0) return null;

  return Number((((latest - previous) / previous) * 100).toFixed(1));
}
"""

# === GOAL CALCULATION SERVICE ===

files[f"{base}/goals/goal-calculation.service.ts"] = """import { ActivityLevel, UserProfile } from "../profile/profile.types";
import { GoalPlan, GoalType } from "./goals.types";

function getActivityMultiplier(level: ActivityLevel): number {
  switch (level) {
    case "sedentary":
      return 1.2;
    case "light":
      return 1.375;
    case "moderate":
      return 1.55;
    case "very":
      return 1.725;
    case "super":
      return 1.9;
    default:
      return 1.2;
  }
}

function lbsToKg(weightLbs: number): number {
  return weightLbs * 0.45359237;
}

function calculateAge(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

function calculateBmr(profile: UserProfile): number {
  if (
    !profile.birthYear ||
    !profile.heightCm ||
    !profile.currentWeightLbs ||
    !profile.gender
  ) {
    throw new Error("Missing profile data required for BMR calculation");
  }

  const age = calculateAge(profile.birthYear);
  const weightKg = lbsToKg(profile.currentWeightLbs);

  if (profile.gender === "male") {
    return 10 * weightKg + 6.25 * profile.heightCm - 5 * age + 5;
  }

  if (profile.gender === "female") {
    return 10 * weightKg + 6.25 * profile.heightCm - 5 * age - 161;
  }

  return 10 * weightKg + 6.25 * profile.heightCm - 5 * age - 78;
}

export function buildGoalPlan(params: {
  profile: UserProfile;
  goalType: GoalType;
  timeframeWeeks: number;
}): GoalPlan {
  const { profile, goalType, timeframeWeeks } = params;

  if (
    !profile.activityLevel ||
    !profile.currentWeightLbs ||
    !profile.goalWeightLbs
  ) {
    throw new Error("Missing profile data required for goal plan");
  }

  const bmr = calculateBmr(profile);
  const maintenanceCalories = Math.round(
    bmr * getActivityMultiplier(profile.activityLevel)
  );

  const totalWeightDelta = Math.abs(
    profile.currentWeightLbs - profile.goalWeightLbs
  );

  const weeklyRateLbs =
    timeframeWeeks > 0 ? totalWeightDelta / timeframeWeeks : 0;

  const dailyAdjustment = Math.round((weeklyRateLbs * 3500) / 7);

  let calorieBudget = maintenanceCalories;

  if (goalType === "lose") {
    calorieBudget -= dailyAdjustment;
  } else if (goalType === "gain") {
    calorieBudget += dailyAdjustment;
  }

  calorieBudget = Math.max(calorieBudget, 1200);

  const protein = Math.round(profile.currentWeightLbs * 0.8);
  const fat = Math.round((calorieBudget * 0.25) / 9);
  const carbs = Math.round((calorieBudget - protein * 4 - fat * 9) / 4);

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + timeframeWeeks * 7);

  return {
    goalType,
    maintenanceCalories,
    calorieBudget,
    weeklyRateLbs: Number(weeklyRateLbs.toFixed(2)),
    timeframeWeeks,
    targetDate: targetDate.toISOString(),
    macros: {
      protein,
      carbs,
      fat,
    },
  };
}
"""

# === STORAGE KEYS ===

os.makedirs(f"{lib_base}/storage", exist_ok=True)
files[f"{lib_base}/storage/storage.keys.ts"] = """export const STORAGE_KEYS = {
  profile: "caloric_profile",
  goals: "caloric_goals",
  nutrition: "caloric_nutrition",
  progress: "caloric_progress",
  permissions: "caloric_permissions",
  subscription: "caloric_subscription",
} as const;
"""

# === MOCK DATA ===

os.makedirs(f"{lib_base}/constants", exist_ok=True)
files[f"{lib_base}/constants/mock-data.ts"] = """import { GoalPlan } from "@/features/goals/goals.types";
import { MealEntry } from "@/features/nutrition/nutrition.types";
import { UserProfile } from "@/features/profile/profile.types";
import { WeightLog } from "@/features/progress/progress.types";

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
"""

# Write all files
for path, content in files.items():
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f"OK {os.path.basename(path)}")

print(f"\nWrote {len(files)} files total.")
