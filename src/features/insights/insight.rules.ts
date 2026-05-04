/**
 * Insight Rule Registry
 *
 * Every rule lives here. A rule is a pure function of `InsightContext`
 * that returns either a `RuleEvaluationResult` (it fires) or `null`
 * (it doesn't apply right now). The engine layer handles selection,
 * cooldowns, persona modulation, and dedup.
 *
 * Design principles:
 *
 *   1. EVERY rule must change user behavior. If it doesn't drive an
 *      action — log a meal, log weight, recalculate, see progress —
 *      it doesn't belong here.
 *   2. Thresholds must be conservative. A false-positive insight
 *      teaches the user to ignore the banner.
 *   3. payloadHash must be stable for identical situations so the
 *      engine can dedup repeat firings (no nagging).
 *   4. Translation keys are stable strings under `progress.insights.*`
 *      — the engine appends `_<toneVariant>` if a variant exists.
 */

import type { InsightRule } from "./insight.types";

// ── Category cooldowns (default if rule.cooldownHours === 0) ───────────

export const CATEGORY_COOLDOWN_HOURS: Record<
  InsightRule["category"],
  number
> = {
  critical: 4, // can re-fire same evening if still urgent
  warning: 24, // once per day
  positive: 48, // once every 2 days (don't desensitize)
  optimization: 72, // once every 3 days
  neutral: 0,
};

// ── Rules (priority-ordered) ──────────────────────────────────────────

const RULES: InsightRule[] = [
  // ════════════════════════════════════════════════════════════════════
  // CRITICAL — user momentum at acute risk. Bypass variety filter.
  // ════════════════════════════════════════════════════════════════════

  /**
   * Streak about to break.
   *
   * User has a meaningful streak (≥3) AND hasn't logged today AND it's
   * after 6pm local. This is the single highest-leverage retention nudge
   * in the app.
   *
   * Priority is boosted with streak length — a 30-day streak is a much
   * higher-value loss than a 3-day one.
   */
  {
    id: "streak_about_to_break",
    category: "critical",
    tone: "urgent",
    basePriority: 95,
    cooldownHours: 4,
    dismissible: false,
    hourGate: { after: 18 },
    evaluate: (ctx) => {
      if (ctx.streak.current < 3) return null;
      if (!ctx.streak.atRiskToday) return null;
      const n = ctx.streak.current;
      return {
        titleKey: "progress.insights.streak_about_to_break.title",
        messageKey: "progress.insights.streak_about_to_break.message",
        params: { n },
        cta: {
          labelKey: "progress.insights.cta.logMeal",
          action: "log_meal",
        },
        payloadHash: `streak_about_to_break:${n}`,
        priorityBoost: n >= 30 ? 4 : n >= 14 ? 2 : 0,
      };
    },
  },

  /**
   * One day from a personal best.
   *
   * Strongest "almost there" psychology — Duolingo plays this card
   * relentlessly. Fires regardless of time of day.
   */
  {
    id: "streak_personal_best_chance",
    category: "critical",
    tone: "urgent",
    basePriority: 92,
    cooldownHours: 12,
    dismissible: false,
    evaluate: (ctx) => {
      if (!ctx.streak.oneFromPersonalBest) return null;
      if (ctx.loggedToday) return null;
      return {
        titleKey: "progress.insights.streak_personal_best_chance.title",
        messageKey: "progress.insights.streak_personal_best_chance.message",
        params: {
          best: ctx.streak.longest,
          today: ctx.streak.current + 1,
        },
        cta: {
          labelKey: "progress.insights.cta.logMeal",
          action: "log_meal",
        },
        payloadHash: `streak_personal_best_chance:${ctx.streak.longest}`,
      };
    },
  },

  /**
   * Streak just broke — restart opportunity.
   *
   * Captures the "I lost my streak, may as well give up" defection
   * window. Fires the morning after a break.
   */
  {
    id: "streak_restart_opportunity",
    category: "critical",
    tone: "warning",
    basePriority: 86,
    cooldownHours: 24,
    dismissible: true,
    evaluate: (ctx) => {
      if (!ctx.streak.isRestartOpportunity) return null;
      if (ctx.loggedToday) return null;
      return {
        titleKey: "progress.insights.streak_restart_opportunity.title",
        messageKey: "progress.insights.streak_restart_opportunity.message",
        params: { prior: ctx.streak.priorBestStreakBeforeBreak },
        cta: {
          labelKey: "progress.insights.cta.logMeal",
          action: "log_meal",
        },
        payloadHash: `streak_restart_opportunity:${ctx.streak.priorBestStreakBeforeBreak}`,
      };
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // WARNING — drift detection. Fire daily-ish (24h cooldown).
  // ════════════════════════════════════════════════════════════════════

  /**
   * Calorie surplus 3 days running (lose-weight goals).
   *
   * The most common silent failure mode. Direct, actionable.
   */
  {
    id: "calorie_surplus_3d",
    category: "warning",
    tone: "warning",
    basePriority: 78,
    cooldownHours: 24,
    dismissible: true,
    evaluate: (ctx) => {
      if (!ctx.cals.surplus3DaysStreak) return null;
      if (ctx.plan.goalDirection === "gain") return null;
      const overBy = Math.max(0, Math.round(ctx.cals.avg7d - ctx.plan.calorieBudget));
      return {
        titleKey: "progress.insights.calorie_surplus_3d.title",
        messageKey: "progress.insights.calorie_surplus_3d.message",
        params: { over: overBy },
        cta: {
          labelKey: "progress.insights.cta.viewProgress",
          action: "view_progress",
        },
        payloadHash: `calorie_surplus_3d:${overBy}`,
      };
    },
  },

  /**
   * Aggressive deficit (lose-weight goals).
   *
   * Eating <70% of budget for 3 days running. Burns out users + hurts
   * adherence long-term. Reframes "more discipline = more progress".
   */
  {
    id: "calorie_deficit_too_aggressive",
    category: "warning",
    tone: "warning",
    basePriority: 74,
    cooldownHours: 48,
    dismissible: true,
    evaluate: (ctx) => {
      if (!ctx.cals.aggressiveDeficit3DaysStreak) return null;
      if (ctx.plan.goalDirection !== "lose") return null;
      return {
        titleKey: "progress.insights.calorie_deficit_too_aggressive.title",
        messageKey: "progress.insights.calorie_deficit_too_aggressive.message",
        cta: {
          labelKey: "progress.insights.cta.recalculatePlan",
          action: "recalculate_plan",
        },
        payloadHash: `calorie_deficit_too_aggressive`,
      };
    },
  },

  /**
   * Consistency dropped vs previous week.
   *
   * Adherence dropped ≥20pp week-over-week. We don't shame; we surface.
   */
  {
    id: "consistency_dropped",
    category: "warning",
    tone: "warning",
    basePriority: 70,
    cooldownHours: 48,
    dismissible: true,
    evaluate: (ctx) => {
      const drop = ctx.adherence.pctPrev7d - ctx.adherence.pct7d;
      if (drop < 20) return null;
      if (ctx.adherence.pctPrev7d < 30) return null; // baseline too low to be meaningful
      return {
        titleKey: "progress.insights.consistency_dropped.title",
        messageKey: "progress.insights.consistency_dropped.message",
        params: { drop: Math.round(drop) },
        cta: {
          labelKey: "progress.insights.cta.logMeal",
          action: "log_meal",
        },
        payloadHash: `consistency_dropped:${Math.round(drop)}`,
      };
    },
  },

  /**
   * Protein chronically low (≥5 of last 7 logged days < 80% target).
   *
   * Macro lever — directly tied to body composition outcomes.
   */
  {
    id: "protein_chronic_low",
    category: "warning",
    tone: "warning",
    basePriority: 65,
    cooldownHours: 72,
    dismissible: true,
    evaluate: (ctx) => {
      if (!ctx.protein.chronicallyLow) return null;
      if (ctx.protein.target == null) return null;
      const gap = Math.max(
        0,
        Math.round(ctx.protein.target - ctx.protein.avg7d)
      );
      return {
        titleKey: "progress.insights.protein_chronic_low.title",
        messageKey: "progress.insights.protein_chronic_low.message",
        params: { gap, target: ctx.protein.target },
        cta: {
          labelKey: "progress.insights.cta.openMacros",
          action: "open_macros",
        },
        payloadHash: `protein_chronic_low:${gap}`,
      };
    },
  },

  /**
   * No weight log in 14 days, while user has a goal weight.
   *
   * Without weight data the goal feedback loop is severed. Soft tone.
   */
  {
    id: "weight_log_stale",
    category: "warning",
    tone: "warning",
    basePriority: 62,
    cooldownHours: 96,
    dismissible: true,
    evaluate: (ctx) => {
      if (ctx.weight.goalLbs == null) return null;
      const d = ctx.weight.daysSinceLastLog;
      if (d == null || d < 14) return null;
      return {
        titleKey: "progress.insights.weight_log_stale.title",
        messageKey: "progress.insights.weight_log_stale.message",
        params: { days: d },
        cta: {
          labelKey: "progress.insights.cta.logWeight",
          action: "log_weight",
        },
        payloadHash: `weight_log_stale:${Math.min(d, 60)}`,
      };
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // POSITIVE — celebrate momentum. Cooldown 48h to avoid desensitization.
  // ════════════════════════════════════════════════════════════════════

  /**
   * Within 2 lbs of goal weight.
   *
   * Massive psychological lift — the "you're so close" effect.
   */
  {
    id: "near_goal",
    category: "positive",
    tone: "positive",
    basePriority: 58,
    cooldownHours: 48,
    dismissible: true,
    evaluate: (ctx) => {
      const r = ctx.weight.remainingLbs;
      if (r == null) return null;
      if (Math.abs(r) > 2) return null;
      if (Math.abs(r) < 0.1) return null; // already at goal — different rule territory
      return {
        titleKey: "progress.insights.near_goal.title",
        messageKey: "progress.insights.near_goal.message",
        params: { remaining: Math.abs(r).toFixed(1) },
        cta: {
          labelKey: "progress.insights.cta.viewProgress",
          action: "view_progress",
        },
        payloadHash: `near_goal:${Math.abs(r).toFixed(1)}`,
      };
    },
  },

  /**
   * Streak milestone today (3, 7, 14, 30, 60, 100, 365).
   *
   * Variable-ratio celebration — Duolingo, Strava, Whoop all use this.
   */
  {
    id: "streak_milestone",
    category: "positive",
    tone: "positive",
    basePriority: 56,
    cooldownHours: -1, // milestone is one-shot per value (handled by payloadHash dedup)
    dismissible: true,
    evaluate: (ctx) => {
      if (!ctx.streak.isMilestoneToday) return null;
      if (ctx.streak.milestoneValue == null) return null;
      return {
        titleKey: "progress.insights.streak_milestone.title",
        messageKey: "progress.insights.streak_milestone.message",
        params: { n: ctx.streak.milestoneValue },
        cta: {
          labelKey: "progress.insights.cta.viewProgress",
          action: "view_progress",
        },
        payloadHash: `streak_milestone:${ctx.streak.milestoneValue}`,
      };
    },
  },

  /**
   * Best week of adherence ever observed.
   *
   * Positive variable reward — uses long-term comparison so it carries
   * real weight ("not just a good week — your best one").
   */
  {
    id: "best_week_ever",
    category: "positive",
    tone: "positive",
    basePriority: 52,
    cooldownHours: 168, // once a week max
    dismissible: true,
    evaluate: (ctx) => {
      if (!ctx.adherence.isBestWeekEver) return null;
      if (ctx.adherence.pct7d < 60) return null; // bar must be meaningful
      return {
        titleKey: "progress.insights.best_week_ever.title",
        messageKey: "progress.insights.best_week_ever.message",
        params: { pct: ctx.adherence.pct7d },
        payloadHash: `best_week_ever:${ctx.adherence.pct7d}`,
      };
    },
  },

  /**
   * On pace to hit goal at planned timeline.
   *
   * Reinforces system trust — the math is working.
   */
  {
    id: "on_pace_for_goal",
    category: "positive",
    tone: "positive",
    basePriority: 48,
    cooldownHours: 96,
    dismissible: true,
    evaluate: (ctx) => {
      if (!ctx.weight.onPaceForGoal) return null;
      if (ctx.weight.daysSinceLastLog == null || ctx.weight.daysSinceLastLog > 14) {
        return null;
      }
      return {
        titleKey: "progress.insights.on_pace_for_goal.title",
        messageKey: "progress.insights.on_pace_for_goal.message",
        params: {
          rate: Math.abs(ctx.weight.weeklyRateLbs).toFixed(2),
        },
        payloadHash: `on_pace_for_goal:${Math.round(Math.abs(ctx.weight.weeklyRateLbs) * 10)}`,
      };
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // OPTIMIZATION — incremental upgrades. Cooldown 72h.
  // ════════════════════════════════════════════════════════════════════

  /**
   * Protein 70-89% of target — close, worth optimizing.
   */
  {
    id: "protein_optimization",
    category: "optimization",
    tone: "neutral",
    basePriority: 38,
    cooldownHours: 96,
    dismissible: true,
    personaGate: ["regular", "power"],
    evaluate: (ctx) => {
      if (!ctx.protein.inOptimizationRange) return null;
      if (ctx.protein.target == null) return null;
      const gap = Math.max(
        0,
        Math.round(ctx.protein.target - ctx.protein.avg7d)
      );
      if (gap <= 0) return null;
      return {
        titleKey: "progress.insights.protein_optimization.title",
        messageKey: "progress.insights.protein_optimization.message",
        params: { gap, target: ctx.protein.target },
        cta: {
          labelKey: "progress.insights.cta.openMacros",
          action: "open_macros",
        },
        payloadHash: `protein_optimization:${gap}`,
      };
    },
  },

  /**
   * Weekend drift — calories spike Sat/Sun vs weekday avg by ≥25%.
   */
  {
    id: "weekend_drift",
    category: "optimization",
    tone: "neutral",
    basePriority: 32,
    cooldownHours: 168,
    dismissible: true,
    evaluate: (ctx) => {
      const r = ctx.cals.weekendDriftRatio;
      if (r == null) return null;
      if (r < 1.25) return null;
      const pct = Math.round((r - 1) * 100);
      return {
        titleKey: "progress.insights.weekend_drift.title",
        messageKey: "progress.insights.weekend_drift.message",
        params: { pct },
        cta: {
          labelKey: "progress.insights.cta.viewProgress",
          action: "view_progress",
        },
        payloadHash: `weekend_drift:${pct}`,
      };
    },
  },

  /**
   * Late-log pattern — last 5+ logs after 8pm.
   *
   * Logging-as-recall is far less accurate than logging-as-eat.
   * Coaches the user toward better data hygiene.
   */
  {
    id: "late_log_pattern",
    category: "optimization",
    tone: "neutral",
    basePriority: 28,
    cooldownHours: 168,
    dismissible: true,
    personaGate: ["regular", "power"],
    evaluate: (ctx) => {
      if (!ctx.behavior.lateLogPattern) return null;
      return {
        titleKey: "progress.insights.late_log_pattern.title",
        messageKey: "progress.insights.late_log_pattern.message",
        cta: {
          labelKey: "progress.insights.cta.logMeal",
          action: "log_meal",
        },
        payloadHash: `late_log_pattern`,
      };
    },
  },

  // ════════════════════════════════════════════════════════════════════
  // NEUTRAL — fallbacks. Always last.
  // ════════════════════════════════════════════════════════════════════

  /**
   * No data at all — onboarding nudge.
   */
  {
    id: "no_data",
    category: "neutral",
    tone: "neutral",
    basePriority: 12,
    cooldownHours: 0,
    dismissible: false,
    evaluate: (ctx) => {
      if (ctx.totalMeals > 0) return null;
      return {
        titleKey: "progress.insights.no_data.title",
        messageKey: "progress.insights.no_data.message",
        cta: {
          labelKey: "progress.insights.cta.logFirstMeal",
          action: "log_meal",
        },
        payloadHash: `no_data`,
      };
    },
  },

  /**
   * Default steady-state. Always wins as a last resort.
   */
  {
    id: "neutral_steady",
    category: "neutral",
    tone: "neutral",
    basePriority: 5,
    cooldownHours: 0,
    dismissible: false,
    evaluate: () => ({
      titleKey: "progress.insights.neutral_steady.title",
      messageKey: "progress.insights.neutral_steady.message",
      payloadHash: `neutral_steady`,
    }),
  },
];

export const INSIGHT_RULES = RULES;

export function getRuleById(id: string): InsightRule | undefined {
  return RULES.find((r) => r.id === id);
}
