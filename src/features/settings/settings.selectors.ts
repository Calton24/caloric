/**
 * Settings Selectors
 *
 * Pure-function helpers for deriving display labels from settings state.
 */

import type { AppSettings, LanguageOption } from "./settings.types";

// ── Supported languages ────────────────────────────────────
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { label: "العربية", flag: "🇸🇦", value: "ar-SA" },
  { label: "Dansk", flag: "🇩🇰", value: "da-DK" },
  { label: "Deutsch", flag: "🇩🇪", value: "de-DE" },
  { label: "English", flag: "🇺🇸", value: "en-US" },
  { label: "Español (Latinoamérica)", flag: "🌎", value: "es-419" },
  { label: "Español", flag: "🇪🇸", value: "es-ES" },
  { label: "Français", flag: "🇫🇷", value: "fr-FR" },
  { label: "Indonesia", flag: "🇮🇩", value: "id-ID" },
  { label: "Italiano", flag: "🇮🇹", value: "it-IT" },
  { label: "日本語", flag: "🇯🇵", value: "ja-JP" },
  { label: "한국어", flag: "🇰🇷", value: "ko-KR" },
  { label: "Nederlands", flag: "🇳🇱", value: "nl-NL" },
  { label: "Polski", flag: "🇵🇱", value: "pl-PL" },
  { label: "Português", flag: "🇧🇷", value: "pt-BR" },
  { label: "Русский", flag: "🇷🇺", value: "ru-RU" },
  { label: "Türkçe", flag: "🇹🇷", value: "tr-TR" },
  { label: "中文 (简体)", flag: "🇨🇳", value: "zh-CN" },
];

/** Get display label for a language code */
export function getLanguageLabel(code: string): string {
  const found = LANGUAGE_OPTIONS.find((o) => o.value === code);
  return found?.label ?? code;
}

/** Get display label for units preference */
export function getUnitsLabel(settings: AppSettings): string {
  switch (settings.unitsPreference) {
    case "metric":
      return "Metric";
    case "imperial":
      return "Imperial";
    default:
      return "Use System";
  }
}
