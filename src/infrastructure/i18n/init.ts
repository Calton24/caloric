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

// Translation resources — static imports, split by feature namespace
// Each feature file exports its own top-level keys (e.g. auth.json → { auth: { ... } })
// They are deep-merged into a single "common" namespace for i18next.

import enAuth from "../../locales/en/auth.json";
import enCommon from "../../locales/en/common.json";
import enGoals from "../../locales/en/goals.json";
import enGuide from "../../locales/en/guide.json";
import enHome from "../../locales/en/home.json";
import enOnboarding from "../../locales/en/onboarding.json";
import enPermissions from "../../locales/en/permissions.json";
import enProgress from "../../locales/en/progress.json";
import enSettings from "../../locales/en/settings.json";
import enTracking from "../../locales/en/tracking.json";

import deAuth from "../../locales/de/auth.json";
import deCommon from "../../locales/de/common.json";
import deGoals from "../../locales/de/goals.json";
import deGuide from "../../locales/de/guide.json";
import deHome from "../../locales/de/home.json";
import deOnboarding from "../../locales/de/onboarding.json";
import dePermissions from "../../locales/de/permissions.json";
import deProgress from "../../locales/de/progress.json";
import deSettings from "../../locales/de/settings.json";
import deTracking from "../../locales/de/tracking.json";

import esAuth from "../../locales/es/auth.json";
import esCommon from "../../locales/es/common.json";
import esGoals from "../../locales/es/goals.json";
import esGuide from "../../locales/es/guide.json";
import esHome from "../../locales/es/home.json";
import esOnboarding from "../../locales/es/onboarding.json";
import esPermissions from "../../locales/es/permissions.json";
import esProgress from "../../locales/es/progress.json";
import esSettings from "../../locales/es/settings.json";
import esTracking from "../../locales/es/tracking.json";

import frAuth from "../../locales/fr/auth.json";
import frCommon from "../../locales/fr/common.json";
import frGoals from "../../locales/fr/goals.json";
import frGuide from "../../locales/fr/guide.json";
import frHome from "../../locales/fr/home.json";
import frOnboarding from "../../locales/fr/onboarding.json";
import frPermissions from "../../locales/fr/permissions.json";
import frProgress from "../../locales/fr/progress.json";
import frSettings from "../../locales/fr/settings.json";
import frTracking from "../../locales/fr/tracking.json";

import nlAuth from "../../locales/nl/auth.json";
import nlCommon from "../../locales/nl/common.json";
import nlGoals from "../../locales/nl/goals.json";
import nlGuide from "../../locales/nl/guide.json";
import nlHome from "../../locales/nl/home.json";
import nlOnboarding from "../../locales/nl/onboarding.json";
import nlPermissions from "../../locales/nl/permissions.json";
import nlProgress from "../../locales/nl/progress.json";
import nlSettings from "../../locales/nl/settings.json";
import nlTracking from "../../locales/nl/tracking.json";

import plAuth from "../../locales/pl/auth.json";
import plCommon from "../../locales/pl/common.json";
import plGoals from "../../locales/pl/goals.json";
import plGuide from "../../locales/pl/guide.json";
import plHome from "../../locales/pl/home.json";
import plOnboarding from "../../locales/pl/onboarding.json";
import plPermissions from "../../locales/pl/permissions.json";
import plProgress from "../../locales/pl/progress.json";
import plSettings from "../../locales/pl/settings.json";
import plTracking from "../../locales/pl/tracking.json";

import ptAuth from "../../locales/pt/auth.json";
import ptCommon from "../../locales/pt/common.json";
import ptGoals from "../../locales/pt/goals.json";
import ptGuide from "../../locales/pt/guide.json";
import ptHome from "../../locales/pt/home.json";
import ptOnboarding from "../../locales/pt/onboarding.json";
import ptPermissions from "../../locales/pt/permissions.json";
import ptProgress from "../../locales/pt/progress.json";
import ptSettings from "../../locales/pt/settings.json";
import ptTracking from "../../locales/pt/tracking.json";

import ptBRAuth from "../../locales/pt-BR/auth.json";
import ptBRCommon from "../../locales/pt-BR/common.json";
import ptBRGoals from "../../locales/pt-BR/goals.json";
import ptBRGuide from "../../locales/pt-BR/guide.json";
import ptBRHome from "../../locales/pt-BR/home.json";
import ptBROnboarding from "../../locales/pt-BR/onboarding.json";
import ptBRPermissions from "../../locales/pt-BR/permissions.json";
import ptBRProgress from "../../locales/pt-BR/progress.json";
import ptBRSettings from "../../locales/pt-BR/settings.json";
import ptBRTracking from "../../locales/pt-BR/tracking.json";

/** Shallow-merge feature namespace files into one object per language */
function mergeNamespaces(
  ...files: Record<string, unknown>[]
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};
  for (const file of files) {
    Object.assign(merged, file);
  }
  return merged;
}

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

const en = mergeNamespaces(
  enCommon,
  enAuth,
  enOnboarding,
  enHome,
  enSettings,
  enTracking,
  enProgress,
  enPermissions,
  enGoals,
  enGuide
);

const resources = {
  "en-GB": { common: en },
  "en-US": { common: en },
  de: {
    common: mergeNamespaces(
      deCommon,
      deAuth,
      deOnboarding,
      deHome,
      deSettings,
      deTracking,
      deProgress,
      dePermissions,
      deGoals,
      deGuide
    ),
  },
  es: {
    common: mergeNamespaces(
      esCommon,
      esAuth,
      esOnboarding,
      esHome,
      esSettings,
      esTracking,
      esProgress,
      esPermissions,
      esGoals,
      esGuide
    ),
  },
  fr: {
    common: mergeNamespaces(
      frCommon,
      frAuth,
      frOnboarding,
      frHome,
      frSettings,
      frTracking,
      frProgress,
      frPermissions,
      frGoals,
      frGuide
    ),
  },
  nl: {
    common: mergeNamespaces(
      nlCommon,
      nlAuth,
      nlOnboarding,
      nlHome,
      nlSettings,
      nlTracking,
      nlProgress,
      nlPermissions,
      nlGoals,
      nlGuide
    ),
  },
  pl: {
    common: mergeNamespaces(
      plCommon,
      plAuth,
      plOnboarding,
      plHome,
      plSettings,
      plTracking,
      plProgress,
      plPermissions,
      plGoals,
      plGuide
    ),
  },
  pt: {
    common: mergeNamespaces(
      ptCommon,
      ptAuth,
      ptOnboarding,
      ptHome,
      ptSettings,
      ptTracking,
      ptProgress,
      ptPermissions,
      ptGoals,
      ptGuide
    ),
  },
  "pt-BR": {
    common: mergeNamespaces(
      ptBRCommon,
      ptBRAuth,
      ptBROnboarding,
      ptBRHome,
      ptBRSettings,
      ptBRTracking,
      ptBRProgress,
      ptBRPermissions,
      ptBRGoals,
      ptBRGuide
    ),
  },
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
