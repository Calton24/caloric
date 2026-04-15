/**
 * Retention Engine — Notification System
 *
 * Day-specific notifications from the journey, plus a rotation fallback
 * for non-specific days. The day-journey is the source of truth for
 * notifications at key moments (Day 1-21).
 *
 * Rotation categories (used as fallback):
 *   🔔 Reminder  — "Day X is waiting"
 *   ⚠️ Risk      — "Your streak is at risk"
 *   🧠 Identity  — "You're building something real"
 *   🔥 Pressure  — "Don't break your streak"
 */

import { getDayNotification } from "./day-journey";
import type {
    NotificationCategory,
    NotificationTemplate,
} from "./retention.types";

// ── Fallback rotation templates (for post-Day-21 or general use) ──

const FALLBACK_TEMPLATES: NotificationTemplate[] = [
  {
    category: "reminder",
    title: "Day {day} is waiting",
    body: "Log your first meal to keep your streak alive.",
  },
  {
    category: "pressure",
    title: "Your streak is at risk",
    body: "You're {streak} days in. Don't restart now.",
  },
  {
    category: "identity",
    title: "You're building something real",
    body: "{streak} days of consistency. That's not luck — that's you.",
  },
  {
    category: "pressure",
    title: "Don't break your streak",
    body: "{streak} days of work. Gone if you skip today.",
  },
];

const CATEGORY_ROTATION: NotificationCategory[] = [
  "reminder",
  "pressure",
  "identity",
];

/**
 * Get the notification for a specific streak day.
 * Days 1-21 get the exact scripted notification from day-journey.
 * Post-Day-21 falls back to the rotation system.
 */
export function getNextNotification(
  rotationIndex: number,
  currentStreak: number,
  currentDay: number
): { template: NotificationTemplate; title: string; body: string } {
  // Days 1-21: use the exact journey-scripted notification
  if (currentDay >= 1 && currentDay <= 21) {
    const dayNotif = getDayNotification(currentDay);
    const template: NotificationTemplate = {
      category: "reminder",
      title: dayNotif.title,
      body: dayNotif.body,
    };
    return { template, title: dayNotif.title, body: dayNotif.body };
  }

  // Post-Day-21: rotate through fallback templates
  const categoryIdx = rotationIndex % CATEGORY_ROTATION.length;
  const category = CATEGORY_ROTATION[categoryIdx];

  const eligible = FALLBACK_TEMPLATES.filter((t) => t.category === category);
  const candidates = eligible.length > 0 ? eligible : FALLBACK_TEMPLATES;
  const templateIdx = rotationIndex % candidates.length;
  const template = candidates[templateIdx];

  const title = replaceVars(template.title, currentStreak, currentDay);
  const body = replaceVars(template.body, currentStreak, currentDay);

  return { template, title, body };
}

function replaceVars(text: string, streak: number, day: number): string {
  return text
    .replace(/\{streak\}/g, String(streak))
    .replace(/\{day\}/g, String(day));
}
