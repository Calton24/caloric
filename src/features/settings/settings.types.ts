/**
 * Settings Domain Types
 *
 * App-level preferences and feature toggles.
 */

export type UnitsPreference = "system" | "metric" | "imperial";

export interface AppSettings {
  /** BCP-47 language code for voice/text input, e.g. "en-US" */
  inputLanguage: string;
  /** Unit system preference */
  unitsPreference: UnitsPreference;
  /** Whether the log-reminder notification is enabled */
  logReminderEnabled: boolean;
  /** Master toggle for Apple Health sync */
  appleHealthSyncEnabled: boolean;
  /** ISO timestamp of last Apple Health sync, null if never */
  lastAppleHealthSyncAt: string | null;
  /** Legacy flags (kept for backward compat) */
  liveActivitiesEnabled: boolean;
  notificationsEnabled: boolean;
  hasSeenPermissions: boolean;
  hasSeenLiveActivityIntro: boolean;
}

/** Supported language option for voice/text input */
export interface LanguageOption {
  label: string;
  flag: string;
  value: string;
}
