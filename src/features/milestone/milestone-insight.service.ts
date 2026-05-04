/**
 * Milestone Insight Service
 *
 * Orchestrates the full insight pipeline:
 *   1. Build deterministic context from app state
 *   2. Get copy (AI with fallback)
 *   3. Map to renderable model with accent, icon, action
 *
 * The UI component receives a `MilestoneInsightModel` and renders it.
 * No business logic in the component.
 */

import { getDailyCoachingInsight } from "./daily-coaching";
import { getMilestoneInsightCopySync } from "./milestone-insight-ai";
import { getMilestoneInsightContext } from "./milestone-insight-context";
import type {
    MilestoneInsightContext,
    MilestoneInsightCopy,
    MilestoneInsightInput,
    MilestoneInsightModel,
    MilestoneInsightState,
    MilestoneInsightTone,
    MilestoneStyleConfig,
} from "./milestone-insight.types";
import { getDayScore, getIdentityTier } from "./milestone-insight.types";

// ── Style map ────────────────────────────────────────────────

const STYLE_MAP: Record<MilestoneInsightState, MilestoneStyleConfig> = {
  risk: {
    accent: "warning",
    icon: "shield",
    defaultChip: "At risk",
    showProgress: false,
    defaultAction: "track_meal",
  },
  recovery: {
    accent: "warning",
    icon: "refresh",
    defaultChip: "Restart",
    showProgress: false,
    defaultAction: "track_meal",
  },
  milestone_achieved: {
    accent: "success",
    icon: "trophy",
    defaultChip: "Milestone",
    showProgress: true,
    defaultAction: "open_streak",
  },
  milestone_preview: {
    accent: "highlight",
    icon: "target",
    defaultChip: "Next up",
    showProgress: true,
    defaultAction: "none",
  },
  momentum: {
    accent: "success",
    icon: "flame",
    showProgress: true,
    defaultAction: "open_streak",
  },
};

const TONE_MAP: Record<MilestoneInsightState, MilestoneInsightTone> = {
  risk: "urgent",
  recovery: "supportive",
  milestone_achieved: "celebratory",
  milestone_preview: "grounded",
  momentum: "supportive",
};

// ── Model builder ────────────────────────────────────────────

export function buildMilestoneInsightModel(
  ctx: MilestoneInsightContext,
  copy: MilestoneInsightCopy,
  input?: MilestoneInsightInput
): MilestoneInsightModel {
  const style = STYLE_MAP[ctx.state];

  const progress =
    style.showProgress && ctx.nextMilestone
      ? { current: ctx.streakCount, target: ctx.nextMilestone }
      : undefined;

  const tier = getIdentityTier(ctx.streakCount);

  const dayScore = input?.dailySummary
    ? getDayScore({
        loggedMeals: input.dailySummary.loggedMeals ?? 0,
        consumedCalories: input.dailySummary.consumedCalories ?? 0,
        targetCalories: input.dailySummary.targetCalories ?? 0,
        consumedProtein: input.dailySummary.consumedProtein ?? 0,
        targetProtein: input.dailySummary.targetProtein ?? 0,
      })
    : undefined;

  // ── Daily coaching insight ──
  const coachingInsight = input?.dailySummary
    ? (() => {
        const targetCal = input.dailySummary?.targetCalories ?? 0;
        const targetPro = input.dailySummary?.targetProtein ?? 0;
        const consumedCal = input.dailySummary?.consumedCalories ?? 0;
        const consumedPro = input.dailySummary?.consumedProtein ?? 0;
        const { states, copy } = getDailyCoachingInsight({
          caloriesRemaining: targetCal - consumedCal,
          proteinRemaining: targetPro - consumedPro,
          targetCalories: targetCal,
          targetProtein: targetPro,
          loggedMeals: input.dailySummary?.loggedMeals ?? 0,
          streak: ctx.streakCount,
          daysToMilestone: ctx.daysToNextMilestone,
          timeOfDay: ctx.timeOfDay,
          secured: ctx.hasLoggedToday,
          missedYesterday: ctx.state === "recovery",
        });
        return { states, label: copy.label, text: copy.text };
      })()
    : undefined;

  return {
    state: ctx.state,
    tone: TONE_MAP[ctx.state],
    accent: style.accent,
    icon: style.icon,
    action: style.defaultAction,
    title: copy.title,
    subtitle: copy.subtitle,
    chip: copy.chip ?? style.defaultChip,
    ctaLabel: copy.ctaLabel,
    progress,
    streakCount: ctx.streakCount,
    tier,
    dayScore,
    coachingInsight,
  };
}

// ── Public API ───────────────────────────────────────────────

/**
 * Synchronous model builder — for immediate rendering.
 * Uses deterministic fallback copy. No AI latency.
 */
export function getMilestoneInsight(
  input: MilestoneInsightInput
): MilestoneInsightModel | null {
  const ctx = getMilestoneInsightContext(input);
  if (!ctx) return null;

  const copy = getMilestoneInsightCopySync(ctx);
  return buildMilestoneInsightModel(ctx, copy, input);
}

// Re-export for convenience
export {
    getMilestoneInsightCopy,
    getMilestoneInsightCopySync
} from "./milestone-insight-ai";
export { getMilestoneInsightContext } from "./milestone-insight-context";

