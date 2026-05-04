/**
 * Canonical language config used across the app.
 *
 * Single source of truth for:
 * - Supported app UI languages
 * - Human-readable labels + flags
 * - Voice-language picker options (including Auto)
 */

export const SUPPORTED_APP_LANGUAGE_CODES = [
  "en-GB",
  "en-US",
  "de",
  "es",
  "fr",
  "nl",
  "pl",
  "pt",
  "pt-BR",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_APP_LANGUAGE_CODES)[number];

export interface SupportedLanguageOption {
  code: SupportedLanguage;
  label: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: readonly SupportedLanguageOption[] = [
  { code: "en-GB", label: "English (UK)", flag: "🇬🇧" },
  { code: "en-US", label: "English (US)", flag: "🇺🇸" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "pt", label: "Português", flag: "🇵🇹" },
  { code: "pt-BR", label: "Português (BR)", flag: "🇧🇷" },
] as const;

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> =
  SUPPORTED_LANGUAGES.reduce(
    (acc, option) => {
      acc[option.code] = option.label;
      return acc;
    },
    {} as Record<SupportedLanguage, string>
  );

export type VoiceLanguageCode = SupportedLanguage | "auto";

export interface VoiceLanguageOption {
  code: VoiceLanguageCode;
  label: string;
  flag: string;
}

export const AUTO_VOICE_LANGUAGE_OPTION: VoiceLanguageOption = {
  code: "auto",
  label: "Auto (Recommended)",
  flag: "🌍",
};

export const SUPPORTED_VOICE_LANGUAGES: readonly VoiceLanguageOption[] = [
  AUTO_VOICE_LANGUAGE_OPTION,
  ...SUPPORTED_LANGUAGES,
] as const;

export function isSupportedLanguage(code: string): code is SupportedLanguage {
  return (SUPPORTED_APP_LANGUAGE_CODES as readonly string[]).includes(code);
}

/** Resolve a device locale string to a supported app language code. */
export function resolveToSupportedLanguage(deviceLocale: string): SupportedLanguage {
  if (isSupportedLanguage(deviceLocale)) return deviceLocale;

  const langCode = deviceLocale.split("-")[0];

  // English variants: US stays US, everything else -> GB.
  if (langCode === "en") {
    return deviceLocale.toLowerCase().includes("us") ? "en-US" : "en-GB";
  }

  if (isSupportedLanguage(langCode)) return langCode;
  if (langCode === "pt") {
    return deviceLocale.toLowerCase().includes("br") ? "pt-BR" : "pt";
  }
  return "en-GB";
}
