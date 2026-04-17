/**
 * i18n — Public barrel export
 */

// ── Bootstrap (called once in CaloricProviders) ──
export { getDeviceLocale, initI18n, resetI18n } from "./init";

// ── Constants ──
export {
    LANGUAGE_LABELS,
    SUPPORTED_LANGUAGES,
    clearPersistedLanguage,
    persistLanguage
} from "./init";
export type { SupportedLanguage } from "./init";

// ── Consumer hook (feature code uses this) ──
export { useAppTranslation } from "./useAppTranslation";

// ── Formatting utilities ──
export {
    formatCurrency,
    formatDate,
    formatDateHeader,
    formatMonthDay,
    formatMonthDayYear,
    formatMonthYear,
    formatNumber,
    formatWeekdayLong,
    formatWeekdayShort
} from "./format";

// ── Generated types (for advanced usage — most code just uses useAppTranslation) ──
export type {
    ParamTranslationKey,
    SimpleTranslationKey,
    TranslationKey,
    TranslationParams
} from "./types.generated";

