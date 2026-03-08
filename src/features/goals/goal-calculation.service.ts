import { ActivityLevel, UserProfile } from "../profile/profile.types";
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
