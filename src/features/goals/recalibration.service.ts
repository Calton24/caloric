/**
 * HealthKit Estimate Recalibration Service
 *
 * Uses actual weight trend + logged calorie intake to compute a user's
 * real-world TDEE (Total Daily Energy Expenditure), then compares it
 * to the formula-based estimate (Mifflin-St Jeor × activity multiplier).
 *
 * When the actual TDEE diverges by more than a threshold, the service
 * recommends an adjusted calorie budget so the user's weight-loss or
 * weight-gain pace matches their goal.
 *
 * Science:
 *   1 lb of body fat ≈ 3500 kcal
 *   actualTDEE = avgDailyCalories - (weightChangeLbs × 3500 / days)
 *   If losing weight faster than expected → TDEE is higher than estimated
 *   If losing weight slower → TDEE is lower than estimated
 */

import type { MealEntry } from "../nutrition/nutrition.types";
import type { WeightLog } from "../progress/progress.types";
import type { GoalPlan, GoalType } from "./goals.types";

// ─── Constants ───────────────────────────────────────────────────────────────

/** Minimum days of data needed for a meaningful recalibration */
const MIN_DAYS_FOR_RECALIBRATION = 14;

/** Minimum weight logs needed (at least start and end) */
const MIN_WEIGHT_LOGS = 2;

/** Minimum days with logged meals to be representative */
const MIN_DAYS_WITH_MEALS = 7;

/** Calories per pound of body fat */
const CALORIES_PER_LB = 3500;

/** Ignore recalibration if the TDEE difference is under this threshold */
const TDEE_DIFFERENCE_THRESHOLD = 75; // kcal/day

/** Cap the maximum suggested adjustment to avoid wild swings */
const MAX_ADJUSTMENT = 300; // kcal/day

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RecalibrationResult {
  /** Whether enough data exists to produce a recommendation */
  hasEnoughData: boolean;
  /** Number of days of data analyzed */
  daysAnalyzed: number;
  /** Average daily calories consumed over the period */
  avgDailyCalories: number;
  /** Weight at the start of the analysis period (lbs) */
  startWeight: number;
  /** Weight at the end of the analysis period (lbs) */
  endWeight: number;
  /** Total weight change in lbs (negative = lost) */
  weightChangeLbs: number;
  /** Computed real-world TDEE based on weight trend + intake */
  actualTDEE: number;
  /** The formula-based maintenance estimate from the current plan */
  estimatedTDEE: number;
  /** Difference: actual - estimated (positive = burning more than estimated) */
  tdeeDifference: number;
  /** Whether the difference is significant enough to warrant adjustment */
  shouldRecalibrate: boolean;
  /** The suggested new calorie budget (null if no recalibration needed) */
  suggestedBudget: number | null;
  /** Human-readable summary of the finding */
  summary: string;
}

// ─── Core Logic ──────────────────────────────────────────────────────────────

/**
 * Analyze weight + intake data to compute a recalibration recommendation.
 */
export function computeRecalibration(params: {
  weightLogs: WeightLog[];
  meals: MealEntry[];
  currentPlan: GoalPlan;
  goalType: GoalType;
}): RecalibrationResult {
  const { weightLogs, meals, currentPlan, goalType } = params;

  const noData: RecalibrationResult = {
    hasEnoughData: false,
    daysAnalyzed: 0,
    avgDailyCalories: 0,
    startWeight: 0,
    endWeight: 0,
    weightChangeLbs: 0,
    actualTDEE: 0,
    estimatedTDEE: currentPlan.maintenanceCalories,
    tdeeDifference: 0,
    shouldRecalibrate: false,
    suggestedBudget: null,
    summary: "Not enough data yet. Keep logging for at least 2 weeks.",
  };

  if (weightLogs.length < MIN_WEIGHT_LOGS) return noData;

  // Sort weight logs oldest → newest for analysis
  const sorted = [...weightLogs].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );

  const earliest = sorted[0];
  const latest = sorted[sorted.length - 1];

  const startDate = new Date(earliest.date + "T00:00:00");
  const endDate = new Date(latest.date + "T23:59:59");
  const daysAnalyzed = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysAnalyzed < MIN_DAYS_FOR_RECALIBRATION) {
    return {
      ...noData,
      daysAnalyzed,
      startWeight: earliest.weightLbs,
      endWeight: latest.weightLbs,
      summary: `Need ${MIN_DAYS_FOR_RECALIBRATION - daysAnalyzed} more days of data for recalibration.`,
    };
  }

  // Calculate average daily calorie intake from meals in the analysis period
  const mealsByDay = new Map<string, number>();
  for (const meal of meals) {
    const mealDate = meal.loggedAt.slice(0, 10); // ISO date
    if (mealDate >= earliest.date && mealDate <= latest.date) {
      mealsByDay.set(mealDate, (mealsByDay.get(mealDate) ?? 0) + meal.calories);
    }
  }

  const daysWithMeals = mealsByDay.size;
  if (daysWithMeals < MIN_DAYS_WITH_MEALS) {
    return {
      ...noData,
      daysAnalyzed,
      startWeight: earliest.weightLbs,
      endWeight: latest.weightLbs,
      summary: `Need meal data for ${MIN_DAYS_WITH_MEALS - daysWithMeals} more days. Keep logging!`,
    };
  }

  const totalCalories = Array.from(mealsByDay.values()).reduce(
    (sum, cal) => sum + cal,
    0
  );
  const avgDailyCalories = Math.round(totalCalories / daysWithMeals);

  // Weight delta
  const startWeight = earliest.weightLbs;
  const endWeight = latest.weightLbs;
  const weightChangeLbs = endWeight - startWeight; // negative = lost weight

  // Actual TDEE = avg intake - (weight change energy / days)
  // If user lost 2 lbs over 14 days: deficit = 2 × 3500 / 14 = 500 kcal/day
  // actualTDEE = avgIntake + deficit
  const dailyWeightEnergy = (weightChangeLbs * CALORIES_PER_LB) / daysAnalyzed;
  const actualTDEE = Math.round(avgDailyCalories - dailyWeightEnergy);

  const estimatedTDEE = currentPlan.maintenanceCalories;
  const tdeeDifference = actualTDEE - estimatedTDEE;

  const shouldRecalibrate =
    Math.abs(tdeeDifference) >= TDEE_DIFFERENCE_THRESHOLD;

  // Calculate suggested budget using actual TDEE
  let suggestedBudget: number | null = null;
  let summary: string;

  if (shouldRecalibrate) {
    // Apply the same deficit/surplus from the original plan to the actual TDEE
    const originalDeficit = estimatedTDEE - currentPlan.calorieBudget;
    suggestedBudget = Math.max(1200, Math.round(actualTDEE - originalDeficit));

    // Cap the adjustment to avoid large swings
    const currentBudget = currentPlan.calorieBudget;
    const adjustment = suggestedBudget - currentBudget;
    if (Math.abs(adjustment) > MAX_ADJUSTMENT) {
      suggestedBudget = currentBudget + Math.sign(adjustment) * MAX_ADJUSTMENT;
    }

    if (tdeeDifference > 0) {
      // Actual TDEE is higher — user burns more than estimated
      if (goalType === "lose") {
        summary = `You're burning ~${Math.abs(tdeeDifference)} cal/day more than estimated. You can eat a bit more and still hit your goal.`;
      } else {
        summary = `You're burning ~${Math.abs(tdeeDifference)} cal/day more than estimated. Consider increasing intake to match your gain goal.`;
      }
    } else {
      // Actual TDEE is lower — user burns less than estimated
      if (goalType === "lose") {
        summary = `You're burning ~${Math.abs(tdeeDifference)} cal/day less than estimated. A small reduction will keep you on track.`;
      } else {
        summary = `You're burning ~${Math.abs(tdeeDifference)} cal/day less than estimated. You may not need as many calories to gain.`;
      }
    }
  } else {
    summary = "Your estimate is on track! No adjustment needed.";
  }

  return {
    hasEnoughData: true,
    daysAnalyzed,
    avgDailyCalories,
    startWeight,
    endWeight,
    weightChangeLbs: Number(weightChangeLbs.toFixed(1)),
    actualTDEE,
    estimatedTDEE,
    tdeeDifference: Math.round(tdeeDifference),
    shouldRecalibrate,
    suggestedBudget,
    summary,
  };
}
