import { buildGoalPlan } from "../goals/goal-calculation.service";
import { useGoalsStore } from "../goals/goals.store";
import { useProfileStore } from "../profile/profile.store";
import { getLatestWeight } from "./progress.selectors";
import { useProgressStore } from "./progress.store";

/**
 * Hook to recalculate the goal plan using the latest logged weight.
 *
 * Updates profile.currentWeightLbs with the latest weight log,
 * then rebuilds the goal plan and writes it to the goals store.
 */
export function useRecalculatePlan() {
  const profile = useProfileStore((state) => state.profile);
  const setCurrentWeightLbs = useProfileStore(
    (state) => state.setCurrentWeightLbs
  );
  const weightLogs = useProgressStore((state) => state.weightLogs);
  const goalType = useGoalsStore((state) => state.goalType);
  const timeframeWeeks = useGoalsStore((state) => state.timeframeWeeks);
  const setPlan = useGoalsStore((state) => state.setPlan);

  const latestWeight = getLatestWeight(weightLogs);

  const canRecalculate =
    latestWeight != null &&
    profile.activityLevel != null &&
    profile.birthYear != null &&
    profile.heightCm != null &&
    profile.gender != null &&
    timeframeWeeks != null;

  function recalculate() {
    if (!canRecalculate || latestWeight == null || timeframeWeeks == null) {
      return;
    }

    // Sync latest weight to profile
    setCurrentWeightLbs(latestWeight);

    // Build new plan with updated profile
    const updatedProfile = {
      ...profile,
      currentWeightLbs: latestWeight,
    };

    const newPlan = buildGoalPlan({
      profile: updatedProfile,
      goalType,
      timeframeWeeks,
    });

    setPlan(newPlan);
  }

  return {
    canRecalculate,
    latestWeight,
    recalculate,
  };
}
