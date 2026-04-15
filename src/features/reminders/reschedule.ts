/**
 * Reschedule meal reminders on app boot when the setting is enabled.
 *
 * Called once from CaloricProviders after notification init.
 * Fire-and-forget — errors are swallowed to avoid blocking boot.
 */

import { useSettingsStore } from "../settings/settings.store";
import { scheduleMealReminders } from "./meal-reminders.service";

export function rescheduleRemindersIfEnabled(): void {
  const { logReminderEnabled } = useSettingsStore.getState().settings;
  if (!logReminderEnabled) return;

  // Re-schedule silently; we already have permission from the initial toggle
  scheduleMealReminders().catch((err) =>
    console.warn("[Reminders] reschedule failed:", err)
  );
}
