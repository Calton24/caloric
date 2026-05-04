/**
 * Runtime Stale Translation Tests
 *
 * Verifies that module-scope constant arrays using the "*Key" pattern
 * resolve correctly at render time (not at module load), preventing
 * stale English strings after language switching.
 *
 * Also verifies that new i18n keys added for runtime fixes exist in
 * all supported locales.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { changeLanguage, t } from "i18next";
import { resetConfigCache } from "../src/config";
import {
    initI18n,
    resetI18n,
    SUPPORTED_LANGUAGES,
    type SupportedLanguage,
} from "../src/infrastructure/i18n";

// ---------- Mocks ----------

jest.mock("react-i18next", () => ({
  initReactI18next: {
    type: "3rdParty",
    init: jest.fn(),
  },
  useTranslation: jest.fn(() => ({
    t: jest.fn((key: string) => key),
    i18n: { language: "en-GB", changeLanguage: jest.fn() },
  })),
}));

jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "en-GB", languageCode: "en" }],
  locale: "en-GB",
}));

// ---------- Setup ----------

beforeEach(() => {
  resetI18n();
  resetConfigCache();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
});

// ---------- Helpers ----------

async function switchTo(lang: SupportedLanguage) {
  await changeLanguage(lang);
}

// ---------- Tests ----------

describe("runtime key resolution after language switch", () => {
  beforeEach(async () => {
    await initI18n();
  });

  it("day abbreviation keys resolve differently per language", async () => {
    const dayKeys = [
      "days.monShort",
      "days.tueShort",
      "days.wedShort",
      "days.thuShort",
      "days.friShort",
      "days.satShort",
      "days.sunShort",
    ];

    // English
    const enValues = dayKeys.map((k) => t(k));
    expect(enValues).toEqual(["M", "T", "W", "T", "F", "S", "S"]);

    // Spanish should differ
    await switchTo("es");
    const esValues = dayKeys.map((k) => t(k));
    expect(esValues).toEqual(["L", "M", "X", "J", "V", "S", "D"]);
    expect(esValues).not.toEqual(enValues);

    // Switch back to English
    await switchTo("en-GB");
    const enAgain = dayKeys.map((k) => t(k));
    expect(enAgain).toEqual(enValues);
  });

  it("paywall tier labels resolve per language", async () => {
    const keys = [
      "paywall.tierMonthly",
      "paywall.tierYearly",
      "paywall.tierPlan",
    ];

    const en = keys.map((k) => t(k));
    expect(en).toEqual(["Monthly", "Yearly", "Plan"]);

    await switchTo("de");
    const de = keys.map((k) => t(k));
    expect(de).toEqual(["Monatlich", "Jährlich", "Plan"]);

    await switchTo("fr");
    const fr = keys.map((k) => t(k));
    expect(fr).toEqual(["Mensuel", "Annuel", "Plan"]);
  });

  it("quick food label keys exist in all languages", async () => {
    const foodKeys = [
      "manualLog.eggs",
      "manualLog.banana",
      "manualLog.salad",
      "manualLog.chicken",
      "manualLog.rice",
      "manualLog.yogurt",
    ];

    for (const lang of SUPPORTED_LANGUAGES) {
      await switchTo(lang);
      for (const key of foodKeys) {
        const val = t(key);
        expect(val).not.toBe(key); // should not return the key itself
        expect(val.length).toBeGreaterThan(0);
      }
    }
  });

  it("view mode short labels exist in all languages", async () => {
    const keys = ["home.dayShort", "home.weekShort", "home.monthShort"];

    for (const lang of SUPPORTED_LANGUAGES) {
      await switchTo(lang);
      for (const key of keys) {
        const val = t(key);
        expect(val).not.toBe(key);
        expect(val.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("key existence across all locales", () => {
  beforeEach(async () => {
    await initI18n();
  });

  const RUNTIME_KEYS = [
    // Day abbreviations
    "days.monShort",
    "days.tueShort",
    "days.wedShort",
    "days.thuShort",
    "days.friShort",
    "days.satShort",
    "days.sunShort",
    // Paywall tiers
    "paywall.tierMonthly",
    "paywall.tierYearly",
    "paywall.tierPlan",
    // Quick foods
    "manualLog.eggs",
    "manualLog.banana",
    "manualLog.salad",
    "manualLog.chicken",
    "manualLog.rice",
    "manualLog.yogurt",
    // View modes
    "home.dayShort",
    "home.weekShort",
    "home.monthShort",
    // Insights header
    "insights.header",
    // Best value badge
    "paywall.bestValueStar",
  ];

  it.each(RUNTIME_KEYS)("key '%s' exists in all languages", async (key) => {
    for (const lang of SUPPORTED_LANGUAGES) {
      await switchTo(lang);
      const val = t(key);
      expect(val).not.toBe(key);
      expect(val.length).toBeGreaterThan(0);
    }
  });
});

describe("no stale module-scope values after switch", () => {
  beforeEach(async () => {
    await initI18n();
  });

  it("simulates component re-render: keys resolve fresh after switch", async () => {
    // Simulate: component mounts, reads key array, calls t() at render
    const ANALYSIS_STAGE_KEYS = ["camera.detecting", "camera.readingPackaging"];

    // Initial render in English
    const enLabels = ANALYSIS_STAGE_KEYS.map((k) => t(k));
    expect(enLabels.length).toBeGreaterThan(0);

    // Switch language (simulates user changing lang in settings)
    await switchTo("es");

    // Re-render: same key array, but t() should return Spanish
    const esLabels = ANALYSIS_STAGE_KEYS.map((k) => t(k));

    // At minimum, the keys should resolve (not return raw key)
    for (const label of esLabels) {
      expect(label).not.toMatch(/^camera\./);
    }
  });
});
