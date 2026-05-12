/**
 * Centralized subscription billing copy for paywalls.
 *
 * Footer and plan-card lines must match StoreKit/RevenueCat billing periods
 * (weekly vs monthly vs annual) to satisfy App Review.
 */

export type SubscriptionDisplayTier =
  | "weekly"
  | "monthly"
  | "yearly"
  | "other";

/** Subset of RevenueCat / StoreKit product fields we need for display. */
export interface SubscriptionStoreProduct {
  price?: number;
  priceString?: string;
  currencyCode?: string;
}

export interface SubscriptionDisplayTranslate {
  t: (key: string, params?: Record<string, string | number>) => string;
  /** BCP 47-ish tag from i18n, e.g. `en-GB`, `de` */
  locale: string;
}

export interface SubscriptionDisplay {
  /** Full line shown under the purchase CTA */
  footerText: string;
  /** Short caption under yearly headline price on the plan card */
  yearlyPlanCardCaption?: string;
}

/**
 * Hermes / some RN ICU builds ignore `currencyDisplay: "narrowSymbol"` and still
 * format USD as "US$" (e.g. en-GB device + USD storefront). Strip the redundant
 * "US" prefix for in-app marketing copy only — the system purchase sheet stays canonical.
 */
export function normalizeUsdMarketingSymbol(
  formatted: string,
  currencyCode: string,
): string {
  if (currencyCode !== "USD") return formatted;
  return formatted.replace(/US\$/g, "$");
}

/** Plan-card headline price from StoreKit / RevenueCat (strips noisy `US$` when USD). */
export function formatStorefrontPriceLabel(
  product: SubscriptionStoreProduct | null | undefined,
): string {
  if (!product) return "—";
  const code = product.currencyCode ?? "USD";
  const raw = (product.priceString ?? "").trim();
  if (raw.length > 0) return normalizeUsdMarketingSymbol(raw, code);
  if (typeof product.price === "number" && Number.isFinite(product.price)) {
    return String(product.price);
  }
  return "—";
}

export function formatMonthlyBillFromAnnual(
  annualPrice: number,
  currencyCode: string,
  locale: string,
): string {
  const lc = locale.replace("_", "-");
  const monthly = annualPrice / 12;
  let out: string;
  try {
    out = new Intl.NumberFormat(lc, {
      style: "currency",
      currency: currencyCode,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(monthly);
  } catch {
    out = monthly.toFixed(2);
  }
  return normalizeUsdMarketingSymbol(out, currencyCode);
}

/**
 * Returns user-facing billing lines for the selected package tier.
 *
 * @param tier - Derived from RevenueCat package type / identifier (see paywall helpers).
 * @param product - `pkg.product ?? pkg.storeProduct`
 */
export function getSubscriptionDisplay(
  tier: SubscriptionDisplayTier,
  product: SubscriptionStoreProduct | null | undefined,
  options: SubscriptionDisplayTranslate,
): SubscriptionDisplay {
  const { t, locale } = options;
  const currencyCode = product?.currencyCode ?? "USD";
  const priceString = normalizeUsdMarketingSymbol(
    (product?.priceString ?? "").trim(),
    currencyCode,
  );
  const price = product?.price;

  switch (tier) {
    case "weekly":
      return {
        footerText: priceString
          ? t("paywall.billingFooterWeekly", { price: priceString })
          : t("paywall.billingFooterGeneric", { price: "—" }),
      };
    case "monthly":
      return {
        footerText: priceString
          ? t("paywall.billingFooterMonthly", { price: priceString })
          : t("paywall.billingFooterGeneric", { price: "—" }),
      };
    case "yearly": {
      if (typeof price === "number" && price > 0) {
        const equiv = formatMonthlyBillFromAnnual(price, currencyCode, locale);
        return {
          footerText: t("paywall.billingFooterYearlyEquiv", { equiv }),
          yearlyPlanCardCaption: t("paywall.yearlyApproxPerMonth", {
            price: equiv,
          }),
        };
      }
      if (priceString) {
        return {
          footerText: t("paywall.billingFooterYearlySimple", {
            price: priceString,
          }),
        };
      }
      return {
        footerText: t("paywall.billingFooterGeneric", { price: "—" }),
      };
    }
    default:
      return {
        footerText: priceString
          ? t("paywall.billingFooterGeneric", { price: priceString })
          : t("paywall.billingFooterGeneric", { price: "—" }),
      };
  }
}
