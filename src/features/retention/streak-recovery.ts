/**
 * Streak Recovery Service
 *
 * Generates loss-aversion messaging when a user breaks their streak.
 * The goal: make quitting feel emotionally wrong so they restart immediately.
 *
 * Pure functions — no side effects.
 */

import type { StreakRecovery } from "./retention.types";

/**
 * Generate a recovery message when the user's streak has broken.
 * Escalates urgency based on how long the streak was.
 */
export function getStreakRecovery(lostStreak: number): StreakRecovery {
  if (lostStreak >= 14) {
    return {
      lostStreak,
      message: `You were ${lostStreak} days in. That's real discipline — don't throw it away.`,
      ctaText: "Start a new streak now",
      urgency: "intense",
    };
  }

  if (lostStreak >= 7) {
    return {
      lostStreak,
      message: `${lostStreak} days of consistency — gone. But you can rebuild. Start now.`,
      ctaText: "Get back on track",
      urgency: "firm",
    };
  }

  if (lostStreak >= 3) {
    return {
      lostStreak,
      message: `You were ${lostStreak} days in. Don't restart from zero — log a meal now.`,
      ctaText: "Log a meal",
      urgency: "firm",
    };
  }

  return {
    lostStreak,
    message: "Your streak reset. One meal gets you back on Day 1.",
    ctaText: "Start again",
    urgency: "gentle",
  };
}

/**
 * Get a push notification message for streak recovery.
 * Sent the morning after a streak breaks.
 */
export function getStreakRecoveryNotification(lostStreak: number): {
  title: string;
  body: string;
} {
  if (lostStreak >= 7) {
    return {
      title: `Your ${lostStreak}-day streak ended`,
      body: "You built something real. Don't let one day erase it. Come back.",
    };
  }

  if (lostStreak >= 3) {
    return {
      title: "Your streak reset 😔",
      body: `You were ${lostStreak} days in. Log one meal to start rebuilding.`,
    };
  }

  return {
    title: "Start fresh today",
    body: "Your streak reset. One meal gets you back on track.",
  };
}
