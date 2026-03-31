/**
 * Meal Reminders Service
 *
 * Schedules / cancels daily local notifications for breakfast, lunch, dinner,
 * and a "nothing logged today" nudge. Also includes retention-driven
 * streak notifications with rotating psychology-based templates.
 */

import { notifications } from "../../infrastructure/notifications";
import { getDayNotification } from "../retention/day-journey";
import { getNextNotification } from "../retention/notification-templates";
import { getStreakRecoveryNotification } from "../retention/streak-recovery";

// ── Identifiers ──
const IDS = {
  breakfast: "meal-reminder-breakfast",
  lunch: "meal-reminder-lunch",
  dinner: "meal-reminder-dinner",
  nudge: "meal-reminder-nudge",
  streakWarning: "streak-risk-warning",
  streakCritical: "streak-risk-critical",
} as const;

// ── Default schedule (24-h clock) ──
const SCHEDULE = [
  {
    identifier: IDS.breakfast,
    title: "Good morning! 🌅",
    body: "Don't forget to log your breakfast.",
    hour: 8,
    minute: 0,
  },
  {
    identifier: IDS.lunch,
    title: "Lunchtime! 🥗",
    body: "Log what you're eating to stay on track.",
    hour: 12,
    minute: 0,
  },
  {
    identifier: IDS.dinner,
    title: "Dinner time! 🍽️",
    body: "Log your dinner before you wind down.",
    hour: 18,
    minute: 0,
  },
  {
    identifier: IDS.nudge,
    title: "You haven't logged anything today",
    body: "Tap here to quickly log a meal.",
    hour: 20,
    minute: 0,
  },
] as const;

/**
 * Schedule all four daily meal-reminder notifications.
 * Safe to call repeatedly — each call cancels then re-schedules.
 */
export async function scheduleMealReminders(): Promise<void> {
  // Cancel any existing before re-scheduling
  await cancelMealReminders();

  for (const item of SCHEDULE) {
    await notifications.scheduleDailyRepeat(item);
  }
}

/**
 * Cancel all meal-reminder notifications by their known identifiers.
 */
export async function cancelMealReminders(): Promise<void> {
  for (const id of Object.values(IDS)) {
    await notifications.cancelScheduled(id);
  }
}

// ── Streak-specific loss-aversion notifications ──

const STREAK_SCHEDULE = [
  {
    identifier: IDS.streakWarning,
    title: "Don't lose your streak 🔥",
    body: "You haven't logged today. Keep your streak alive!",
    hour: 18,
    minute: 0,
  },
  {
    identifier: IDS.streakCritical,
    title: "Last chance — streak ends tonight ⚠️",
    body: "Log one meal before midnight to save your streak.",
    hour: 21,
    minute: 0,
  },
] as const;

/**
 * Schedule streak-risk notifications (6pm warning + 9pm critical).
 * Only call when the user has an active streak.
 */
export async function scheduleStreakReminders(): Promise<void> {
  await cancelStreakReminders();
  for (const item of STREAK_SCHEDULE) {
    await notifications.scheduleDailyRepeat(item);
  }
}

/**
 * Cancel streak-risk notifications.
 */
export async function cancelStreakReminders(): Promise<void> {
  await notifications.cancelScheduled(IDS.streakWarning);
  await notifications.cancelScheduled(IDS.streakCritical);
}

// ── Retention-driven daily notification ──

const RETENTION_NUDGE_ID = "retention-daily-nudge";

/**
 * Schedule the evening retention notification for the current challenge day.
 * Days 1-21 get the exact scripted notification from the journey.
 * Post-Day-21 uses rotating psychology templates.
 *
 * @param rotationIndex — from retention store, incremented after each schedule
 * @param currentStreak — user's current streak count
 * @param currentDay — challenge day number
 */
export async function scheduleRetentionNotification(
  rotationIndex: number,
  currentStreak: number,
  currentDay: number
): Promise<void> {
  await notifications.cancelScheduled(RETENTION_NUDGE_ID);

  // Days 1-21: use exact journey notification (sent evening, 8pm)
  // Post-21: use rotation system (sent morning, 10am)
  const isDayJourney = currentDay >= 1 && currentDay <= 21;

  const { title, body } = isDayJourney
    ? getDayNotification(currentDay)
    : getNextNotification(rotationIndex, currentStreak, currentDay);

  await notifications.scheduleDailyRepeat({
    identifier: RETENTION_NUDGE_ID,
    title,
    body,
    hour: isDayJourney ? 20 : 10,
    minute: 0,
  });
}

/**
 * Schedule a streak recovery notification for the morning after a break.
 * Fires once at 9am with loss-aversion messaging.
 */
export async function scheduleStreakRecoveryNotification(
  lostStreak: number
): Promise<void> {
  const { title, body } = getStreakRecoveryNotification(lostStreak);

  await notifications.scheduleLocal({
    title,
    body,
    delaySeconds: 0, // Immediate (for recovery, schedule from background)
  });
}

export async function cancelRetentionNotification(): Promise<void> {
  await notifications.cancelScheduled(RETENTION_NUDGE_ID);
}
