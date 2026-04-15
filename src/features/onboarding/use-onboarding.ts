import { buildGoalPlan } from "../goals/goal-calculation.service";
import { useGoalsStore } from "../goals/goals.store";
import { GoalType } from "../goals/goals.types";
import { useProfileStore } from "../profile/profile.store";
import { ActivityLevel, Gender } from "../profile/profile.types";

type BodyMeasurementsInput = {
  gender: Gender;
  birthYear: number;
  heightCm: number;
  currentWeightLbs: number;
};

export function useOnboarding() {
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const setOnboardingCompleted = useProfileStore(
    (state) => state.setOnboardingCompleted
  );

  const goalType = useGoalsStore((state) => state.goalType);
  const timeframeWeeks = useGoalsStore((state) => state.timeframeWeeks);
  const setGoalType = useGoalsStore((state) => state.setGoalType);
  const setTimeframeWeeks = useGoalsStore((state) => state.setTimeframeWeeks);
  const setPlan = useGoalsStore((state) => state.setPlan);

  function saveGoalType(nextGoalType: GoalType) {
    setGoalType(nextGoalType);
  }

  function saveBodyMeasurements(input: BodyMeasurementsInput) {
    updateProfile({
      gender: input.gender,
      birthYear: input.birthYear,
      heightCm: input.heightCm,
      currentWeightLbs: input.currentWeightLbs,
    });
  }

  function saveActivityLevel(activityLevel: ActivityLevel) {
    updateProfile({ activityLevel });
  }

  function saveGoalWeight(goalWeightLbs: number) {
    updateProfile({ goalWeightLbs });
  }

  function saveTimeframe(weeks: number) {
    setTimeframeWeeks(weeks);
  }

  function calculatePlan() {
    if (!timeframeWeeks) {
      throw new Error("Timeframe is missing");
    }

    const plan = buildGoalPlan({
      profile,
      goalType,
      timeframeWeeks,
    });

    setPlan(plan);
    return plan;
  }

  function completeOnboarding() {
    setOnboardingCompleted(true);
  }

  return {
    profile,
    goalType,
    timeframeWeeks,
    saveGoalType,
    saveBodyMeasurements,
    saveActivityLevel,
    saveGoalWeight,
    saveTimeframe,
    calculatePlan,
    completeOnboarding,
  };
}
