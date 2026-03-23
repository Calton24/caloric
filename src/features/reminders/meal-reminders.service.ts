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
