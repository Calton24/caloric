import { GoalPlan } from "../goals/goals.types";
import { UserProfile } from "../profile/profile.types";

export function hasMinimumProfileForPlan(profile: UserProfile): boolean {
  return Boolean(
    profile.gender &&
    profile.birthYear &&
    profile.heightCm &&
    profile.currentWeightLbs &&
    profile.goalWeightLbs &&
    profile.activityLevel
  );
}

export function hasGeneratedPlan(plan: GoalPlan | null): boolean {
  return Boolean(plan);
}
