/**
 * i18n Infrastructure — Tests
 *
 * Covers: init gating, idempotent init, fallback behaviour,
 * language change + persistence, format utilities.
 */

/* eslint-disable import/no-named-as-default-member */
// We intentionally use i18next.t() and i18next.changeLanguage() to test the instance state

// Mock react-i18next — lightweight plugin stub for node env
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18next from "i18next";
import { resetConfigCache } from "../../config";

import {
    clearPersistedLanguage,
    formatCurrency,
    formatDate,
    formatNumber,
    getDeviceLocale,
    initI18n,
    resetI18n,
    SUPPORTED_LANGUAGES,
} from "./index";

jest.mock("react-i18next", () => ({
  initReactI18next: {
    type: "3rdParty",
    init: jest.fn(),
  },
  useTranslation: jest.fn(() => ({
    t: jest.fn((key: string) => key),
    i18n: { language: "en", changeLanguage: jest.fn() },
  })),
}));

// Mock expo-localization
jest.mock("expo-localization", () => ({
  getLocales: () => [{ languageTag: "de-DE", languageCode: "de" }],
  locale: "de-DE",
}));

// ---------- Helpers ----------

beforeEach(() => {
  resetI18n();
  resetConfigCache();
  // Restore mock implementations (resetMocks: true wipes them each test)
  (AsyncStorage.getItem as jest.Mock).mockImplementation(() =>
    Promise.resolve(null)
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation(() =>
    Promise.resolve()
  );
  (AsyncStorage.removeItem as jest.Mock).mockImplementation(() =>
    Promise.resolve()
  );
});

// ---------- Init ----------

describe("initI18n", () => {
  it("initialises i18next with device locale (de)", async () => {
    await initI18n();
    expect(i18next.language).toBe("de");
  });

  it("is idempotent — double init does not throw", async () => {
    await initI18n();
    const lang = i18next.language;
    await initI18n(); // second call — no-op
    expect(i18next.language).toBe(lang);
  });

  it("logs disabled when config gate is off", async () => {
    // Override the config to disable i18n
    jest.doMock("../../config", () => ({
      getAppConfig: () => ({
        features: { i18n: false },
        profile: "intake",
      }),
    }));

    jest.resetModules();

    // Re-mock deps for fresh module graph
    jest.mock("react-i18next", () => ({
      initReactI18next: { type: "3rdParty", init: jest.fn() },
      useTranslation: jest.fn(),
    }));
    jest.mock("expo-localization", () => ({
      getLocales: () => [{ languageTag: "de-DE", languageCode: "de" }],
      locale: "de-DE",
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { initI18n: initFresh, resetI18n: resetFresh } = require("./index");
    resetFresh();
    await initFresh();

    expect(console.log).toHaveBeenCalledWith("[i18n] mode=disabled");
  });

  it("uses persisted language override from AsyncStorage", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(() =>
      Promise.resolve("fr")
    );
    await initI18n();
    expect(i18next.language).toBe("fr");
  });

  it("ignores invalid persisted language and falls back to device locale", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(() =>
      Promise.resolve("xx-INVALID")
    );
    await initI18n();
    // Device locale mock returns de-DE → resolved "de"
    expect(i18next.language).toBe("de");
  });
});

// ---------- Device Locale ----------

describe("getDeviceLocale", () => {
  it("returns the device locale string", () => {
    const locale = getDeviceLocale();
    expect(locale).toBe("de-DE");
  });
});

// ---------- Supported Languages ----------

describe("SUPPORTED_LANGUAGES", () => {
  it("contains exactly 8 languages", () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(8);
  });

  it("includes en, de, es, fr, nl, pl, pt, pt-BR", () => {
    expect(SUPPORTED_LANGUAGES).toEqual(
      expect.arrayContaining([
        "en",
        "de",
        "es",
        "fr",
        "nl",
        "pl",
        "pt",
        "pt-BR",
      ])
    );
  });
});

// ---------- Persistence ----------

describe("clearPersistedLanguage", () => {
  it("calls AsyncStorage.removeItem", async () => {
    await clearPersistedLanguage();
    expect(AsyncStorage.removeItem).toHaveBeenCalled();
  });
});

// ---------- Language change ----------

describe("changeLanguage (via i18next)", () => {
  it("changes active language", async () => {
    await initI18n();
    await i18next.changeLanguage("es");
    expect(i18next.language).toBe("es");
  });
});

// ---------- Translations ----------

describe("translations", () => {
  it("returns English translations for en", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(() =>
      Promise.resolve("en")
    );
    resetI18n();
    await initI18n();
    expect(i18next.t("app.title", { ns: "common" })).toBe("Caloric");
    expect(i18next.t("auth.signIn", { ns: "common" })).toBe("Sign In");
  });

  it("returns German translations for de", async () => {
    await initI18n(); // device locale = de
    expect(i18next.t("auth.signIn", { ns: "common" })).toBe("Anmelden");
  });

  it("handles pluralisation (English)", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(() =>
      Promise.resolve("en")
    );
    resetI18n();
    await initI18n();
    const one = i18next.t("calories.value", { count: 1, ns: "common" });
    const many = i18next.t("calories.value", { count: 5, ns: "common" });
    expect(one).toContain("calorie");
    expect(many).toContain("calories");
  });
});

// ---------- Format Utilities ----------

describe("formatCurrency", () => {
  it("formats USD by default", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(() =>
      Promise.resolve("en")
    );
    resetI18n();
    await initI18n();
    const result = formatCurrency(9.99);
    expect(result).toContain("9.99");
  });
});

describe("formatNumber", () => {
  it("formats with locale grouping", async () => {
    (AsyncStorage.getItem as jest.Mock).mockImplementation(() =>
      Promise.resolve("en")
    );
    resetI18n();
    await initI18n();
    const result = formatNumber(1234567);
    expect(result).toContain("1,234,567");
  });
});

describe("formatDate", () => {
  it("returns a string", async () => {
    await initI18n();
    const result = formatDate(new Date(2026, 1, 23));
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
