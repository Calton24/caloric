/**
 * Share Service — pure domain logic for milestone detection.
 *
 * No React, no IO. All functions take plain data and return plain data.
 */

import type {
    MilestoneCheck,
    MilestoneConfig,
    MilestoneKey,
} from "./share.types";

// ── Milestone definitions ──────────────────────────────────────

export const MILESTONES: MilestoneConfig[] = [
  {
    key: "first_log",
    day: 1,
    emoji: "🎉",
    title: "You started something",
    subtitle: "Your first meal is logged. The journey begins.",
    quote: "Every great change starts with a single step.",
  },
  {
    key: "day_3",
    day: 3,
    emoji: "💪",
    title: "You're consistent",
    subtitle: "3 days in a row — that's real commitment.",
    quote: "Discipline is choosing what you want most over what you want now.",
  },
  {
    key: "day_7",
    day: 7,
    emoji: "🔥",
    title: "Most people quit here — you didn't",
    subtitle: "You're ahead of 80% of users who start a challenge.",
    quote: "A week of consistency beats a month of perfection.",
  },
  {
    key: "day_14",
    day: 14,
    emoji: "⚡",
    title: "You're ahead of most users",
    subtitle: "Two weeks strong. This is becoming a habit.",
    quote: "You don't have to be extreme, just consistent.",
  },
  {
    key: "day_21",
    day: 21,
    emoji: "🏆",
    title: "Challenge complete!",
    subtitle: "21 days. You've built a real habit.",
    quote: "The only impossible journey is the one you never begin.",
  },
];

/**
 * Check whether a new milestone should be triggered after a meal log.
 *
 * @param completedDays - Number of distinct days logged in the challenge window
 * @param currentStreak - User's current consecutive-day streak
 * @param seenMilestones - Already-dismissed milestone keys
 * @param totalMeals - Total number of meals logged (for first-log detection)
 */
export function checkMilestone(
  completedDays: number,
  currentStreak: number,
  seenMilestones: MilestoneKey[],
  totalMeals: number
): MilestoneCheck {
  // Iterate in reverse so the highest eligible milestone fires
  for (let i = MILESTONES.length - 1; i >= 0; i--) {
    const m = MILESTONES[i];
    if (seenMilestones.includes(m.key)) continue;

    if (m.key === "first_log" && totalMeals >= 1) {
      return { triggered: true, milestone: m };
    }

    // For day milestones, use the larger of completedDays or currentStreak
    const effectiveDays = Math.max(completedDays, currentStreak);
    if (m.key !== "first_log" && effectiveDays >= m.day) {
      return { triggered: true, milestone: m };
    }
  }

  return { triggered: false, milestone: null };
}

/**
 * Get the motivational message for the share card based on the milestone.
 */
export function getMilestoneQuote(key: MilestoneKey): string {
  return MILESTONES.find((m) => m.key === key)?.quote ?? "";
}
