/**
 * Enable or disable meal log reminder notifications (local schedules + store flag).
 * Shared by Settings, home menu, and legacy routes.
 */

import { notifications } from "../../infrastructure/notifications";
import { useSettingsStore } from "../settings";
import { cancelMealReminders, scheduleMealReminders } from "./meal-reminders.service";

/**
 * When enabling, requests OS permission; if not granted, leaves the flag off
 * and does not schedule. When disabling, cancels reminders then clears the flag.
 */
export async function applyLogReminderEnabled(enabled: boolean): Promise<void> {
  if (enabled) {
    const status = await notifications.requestPermissions();
    if (status !== "granted") return;
    await scheduleMealReminders();
  } else {
    await cancelMealReminders();
  }
  useSettingsStore.getState().setLogReminderEnabled(enabled);
}
