/**
 * Formatting Utilities — Locale-aware
 *
 * Uses Intl APIs with the current i18next language.
 * All formatters read the active language at call time — never hardcoded.
 *
 * @example
 * ```ts
 * import { formatCurrency, formatNumber, formatDate } from "@/infrastructure/i18n";
 *
 * formatCurrency(9.99);          // "$9.99" (en) / "9,99 €" (de)
 * formatNumber(1234567);          // "1,234,567" (en) / "1.234.567" (de)
 * formatDate(new Date());         // "2/23/2026" (en) / "23.2.2026" (de)
 * ```
 */

import i18next from "i18next";

/** Map i18n language codes to BCP 47 locale tags for Intl */
function getIntlLocale(): string {
  const lang = i18next.language ?? "en-GB";
  // Intl expects BCP 47 tags — our codes are already valid
  return lang;
}

/**
 * Format a number as currency.
 * Defaults to USD. Pass currencyCode to override.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = "USD"
): string {
  try {
    return new Intl.NumberFormat(getIntlLocale(), {
      style: "currency",
      currency: currencyCode,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

/**
 * Format a number with locale-appropriate grouping separators.
 */
export function formatNumber(value: number): string {
  try {
    return new Intl.NumberFormat(getIntlLocale()).format(value);
  } catch {
    return String(value);
  }
}

/**
 * Format a Date as a locale-appropriate short date string.
 */
export function formatDate(date: Date): string {
  try {
    return new Intl.DateTimeFormat(getIntlLocale(), {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}
