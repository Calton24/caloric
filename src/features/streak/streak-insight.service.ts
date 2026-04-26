/**
 * Streak Insight Service
 *
 * Pure logic layer that computes the single most important streak
 * message for the user at any given moment.
 *
 * Priority (highest → lowest):
 *   1. risk        — streak will break if no log today (past 6pm)
 *   2. recovery    — streak just broke, motivate to restart
 *   3. milestone_achieved — user just hit a milestone today
 *   4. milestone_preview  — milestone is within 2 days
 *   5. momentum    — default: user is on an active streak
 */

import type { StreakRecovery } from "../retention/retention.types";
import {
    getNextMilestone,
    getStreakLabel,
    getStreakUrgency,
    type StreakLabel,
} from "./streak-psychology.service";

// ── Types ────────────────────────────────────────────────────

export type StreakInsightState =
  | "risk"
  | "recovery"
  | "milestone_achieved"
  | "milestone_preview"
  | "momentum";

export type StreakInsightTone =
  | "warning"
  | "critical"
  | "recovery"
  | "celebratory"
  | "anticipatory"
  | "positive";

export interface StreakInsightModel {
  state: StreakInsightState;
  tone: StreakInsightTone;
  /** i18n key for headline */
  titleKey: string;
  /** i18n interpolation params for title */
  titleParams: Record<string, string | number>;
  /** i18n key for subtitle */
  subtitleKey: string;
  /** i18n interpolation params for subtitle */
  subtitleParams: Record<string, string | number>;
  /** Accent color for the card */
  accent: string;
  /** Optional progress 0..1 toward next milestone */
  progress: number | null;
  /** Optional CTA i18n key */
  ctaKey: string | null;
  /** Streak label (identity) if available */
  label: StreakLabel | null;
  /** Current streak count */
  streakCount: number;
  /** Whether the card should show a chevron (tappable) */
  showChevron: boolean;
}

export interface StreakInsightInput {
  currentStreak: number;
  lastLogDate: string | null;
  hasLoggedToday: boolean;
  streakRecovery: StreakRecovery | null;
  now?: Date;
}

// ── Accent colors ────────────────────────────────────────────

const ACCENTS = {
  warning: "#F5A623",
  critical: "#EF4444",
  recovery: "#F59E0B",
  celebratory: "#10B981",
  anticipatory: "#3B82F6",
  positive: "#10B981",
} as const;

// ── Milestone targets (same as psychology service) ───────────

const MILESTONE_DAYS = [3, 7, 14, 21, 30, 60, 90, 100, 365];

// ── Main resolver ────────────────────────────────────────────

export function getStreakInsight(
  input: StreakInsightInput
): StreakInsightModel | null {
  const {
    currentStreak,
    lastLogDate,
    hasLoggedToday,
    streakRecovery,
    now = new Date(),
  } = input;

  const label = getStreakLabel(currentStreak);
  const milestone = getNextMilestone(currentStreak);

  // ── 1. Risk: streak in danger ──
  const urgency = getStreakUrgency(lastLogDate, currentStreak, now);
  if (urgency) {
    const isCritical = urgency === "critical";
    return {
      state: "risk",
      tone: isCritical ? "critical" : "warning",
      titleKey: isCritical
        ? "streakInsight.lastChance"
        : "streakInsight.atRisk",
      titleParams: { count: currentStreak },
      subtitleKey: "streakInsight.logToKeep",
      subtitleParams: {},
      accent: isCritical ? ACCENTS.critical : ACCENTS.warning,
      progress: null,
      ctaKey: "streakInsight.logMeal",
      label,
      streakCount: currentStreak,
      showChevron: true,
    };
  }

  // ── 2. Recovery: streak just broke ──
  if (streakRecovery && currentStreak === 0) {
    return {
      state: "recovery",
      tone: "recovery",
      titleKey: "streakInsight.streakEnded",
      titleParams: { count: streakRecovery.lostStreak },
      subtitleKey: "streakInsight.startFresh",
      subtitleParams: {},
      accent: ACCENTS.recovery,
      progress: null,
      ctaKey: "streakInsight.logMeal",
      label: null,
      streakCount: 0,
      showChevron: true,
    };
  }

  // Nothing to show if no streak and no recovery
  if (currentStreak === 0) return null;

  // ── 3. Milestone achieved: just hit a milestone today ──
  const justHitMilestone =
    hasLoggedToday && MILESTONE_DAYS.includes(currentStreak);
  if (justHitMilestone) {
    return {
      state: "milestone_achieved",
      tone: "celebratory",
      titleKey: "streakInsight.milestoneHit",
      titleParams: { count: currentStreak },
      subtitleKey: "streakInsight.milestoneBody",
      subtitleParams: { count: currentStreak },
      accent: ACCENTS.celebratory,
      progress: 1,
      ctaKey: null,
      label,
      streakCount: currentStreak,
      showChevron: false,
    };
  }

  // ── 4. Milestone preview: within 2 days of next milestone ──
  if (milestone && milestone.remaining <= 2) {
    return {
      state: "milestone_preview",
      tone: "anticipatory",
      titleKey: "streakInsight.milestoneClose",
      titleParams: { target: milestone.target },
      subtitleKey: "streakInsight.keepLogging",
      subtitleParams: { remaining: milestone.remaining },
      accent: ACCENTS.anticipatory,
      progress: currentStreak / milestone.target,
      ctaKey: null,
      label,
      streakCount: currentStreak,
      showChevron: false,
    };
  }

  // ── 5. Momentum: steady progress ──
  return {
    state: "momentum",
    tone: "positive",
    titleKey: label?.labelKey ?? "streakInsight.buildingHabit",
    titleParams: { count: currentStreak },
    subtitleKey: milestone
      ? "streakInsight.daysToMilestone"
      : "streakInsight.keepGoing",
    subtitleParams: milestone
      ? { remaining: milestone.remaining, target: milestone.target }
      : {},
    accent: ACCENTS.positive,
    progress: milestone ? currentStreak / milestone.target : 1,
    ctaKey: null,
    label,
    streakCount: currentStreak,
    showChevron: true,
  };
}
