/**
 * Milestone Insight — Fallback Copy Generator
 *
 * Deterministic, reliable copy for when AI is unavailable.
 * Not exciting, but always correct and grounded in real state.
 *
 * These messages reference actual streak count, milestone distance,
 * and time of day — never generic motivational garbage.
 */

import type {
    MilestoneInsightContext,
    MilestoneInsightCopy,
} from "./milestone-insight.types";

export function getFallbackCopy(
  ctx: MilestoneInsightContext
): MilestoneInsightCopy {
  switch (ctx.state) {
    case "risk":
      return riskCopy(ctx);
    case "recovery":
      return recoveryCopy(ctx);
    case "milestone_achieved":
      return achievedCopy(ctx);
    case "milestone_preview":
      return previewCopy(ctx);
    case "momentum":
    default:
      return momentumCopy(ctx);
  }
}

// ── Risk ─────────────────────────────────────────────────────

function riskCopy(ctx: MilestoneInsightContext): MilestoneInsightCopy {
  const isEvening = ctx.timeOfDay === "evening";

  if (isEvening && ctx.lastLogHoursAgo != null && ctx.lastLogHoursAgo >= 20) {
    return {
      title: `Your ${ctx.streakCount}-day streak ends tonight`,
      subtitle: "Log one meal before midnight to save it.",
      chip: "At risk",
      ctaLabel: "Log meal",
    };
  }

  return {
    title: `Your ${ctx.streakCount}-day streak is at risk`,
    subtitle: "Log a meal today to keep it alive.",
    chip: "At risk",
    ctaLabel: "Log meal",
  };
}

// ── Recovery ─────────────────────────────────────────────────

function recoveryCopy(ctx: MilestoneInsightContext): MilestoneInsightCopy {
  const lost = ctx.lostStreak ?? 0;
  return {
    title: `Your ${lost}-day streak ended`,
    subtitle: "Log a meal to start fresh today.",
    chip: "Restart",
    ctaLabel: "Log meal",
  };
}

// ── Milestone achieved ───────────────────────────────────────

function achievedCopy(ctx: MilestoneInsightContext): MilestoneInsightCopy {
  const days = ctx.streakCount;

  if (days >= 30) {
    return {
      title: `${days} days — real consistency`,
      subtitle: "This level of commitment is rare. Well earned.",
      chip: "Milestone",
    };
  }

  if (days >= 14) {
    return {
      title: `${days}-day milestone reached`,
      subtitle: "Two weeks of logging. This is becoming permanent.",
      chip: "Milestone",
    };
  }

  if (days >= 7) {
    return {
      title: `${days} days logged — strong week`,
      subtitle: "A full week of consistency. That's real.",
      chip: "Milestone",
    };
  }

  return {
    title: `${days}-day streak achieved`,
    subtitle: `${days} days of showing up. Well done.`,
    chip: "Milestone",
  };
}

// ── Milestone preview ────────────────────────────────────────

function previewCopy(ctx: MilestoneInsightContext): MilestoneInsightCopy {
  const remaining = ctx.daysToNextMilestone ?? 1;
  const target = ctx.nextMilestone ?? ctx.streakCount + remaining;

  if (remaining === 1) {
    return {
      title: `1 day from ${target}-day milestone`,
      subtitle: "Log today and you've got it.",
      chip: "Almost there",
    };
  }

  return {
    title: `${remaining} days to ${target}-day milestone`,
    subtitle: `Stay on track and you'll hit day ${target}.`,
    chip: "Next up",
  };
}

// ── Momentum ─────────────────────────────────────────────────

function momentumCopy(ctx: MilestoneInsightContext): MilestoneInsightCopy {
  const days = ctx.streakCount;
  const milestone = ctx.nextMilestone;
  const remaining = ctx.daysToNextMilestone;

  // Grounded in where they actually are
  if (days >= 21) {
    return {
      title: "This is a real habit now",
      subtitle: remaining
        ? `${remaining} days to your ${milestone}-day milestone.`
        : "Every logged day reinforces it.",
      chip: `Day ${days}`,
    };
  }

  if (days >= 7) {
    return {
      title: "Building real consistency",
      subtitle: remaining
        ? `${remaining} days until day ${milestone}.`
        : "Each day logged makes the next one easier.",
      chip: `Day ${days}`,
    };
  }

  if (days >= 3) {
    return {
      title: "Getting consistent",
      subtitle: remaining
        ? `${remaining} more days to ${milestone}-day milestone.`
        : "The first few days are the hardest. You're past them.",
      chip: `Day ${days}`,
    };
  }

  return {
    title: "Building a streak",
    subtitle: remaining
      ? `${remaining} days to your first milestone.`
      : "Log each day to build the habit.",
    chip: `Day ${days}`,
  };
}
