/**
 * Milestone Insight — Deterministic Context Builder
 *
 * Converts raw app state into a strongly-typed context object.
 * The AI layer phrases the message. This layer decides what's true.
 *
 * Priority:
 *   1. risk        — streak will break if no log today
 *   2. recovery    — streak just broke
 *   3. milestone_achieved — user just hit a milestone today
 *   4. milestone_preview  — milestone within 2 days
 *   5. momentum    — steady progress
 */

import {
    getNextMilestone,
    getStreakUrgency,
} from "../streak/streak-psychology.service";
import type {
    MilestoneInsightContext,
    MilestoneInsightInput,
    MilestoneInsightState,
} from "./milestone-insight.types";

// ── Constants ────────────────────────────────────────────────

const MILESTONE_DAYS = [3, 7, 14, 21, 30, 60, 90, 100, 365];

// ── Helpers ──────────────────────────────────────────────────

function getTimeOfDay(now: Date): "morning" | "afternoon" | "evening" {
  const hour = now.getHours();
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  return "evening";
}

function getLastLogHoursAgo(
  lastLogDate: string | null,
  now: Date
): number | null {
  if (!lastLogDate) return null;
  const last = new Date(lastLogDate);
  if (isNaN(last.getTime())) return null;
  const diffMs = now.getTime() - last.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
}

function getAdherence(dailySummary?: {
  targetCalories?: number | null;
  consumedCalories?: number | null;
}): "on_track" | "under" | "over" | "unknown" {
  const target = dailySummary?.targetCalories ?? null;
  const consumed = dailySummary?.consumedCalories ?? null;
  if (!target || consumed == null) return "unknown";
  const ratio = consumed / target;
  if (ratio >= 0.85 && ratio <= 1.1) return "on_track";
  if (ratio < 0.85) return "under";
  return "over";
}

function getRecentTrend(
  streakCount: number,
  loggedToday: boolean,
  lastLogHoursAgo: number | null
): "improving" | "steady" | "declining" {
  if (streakCount >= 3 && loggedToday) return "improving";
  if (streakCount > 0 && !loggedToday && (lastLogHoursAgo ?? 0) >= 24)
    return "declining";
  return "steady";
}

// ── State resolver ───────────────────────────────────────────

function resolveState(input: {
  currentStreak: number;
  hasLoggedToday: boolean;
  lastLogDate: string | null;
  streakRecoveryActive: boolean;
  lostStreak?: number;
  now: Date;
}): MilestoneInsightState {
  const {
    currentStreak,
    hasLoggedToday,
    lastLogDate,
    streakRecoveryActive,
    lostStreak,
    now,
  } = input;

  // 1. Risk: active streak but urgency detected
  const urgency = getStreakUrgency(lastLogDate, currentStreak, now);
  if (urgency) return "risk";

  // 2. Recovery: streak just broke
  if (streakRecoveryActive && currentStreak === 0 && (lostStreak ?? 0) > 0) {
    return "recovery";
  }

  // 3. Milestone achieved: just hit a milestone today
  if (hasLoggedToday && MILESTONE_DAYS.includes(currentStreak)) {
    return "milestone_achieved";
  }

  // 4. Milestone preview: within 2 days
  const milestone = getNextMilestone(currentStreak);
  if (milestone && milestone.remaining <= 2) {
    return "milestone_preview";
  }

  // 5. Momentum
  return "momentum";
}

// ── Main builder ─────────────────────────────────────────────

export function getMilestoneInsightContext(
  input: MilestoneInsightInput
): MilestoneInsightContext | null {
  const now = input.now ?? new Date();
  const streakCount = Math.max(0, input.currentStreak);

  // Nothing to show if no streak and no recovery
  if (streakCount === 0 && !input.streakRecoveryActive) return null;

  const state = resolveState({
    currentStreak: streakCount,
    hasLoggedToday: input.hasLoggedToday,
    lastLogDate: input.lastLogDate,
    streakRecoveryActive: input.streakRecoveryActive,
    lostStreak: input.lostStreak,
    now,
  });

  const milestone = getNextMilestone(streakCount);
  const lastLogHoursAgo = getLastLogHoursAgo(input.lastLogDate, now);

  return {
    state,
    streakCount,
    hasLoggedToday: input.hasLoggedToday,
    nextMilestone: milestone?.target,
    daysToNextMilestone: milestone?.remaining,
    recentTrend: getRecentTrend(
      streakCount,
      input.hasLoggedToday,
      lastLogHoursAgo
    ),
    adherence: getAdherence(input.dailySummary),
    timeOfDay: getTimeOfDay(now),
    goalType: input.goalType ?? "eat_healthier",
    lastLogHoursAgo,
    lostStreak: input.lostStreak,
  };
}
