/**
 * Live Activity Feature — Mapper
 *
 * Pure function that transforms store state into a LiveActivityPayload.
 */

import type { GoalPlan } from "../goals/goals.types";
import type { DailyNutritionSummary } from "../nutrition/nutrition.types";
import type { LiveActivityPayload } from "./live-activity.types";

export function mapToLiveActivityPayload(params: {
  plan: GoalPlan | null;
  dailySummary: DailyNutritionSummary;
}): LiveActivityPayload {
  const { plan, dailySummary } = params;

  const calorieBudget = plan?.calorieBudget ?? 0;
  const caloriesConsumed = dailySummary.totalCalories;
  const progress =
    calorieBudget > 0 ? Math.min(caloriesConsumed / calorieBudget, 1) : 0;

  return {
    caloriesConsumed,
    calorieBudget,
    protein: dailySummary.totalProtein,
    carbs: dailySummary.totalCarbs,
    fat: dailySummary.totalFat,
    progress,
  };
}
