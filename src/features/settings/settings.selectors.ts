/**
 * Settings Selectors
 *
 * Pure-function helpers for deriving display labels from settings state.
 */

import {
  AUTO_VOICE_LANGUAGE_OPTION,
  SUPPORTED_VOICE_LANGUAGES,
} from "../../config/languages";
import type { AppSettings, LanguageOption } from "./settings.types";

// ── Supported languages ────────────────────────────────────
export const LANGUAGE_OPTIONS: LanguageOption[] = SUPPORTED_VOICE_LANGUAGES.map(
  (option) => ({
    label: option.label,
    flag: option.flag,
    value: option.code,
  })
);

/** Get display label for a language code */
export function getLanguageLabel(code: string): string {
  if (code === "auto") return AUTO_VOICE_LANGUAGE_OPTION.label;
  const found = LANGUAGE_OPTIONS.find((o) => o.value === code);
  return found?.label ?? code;
}

/** Get display label for a weight unit */
export function getUnitsLabel(
  _settings: AppSettings,
  weightUnit?: "lbs" | "kg"
): string {
  return weightUnit === "kg" ? "Metric" : "Imperial";
}
