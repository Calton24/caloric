/**
 * Meal Reminders Service
 *
 * Schedules / cancels daily local notifications for breakfast, lunch, dinner,
 * and a "nothing logged today" nudge.
 */

import { notifications } from "../../infrastructure/notifications";

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
