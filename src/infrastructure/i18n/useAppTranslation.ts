/**
 * useAppTranslation — The only public i18n hook.
 *
 * Feature code imports this. Never import i18next or react-i18next directly.
 *
 * The `t` function is typed: simple keys autocomplete without params,
 * parameterised keys require the correct `{{ }}` variables.
 *
 * @example
 * ```tsx
 * import { useAppTranslation } from "@/infrastructure/i18n";
 *
 * function MyComponent() {
 *   const { t, language, changeLanguage } = useAppTranslation();
 *   return <Text>{t("auth.signIn")}</Text>;
 * }
 * ```
 */

import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { SupportedLanguage } from "./init";
import { persistLanguage } from "./init";
import type {
    ParamTranslationKey,
    SimpleTranslationKey,
    TranslationParams,
} from "./types.generated";

/** Overloaded t() — simple keys need no params, parameterised keys require them */
type TypedT = {
  (key: SimpleTranslationKey): string;
  <K extends ParamTranslationKey>(key: K, params: TranslationParams[K]): string;
  // Escape hatch: any string with optional params (for dynamic keys like labelKey patterns)
  (key: string, params?: Record<string, string | number>): string;
};

export function useAppTranslation() {
  const { t: rawT, i18n } = useTranslation("common");

  const changeLanguage = useCallback(
    async (lang: SupportedLanguage) => {
      await i18n.changeLanguage(lang);
      await persistLanguage(lang);
    },
    [i18n]
  );

  return {
    /** Type-safe translation function */
    t: rawT as TypedT,
    /** Current active language code */
    language: (i18n.language ?? "en-GB") as SupportedLanguage,
    /** Switch language at runtime + persist to AsyncStorage */
    changeLanguage,
  };
}
