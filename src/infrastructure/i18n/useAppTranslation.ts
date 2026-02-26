/**
 * useAppTranslation — The only public i18n hook.
 *
 * Feature code imports this. Never import i18next or react-i18next directly.
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

export function useAppTranslation() {
  const { t, i18n } = useTranslation("common");

  const changeLanguage = useCallback(
    async (lang: SupportedLanguage) => {
      await i18n.changeLanguage(lang);
      await persistLanguage(lang);
    },
    [i18n]
  );

  return {
    /** Translation function — `t("auth.signIn")` */
    t,
    /** Current active language code */
    language: (i18n.language ?? "en") as SupportedLanguage,
    /** Switch language at runtime + persist to AsyncStorage */
    changeLanguage,
  };
}
