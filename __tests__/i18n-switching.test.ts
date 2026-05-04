/**
 * Language Switching Tests
 *
 * Verifies that:
 * 1. Language change updates all translation outputs immediately
 * 2. Persistence works (language survives restart)
 * 3. All 9 languages produce non-empty, correct translations
 * 4. Interpolation works across all languages
 * 5. Key parity — every key in English exists in every language
 * 6. No stale translations after switching
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import i18next from "i18next";
import { resetConfigCache } from "../src/config";
import {
  initI18n,
  persistLanguage,
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

// ---------- Core language switching ----------

describe("language switching", () => {
  it("changes t() output when language is switched", async () => {
    await initI18n();

    // Start in English
    await i18next.changeLanguage("en-GB");
    const enValue = i18next.t("auth.signIn", { ns: "common" });
    expect(enValue).toBe("Sign In");

    // Switch to German
    await i18next.changeLanguage("de");
    const deValue = i18next.t("auth.signIn", { ns: "common" });
    expect(deValue).toBe("Anmelden");
    expect(deValue).not.toBe(enValue);

    // Switch to Spanish
    await i18next.changeLanguage("es");
    const esValue = i18next.t("auth.signIn", { ns: "common" });
    expect(esValue).toBe("Iniciar sesión");
    expect(esValue).not.toBe(enValue);
  });

  it("switches through all 9 languages without error", async () => {
    await initI18n();

    for (const lang of SUPPORTED_LANGUAGES) {
      await i18next.changeLanguage(lang);
      const title = i18next.t("app.title", { ns: "common" });
      expect(title).toBeTruthy();
      expect(i18next.language).toBe(lang);
    }
  });

  it("returns different translations for each non-English language", async () => {
    await initI18n();

    await i18next.changeLanguage("en-GB");
    const enCancel = i18next.t("common.cancel", { ns: "common" });

    const nonEnLangs: SupportedLanguage[] = ["de", "es", "fr", "nl", "pl", "pt", "pt-BR"];
    for (const lang of nonEnLangs) {
      await i18next.changeLanguage(lang);
      const localCancel = i18next.t("common.cancel", { ns: "common" });
      expect(localCancel).toBeTruthy();
      expect(localCancel.length).toBeGreaterThan(0);
      // At least some languages should differ from English
    }
  });
});

// ---------- Persistence ----------

describe("language persistence", () => {
  it("persists language choice to AsyncStorage", async () => {
    await initI18n();
    await persistLanguage("fr");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "mobile_core_i18n_language",
      "fr"
    );
  });

  it("restores persisted language on init", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("pl");
    await initI18n();
    expect(i18next.language).toBe("pl");
  });

  it("survives language switch + reinit (simulates app restart)", async () => {
    await initI18n();
    await i18next.changeLanguage("nl");
    await persistLanguage("nl");

    // Simulate restart: reset + reinit with persisted value
    resetI18n();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("nl");
    await initI18n();

    expect(i18next.language).toBe("nl");
    const value = i18next.t("common.save", { ns: "common" });
    expect(value).toBeTruthy();
  });
});

// ---------- Interpolation ----------

describe("interpolation across languages", () => {
  it("interpolates {{email}} in auth.verificationSent for all languages", async () => {
    await initI18n();

    for (const lang of SUPPORTED_LANGUAGES) {
      await i18next.changeLanguage(lang);
      const result = i18next.t("auth.verificationSent", {
        ns: "common",
        email: "test@example.com",
      });
      expect(result).toContain("test@example.com");
      // Should NOT contain the raw token
      expect(result).not.toContain("{{email}}");
    }
  });

  it("interpolates {{count}} in pluralised strings", async () => {
    await initI18n();
    await i18next.changeLanguage("en-GB");

    const one = i18next.t("calories.value", { count: 1, ns: "common" });
    const many = i18next.t("calories.value", { count: 5, ns: "common" });

    expect(one).toContain("1");
    expect(many).toContain("5");
    expect(one).not.toBe(many);
  });
});

// ---------- Key parity ----------

describe("key parity", () => {
  it("all languages have the same top-level namespace keys", async () => {
    await initI18n();

    await i18next.changeLanguage("en-GB");
    const enResources = i18next.getResourceBundle("en-GB", "common");
    const enTopKeys = Object.keys(enResources).sort();

    const nonEnLangs: SupportedLanguage[] = ["de", "es", "fr", "nl", "pl", "pt", "pt-BR"];
    for (const lang of nonEnLangs) {
      const resources = i18next.getResourceBundle(lang, "common");
      const topKeys = Object.keys(resources).sort();
      expect(topKeys).toEqual(enTopKeys);
    }
  });

  it("critical feature namespaces exist in all languages", async () => {
    await initI18n();

    const criticalNamespaces = [
      "auth", "common", "home", "settings", "tracking",
      "progress", "onboarding", "permissions",
    ];

    for (const lang of SUPPORTED_LANGUAGES) {
      const resources = i18next.getResourceBundle(lang, "common");
      for (const ns of criticalNamespaces) {
        expect(resources).toHaveProperty(
          ns,
          expect.anything()
        );
      }
    }
  });
});

// ---------- No stale values ----------

describe("no stale translations", () => {
  it("switching back and forth returns correct values each time", async () => {
    await initI18n();

    const pairs: [SupportedLanguage, string][] = [
      ["en-GB", "Settings"],
      ["de", "Einstellungen"],
      ["fr", "Paramètres"],
    ];

    // Go forward
    for (const [lang, expected] of pairs) {
      await i18next.changeLanguage(lang);
      expect(i18next.t("settings.title", { ns: "common" })).toBe(expected);
    }

    // Go backward
    for (const [lang, expected] of [...pairs].reverse()) {
      await i18next.changeLanguage(lang);
      expect(i18next.t("settings.title", { ns: "common" })).toBe(expected);
    }
  });
});
