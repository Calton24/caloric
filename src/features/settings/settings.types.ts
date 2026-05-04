/**
 * Settings Domain Types
 *
 * App-level preferences and feature toggles.
 */

import type {
  SupportedLanguage,
  VoiceLanguageCode,
} from "../../config/languages";

export type UnitsPreference = "system" | "metric" | "imperial";

export interface AppSettings {
  /** App UI language (shared with i18n), e.g. "en-GB". */
  appLanguage: SupportedLanguage;
  /** Voice parsing language. "auto" follows app language. */
  voiceLanguage: VoiceLanguageCode;
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
  value: VoiceLanguageCode;
}
