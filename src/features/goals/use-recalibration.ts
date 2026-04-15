/**
 * useRecalibration — Hook for HealthKit Estimate Recalibration
 *
 * Computes whether the user's calorie estimate needs adjustment
 * based on real weight trend + intake data, and provides an
 * `applyRecalibration()` action to update the goal plan.
 */

import { useMemo } from "react";
import { buildGoalPlan } from "../goals/goal-calculation.service";
import { useGoalsStore } from "../goals/goals.store";
import {
    computeRecalibration,
    type RecalibrationResult,
} from "../goals/recalibration.service";
import { useNutritionStore } from "../nutrition/nutrition.store";
import { useProfileStore } from "../profile/profile.store";
import { useProgressStore } from "../progress/progress.store";

export function useRecalibration() {
  const profile = useProfileStore((state) => state.profile);
  const setCurrentWeightLbs = useProfileStore(
    (state) => state.setCurrentWeightLbs
  );
  const weightLogs = useProgressStore((state) => state.weightLogs);
  const meals = useNutritionStore((state) => state.meals);
  const plan = useGoalsStore((state) => state.plan);
  const goalType = useGoalsStore((state) => state.goalType);
  const timeframeWeeks = useGoalsStore((state) => state.timeframeWeeks);
  const setPlan = useGoalsStore((state) => state.setPlan);

  const result: RecalibrationResult | null = useMemo(() => {
    if (!plan) return null;
    return computeRecalibration({
      weightLogs,
      meals,
      currentPlan: plan,
      goalType,
    });
  }, [weightLogs, meals, plan, goalType]);

  function applyRecalibration() {
    if (!result?.suggestedBudget || !plan || !timeframeWeeks) return;

    // Update profile weight to latest
    if (result.endWeight > 0) {
      setCurrentWeightLbs(result.endWeight);
    }

    // Rebuild plan with the recalibrated maintenance TDEE
    const updatedProfile = {
      ...profile,
      currentWeightLbs: result.endWeight || profile.currentWeightLbs,
    };

    const newPlan = buildGoalPlan({
      profile: updatedProfile,
      goalType,
      timeframeWeeks,
    });

    // Override the calorie budget with the recalibrated suggestion
    setPlan({
      ...newPlan,
      maintenanceCalories: result.actualTDEE,
      calorieBudget: result.suggestedBudget,
    });
  }

  return {
    result,
    applyRecalibration,
  };
}
