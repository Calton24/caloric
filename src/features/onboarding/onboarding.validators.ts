import { UserProfile } from "../profile/profile.types";

export function isBodyMeasurementsComplete(profile: UserProfile): boolean {
  return Boolean(
    profile.gender &&
    profile.birthYear &&
    profile.heightCm &&
    profile.currentWeightLbs
  );
}

export function isActivityLevelComplete(profile: UserProfile): boolean {
  return Boolean(profile.activityLevel);
}

export function isGoalWeightComplete(profile: UserProfile): boolean {
  return Boolean(profile.goalWeightLbs);
}

export function canGeneratePlan(
  profile: UserProfile,
  timeframeWeeks: number | null
): boolean {
  return Boolean(
    profile.gender &&
    profile.birthYear &&
    profile.heightCm &&
    profile.currentWeightLbs &&
    profile.goalWeightLbs &&
    profile.activityLevel &&
    timeframeWeeks
  );
}
