/**
 * i18n — Factory / Initialiser
 *
 * Gating:
 *   getAppConfig().features.i18n must be true, otherwise disabled.
 *
 * Boot sequence:
 *   1. Check config gate
 *   2. Read persisted language override from AsyncStorage
 *   3. Detect device locale via expo-localization
 *   4. Resolve to supported language (or fallback "en")
 *   5. Init i18next
 *   6. Log structured boot line
 *
 * Idempotent — safe to call multiple times.
 */

import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { getAppConfig } from "../../config";
import { logger } from "../../logging/logger";

// Translation resources — static imports (bundled)
import de from "../../locales/de/common.json";
import en from "../../locales/en/common.json";
import es from "../../locales/es/common.json";
import fr from "../../locales/fr/common.json";
import nl from "../../locales/nl/common.json";
import pl from "../../locales/pl/common.json";
import ptBR from "../../locales/pt-BR/common.json";
import pt from "../../locales/pt/common.json";

// ---------- Constants ----------

export const SUPPORTED_LANGUAGES = [
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
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  "en-GB": "English (UK)",
  "en-US": "English (US)",
  de: "Deutsch",
  es: "Español",
  fr: "Français",
  nl: "Nederlands",
  pl: "Polski",
  pt: "Português",
  "pt-BR": "Português (BR)",
};

const FALLBACK_LANGUAGE: SupportedLanguage = "en-GB";
const STORAGE_KEY = "mobile_core_i18n_language";

const resources = {
  "en-GB": { common: en },
  "en-US": { common: en },
  de: { common: de },
  es: { common: es },
  fr: { common: fr },
  nl: { common: nl },
  pl: { common: pl },
  pt: { common: pt },
  "pt-BR": { common: ptBR },
} as const;

// ---------- Dynamic requires (optional deps) ----------

let Localization: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Localization = require("expo-localization");
} catch {
  Localization = null;
}

let AsyncStorage: any = null;
try {
  AsyncStorage =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@react-native-async-storage/async-storage").default ??
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@react-native-async-storage/async-storage");
} catch {
  AsyncStorage = null;
}

// ---------- State ----------

let initialized = false;

type I18nMode = "disabled" | "enabled";

function logBoot(mode: I18nMode, locale?: string, fallback?: string): void {
  if (mode === "disabled") {
    logger.log("[i18n] mode=disabled");
  } else {
    logger.log(`[i18n] mode=enabled locale=${locale} fallback=${fallback}`);
  }
}

// ---------- Helpers ----------

function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(lang);
}

function resolveDeviceLocale(): string {
  try {
    if (Localization?.getLocales) {
      const locales = Localization.getLocales();
      if (Array.isArray(locales) && locales.length > 0) {
        return locales[0].languageTag ?? locales[0].languageCode ?? "en-GB";
      }
    }
    // Fallback to locale string
    if (Localization?.locale) {
      return Localization.locale;
    }
  } catch {
    // Swallow — non-fatal
  }
  return "en-GB";
}

function matchSupportedLanguage(deviceLocale: string): SupportedLanguage {
  // Exact match first (e.g. "pt-BR", "en-US", "en-GB")
  if (isSupportedLanguage(deviceLocale)) return deviceLocale;

  const langCode = deviceLocale.split("-")[0];

  // English variants: US stays US, everything else → GB
  if (langCode === "en") return "en-GB";

  // Try language code only (e.g. "de-AT" → "de")
  if (isSupportedLanguage(langCode)) return langCode;

  // Special case: "pt" without region → pt (European Portuguese)
  if (langCode === "pt") return "pt";

  return FALLBACK_LANGUAGE;
}

// ---------- Persistence ----------

async function loadStoredLanguage(): Promise<string | null> {
  if (!AsyncStorage) return null;
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function persistLanguage(lang: SupportedLanguage): Promise<void> {
  if (!AsyncStorage) return;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Swallow — non-fatal
  }
}

export async function clearPersistedLanguage(): Promise<void> {
  if (!AsyncStorage) return;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Swallow — non-fatal
  }
}

// ---------- Public API ----------

/**
 * Initialise i18next.
 * Idempotent — safe to call multiple times.
 * Must be awaited before rendering translated UI.
 */
export async function initI18n(): Promise<void> {
  if (initialized) return;

  const config = getAppConfig();
  if (!config.features.i18n) {
    logBoot("disabled");
    initialized = true;
    return;
  }

  // Determine language: persisted override > device locale > fallback
  const stored = await loadStoredLanguage();
  const deviceLocale = resolveDeviceLocale();
  const resolved: SupportedLanguage =
    stored && isSupportedLanguage(stored)
      ? stored
      : matchSupportedLanguage(deviceLocale);

  // eslint-disable-next-line import/no-named-as-default-member
  await i18next.use(initReactI18next).init({
    resources,
    lng: resolved,
    fallbackLng: FALLBACK_LANGUAGE,
    defaultNS: "common",
    ns: ["common"],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    compatibilityJSON: "v4", // Proper plural rules
    react: {
      useSuspense: false, // Avoid Suspense in RN
    },
  });

  logBoot("enabled", resolved, FALLBACK_LANGUAGE);
  initialized = true;
}

/** Testing only */
export function resetI18n(): void {
  initialized = false;
}

/**
 * Get the detected device locale string.
 * Safe to call anytime — never throws.
 */
export function getDeviceLocale(): string {
  return resolveDeviceLocale();
}
