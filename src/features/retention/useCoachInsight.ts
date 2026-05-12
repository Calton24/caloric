/**
 * useCoachInsight — Single retention brain.
 *
 * One hook, one decision, multiple surfaces.
 *
 * Wraps the existing MilestoneInsightModel (streak/momentum/risk logic)
 * and augments it with:
 *   - weight-stale detection
 *   - canonical CTA routes
 *   - structured CoachInsight object for Home card + PerformanceSheet
 *
 * Do NOT add paywall logic, RevenueCat, or sync calls here.
 * Do NOT duplicate the MilestoneInsightModel decision logic — delegate to it.
 */

import { useMemo, useSyncExternalStore } from "react";
import { assertFoodLogSafeModeImport } from "../debug/safe-mode-flags";
import { DISABLE_POST_SAVE_COACH_INSIGHT_RECOMPUTE } from "../food-logging/post-save-debug-flags";
import { getMilestoneInsight } from "../milestone/milestone-insight.service";

assertFoodLogSafeModeImport("coach_insight");
import { getDailyNutritionSummary } from "../nutrition/nutrition.selectors";
import { useNutritionStore } from "../nutrition/nutrition.store";
import { useProgressStore } from "../progress";
import { useStreakStore } from "../streak/streak.store";
import { useGoalsStore } from "../goals";
import type { MilestoneInsightModel } from "../milestone/milestone-insight.types";
import { toLocalDate } from "../../lib/utils/date";
import {
  isPostFoodLogSettling,
  subscribePostFoodLogSettling,
} from "../food-logging/post-food-log-settling";

// ── Routes ──────────────────────────────────────────────────────────────────

export const COACH_ROUTES = {
  meal: "/(modals)/tracking",
  weight: "/log-weight",
  today: "/(tabs)",
} as const;

// ── Types ────────────────────────────────────────────────────────────────────

export type CoachInsightVariant =
  | "protect_streak"
  | "start_day"
  | "next_meal"
  | "weight_update"
  | "on_track";

export interface CoachInsight {
  id: string;
  variant: CoachInsightVariant;
  label: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  route: string;
  progress?: {
    current: number;
    target: number;
    label: string;
  };
  /** Full MilestoneInsightModel for PerformanceSheet (bottom sheet detail) */
  milestoneModel: MilestoneInsightModel | null;
}

// ── Constants ────────────────────────────────────────────────────────────────

const WEIGHT_STALE_DAYS = 10;
const LOW_CALORIE_PROGRESS = 0.35;

function daysSince(isoDate: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor(
    (Date.now() - new Date(`${isoDate}T12:00:00`).getTime()) / msPerDay
  );
}

/** Stable object when coach recompute is disabled (post-save crash isolation). */
const COACH_INSIGHT_DEBUG_PLACEHOLDER: CoachInsight = {
  id: "coach-post-save-debug-off",
  variant: "on_track",
  label: "Coach Insight",
  title: "You're on track",
  subtitle: "Logging is paused for debugging.",
  ctaLabel: "View today",
  route: COACH_ROUTES.today,
  progress: undefined,
  milestoneModel: null,
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useCoachInsight(): CoachInsight {
  const settling = useSyncExternalStore(
    subscribePostFoodLogSettling,
    isPostFoodLogSettling,
    () => false
  );
  const meals = useNutritionStore((s) => s.meals);
  const plan = useGoalsStore((s) => s.plan);
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const lastLogDate = useStreakStore((s) => s.lastLogDate);
  const weightLogs = useProgressStore((s) => s.weightLogs);

  return useMemo(() => {
    if (DISABLE_POST_SAVE_COACH_INSIGHT_RECOMPUTE) {
      return COACH_INSIGHT_DEBUG_PLACEHOLDER;
    }
    const today = toLocalDate();
    if (settling) {
      return {
        id: `coach-settling-${today}`,
        variant: "on_track",
        label: "Coach Insight",
        title: "You're on track",
        subtitle: "Keep logging consistently and review your trend.",
        ctaLabel: "View today",
        route: COACH_ROUTES.today,
        progress: undefined,
        milestoneModel: null,
      };
    }
    const todaySummary = getDailyNutritionSummary(meals, today);
    const mealsToday = todaySummary.meals.length;
    const caloriesToday = todaySummary.totalCalories;
    const calorieBudget = Math.max(plan?.calorieBudget ?? 0, 0);
    const proteinTarget = plan?.macros?.protein ?? 0;
    const proteinToday = todaySummary.totalProtein;

    const calorieProgress =
      calorieBudget > 0 ? caloriesToday / calorieBudget : 0;
    const hasLoggedToday = mealsToday > 0;
    const hadRecentStreak =
      !hasLoggedToday &&
      currentStreak > 0 &&
      typeof lastLogDate === "string" &&
      daysSince(lastLogDate) <= 1;

    const latestWeightDate = weightLogs[0]?.date ?? null;
    const hasStaleWeight =
      !!latestWeightDate && daysSince(latestWeightDate) >= WEIGHT_STALE_DAYS;

    // Build the full MilestoneInsightModel (streak-aware, coaching-aware)
    const milestoneModel = getMilestoneInsight({
      currentStreak,
      lastLogDate: lastLogDate ?? null,
      hasLoggedToday,
      streakRecoveryActive: false,
      dailySummary: {
        targetCalories: calorieBudget,
        consumedCalories: caloriesToday,
        consumedProtein: proteinToday,
        targetProtein: proteinTarget,
        loggedMeals: mealsToday,
      },
    });

    // ── Decision priority ────────────────────────────────────────────────────
    let variant: CoachInsightVariant;
    let label = "Coach Insight";
    let title: string;
    let subtitle: string;
    let ctaLabel: string;
    let route: string;
    let progress: CoachInsight["progress"] | undefined;

    if (!hasLoggedToday && hadRecentStreak) {
      variant = "protect_streak";
      title = "Don't lose your streak";
      subtitle = "One log today keeps your momentum alive.";
      ctaLabel = "Log meal";
      route = COACH_ROUTES.meal;
    } else if (!hasLoggedToday) {
      variant = "start_day";
      title = "Start today strong";
      subtitle = "Log your first meal and lock in the day.";
      ctaLabel = "Log meal";
      route = COACH_ROUTES.meal;
    } else if (calorieProgress < LOW_CALORIE_PROGRESS) {
      variant = "next_meal";
      title = "Stay on track today";
      subtitle = "You've got room left — make the next meal count.";
      ctaLabel = "Add meal";
      route = COACH_ROUTES.meal;
    } else if (hasStaleWeight) {
      variant = "weight_update";
      title = "Update your progress";
      subtitle = "Log your weight to keep your trend accurate.";
      ctaLabel = "Log weight";
      route = COACH_ROUTES.weight;
    } else {
      variant = "on_track";
      title = "You're on track";
      subtitle = "Keep logging consistently and review your trend.";
      ctaLabel = "View today";
      route = COACH_ROUTES.today;
    }

    // Carry streak progress from milestone model if available
    if (milestoneModel?.progress) {
      progress = {
        current: milestoneModel.progress.current,
        target: milestoneModel.progress.target,
        label: `${milestoneModel.progress.current} of ${milestoneModel.progress.target} days`,
      };
    }

    const insight: CoachInsight = {
      id: `coach-${variant}-${today}`,
      variant,
      label,
      title,
      subtitle,
      ctaLabel,
      route,
      progress,
      milestoneModel,
    };

    if (__DEV__) {
      console.log("[CoachInsight] selected", {
        variant,
        mealsToday,
        calorieProgress: Number(calorieProgress.toFixed(2)),
        currentStreak,
        hasLoggedToday,
        hadRecentStreak,
        hasStaleWeight,
        latestWeightDate,
      });
    }

    return insight;
  }, [currentStreak, lastLogDate, meals, plan, settling, weightLogs]);
}
