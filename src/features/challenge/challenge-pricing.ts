/**
 * Challenge Pricing — dynamic offering resolver.
 *
 * Builds display tiers from real RevenueCat package objects.
 * NO hardcoded prices — every price string comes from the store.
 * Pure functions, no IO.
 */

import {
    resolvePackageByType
} from "../subscription/package-utils";

// ── Offering config ──────────────────────────────────────────────────────

export interface OfferingTier {
  displayId: "intro" | "weekly" | "monthly" | "annual";
  purchaseTarget: "weekly" | "monthly" | "annual";
  price: string;
  label: string;
  period: string;
  highlighted: boolean;
  strikethrough?: string;
  savingsText?: string;
  renewalText?: string;
  subtext?: string;
}

export interface OfferingConfig {
  tiers: OfferingTier[];
  /** Whether to show monthly (never during challenge paywalls) */
  includesMonthly: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Extract the price string from a RevenueCat package's product. */
function getPriceString(pkg: any): string {
  const product = pkg?.product ?? pkg?.storeProduct;
  return product?.priceString ?? String(product?.price ?? "");
}

/** Extract the numeric price from a RevenueCat package's product. */
function getPrice(pkg: any): number | null {
  const product = pkg?.product ?? pkg?.storeProduct;
  const price = product?.price;
  return typeof price === "number" && price > 0 ? price : null;
}

/** Get currency symbol from a RevenueCat product. */
function getCurrencySymbol(pkg: any): string {
  const product = pkg?.product ?? pkg?.storeProduct;
  const code = product?.currencyCode ?? "USD";
  const symbols: Record<string, string> = {
    USD: "$",
    GBP: "£",
    EUR: "€",
    CAD: "CA$",
    AUD: "A$",
  };
  return symbols[code] ?? code + " ";
}

/**
 * Build display tiers from real RevenueCat packages.
 *
 * Only tiers backed by a real package are included. If a package cannot
 * be resolved from the offering-scoped array, that tier is omitted —
 * no hardcoded fallback, no placeholder.
 *
 * Returns null when no tiers could be resolved (caller shows loading state).
 */
export function buildOfferingsFromPackages(
  packages: any[],
  context: {
    isChallengeActive: boolean;
    isIntroEligible: boolean;
  }
): OfferingConfig | null {
  if (!packages || packages.length === 0) return null;

  if (context.isChallengeActive) {
    return buildChallengeTiers(packages, context.isIntroEligible);
  }

  return buildStandardTiers(packages);
}

// ── Challenge tiers ──────────────────────────────────────────────────────

function buildChallengeTiers(
  packages: any[],
  isIntroEligible: boolean
): OfferingConfig | null {
  const tiers: OfferingTier[] = [];

  const weeklyPkg = resolvePackageByType(packages, "weekly");
  const annualPkg = resolvePackageByType(packages, "annual");

  // Intro tier — uses the weekly package with intro pricing
  if (isIntroEligible && weeklyPkg) {
    const product = weeklyPkg.product ?? weeklyPkg.storeProduct;
    const introPrice = product?.introPrice;

    if (introPrice) {
      tiers.push({
        displayId: "intro",
        purchaseTarget: "weekly",
        price: introPrice.priceString ?? String(introPrice.price ?? ""),
        label: "Challenge Entry",
        period: "/week",
        highlighted: true,
        strikethrough: getPriceString(weeklyPkg),
        subtext: "First week only",
        renewalText: `Then ${getPriceString(weeklyPkg)}/week`,
      });
    }
  }

  // Annual tier — challenge-specific annual product
  if (annualPkg) {
    const annualPrice = getPrice(annualPkg);
    const symbol = getCurrencySymbol(annualPkg);

    const tier: OfferingTier = {
      displayId: "annual",
      purchaseTarget: "annual",
      price: getPriceString(annualPkg),
      label: "Complete the Challenge",
      period: "/year",
      highlighted: tiers.length === 0, // hero when no intro tier
    };

    // Compute per-month equivalent
    if (annualPrice) {
      tier.savingsText = `${symbol}${(annualPrice / 12).toFixed(2)}/mo`;
    }

    tiers.push(tier);
  }

  // Weekly tier (standard, non-intro)
  if (weeklyPkg) {
    tiers.push({
      displayId: "weekly",
      purchaseTarget: "weekly",
      price: getPriceString(weeklyPkg),
      label: "Weekly",
      period: "/week",
      highlighted: false,
    });
  }

  if (tiers.length === 0) return null;
  return { tiers, includesMonthly: false };
}

// ── Standard tiers ───────────────────────────────────────────────────────

function buildStandardTiers(packages: any[]): OfferingConfig | null {
  const tiers: OfferingTier[] = [];

  const weeklyPkg = resolvePackageByType(packages, "weekly");
  const monthlyPkg = resolvePackageByType(packages, "monthly");
  const annualPkg = resolvePackageByType(packages, "annual");

  if (weeklyPkg) {
    tiers.push({
      displayId: "weekly",
      purchaseTarget: "weekly",
      price: getPriceString(weeklyPkg),
      label: "Weekly",
      period: "/week",
      highlighted: false,
    });
  }

  if (monthlyPkg) {
    tiers.push({
      displayId: "monthly",
      purchaseTarget: "monthly",
      price: getPriceString(monthlyPkg),
      label: "Monthly",
      period: "/month",
      highlighted: false,
    });
  }

  if (annualPkg) {
    const annualPrice = getPrice(annualPkg);
    const symbol = getCurrencySymbol(annualPkg);

    const tier: OfferingTier = {
      displayId: "annual",
      purchaseTarget: "annual",
      price: getPriceString(annualPkg),
      label: "Yearly",
      period: "/year",
      highlighted: true,
    };

    if (annualPrice) {
      tier.savingsText = `${symbol}${(annualPrice / 12).toFixed(2)}/mo`;
    }

    tiers.push(tier);
  }

  if (tiers.length === 0) return null;
  return { tiers, includesMonthly: !!monthlyPkg };
}
