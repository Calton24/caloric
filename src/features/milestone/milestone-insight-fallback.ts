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
import { getIdentityTier } from "./milestone-insight.types";

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

// ── Contextual CTA ───────────────────────────────────────────

function getContextualCTA(
  timeOfDay: "morning" | "afternoon" | "evening"
): string {
  switch (timeOfDay) {
    case "morning":
      return "Start your day";
    case "afternoon":
      return "Stay on track";
    case "evening":
      return "Secure today";
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
      ctaLabel: "Last chance to lock today",
    };
  }

  return {
    title: `Your ${ctx.streakCount}-day streak is at risk`,
    subtitle: isEvening
      ? "Still time to secure your streak."
      : "Log a meal today to keep it alive.",
    chip: "At risk",
    ctaLabel: getContextualCTA(ctx.timeOfDay),
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
  const tier = getIdentityTier(ctx.streakCount);

  if (remaining === 1) {
    return {
      title: `1 day from ${target}-day milestone`,
      subtitle: "Log today and you've got it.",
      chip: "Almost there",
      ctaLabel: getContextualCTA(ctx.timeOfDay),
    };
  }

  return {
    title: `${remaining} days to ${target}-day milestone`,
    subtitle: `Stay on track and you'll hit day ${target}.`,
    chip: tier.label,
  };
}

// ── Momentum ─────────────────────────────────────────────────

function momentumCopy(ctx: MilestoneInsightContext): MilestoneInsightCopy {
  const days = ctx.streakCount;
  const milestone = ctx.nextMilestone;
  const remaining = ctx.daysToNextMilestone;
  const tier = getIdentityTier(days);

  const progressSuffix = remaining
    ? `${remaining} days to day ${milestone}.`
    : "Every logged day reinforces it.";

  if (days >= 30) {
    return {
      title: `${tier.label} — day ${days}`,
      subtitle: progressSuffix,
      chip: tier.label,
    };
  }

  if (days >= 14) {
    return {
      title: `${tier.label} — day ${days}`,
      subtitle: `This is becoming permanent. ${progressSuffix}`,
      chip: tier.label,
    };
  }

  if (days >= 7) {
    return {
      title: `${tier.label} — day ${days}`,
      subtitle: `Each day logged makes the next one easier. ${progressSuffix}`,
      chip: tier.label,
    };
  }

  if (days >= 4) {
    return {
      title: `${tier.label} — day ${days}`,
      subtitle: `The first few days are the hardest. You're past them. ${progressSuffix}`,
      chip: tier.label,
    };
  }

  return {
    title: `Day ${days} — ${tier.label.toLowerCase()}`,
    subtitle: remaining
      ? `${remaining} days to your first milestone.`
      : "Log each day to build the habit.",
    chip: tier.label,
  };
}
