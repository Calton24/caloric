/**
 * Package utilities — shared identifier helpers for RevenueCat packages.
 *
 * Pure functions, no IO, no offering logic, no pricing formatting.
 * Used by subscription.store, challenge-pricing, and Paywall components.
 */

/** Plan type derived from a product identifier string. */
export type PackageType = "weekly" | "monthly" | "annual" | "unknown";

/**
 * Determine the plan type from a RevenueCat product identifier.
 *
 * Matches against known CalCut product ID patterns:
 *   - calcut_weekly, calcut_monthly, calcut_annual, calcut_annual_challenge
 * Also handles RC package type strings (WEEKLY, MONTHLY, ANNUAL).
 */
export function getPackageType(productId: string | undefined): PackageType {
  if (!productId) return "unknown";
  const id = productId.toLowerCase();
  if (id.includes("weekly") || id === "$rc_weekly") return "weekly";
  if (id.includes("monthly") || id === "$rc_monthly") return "monthly";
  if (id.includes("annual") || id === "$rc_annual") return "annual";
  return "unknown";
}

/**
 * Extract the product identifier from a RevenueCat package object.
 *
 * RC SDK v8+ uses `pkg.product.identifier`, older versions use
 * `pkg.storeProduct.identifier`. This handles both.
 */
export function getProductId(pkg: any): string | undefined {
  return (
    pkg?.product?.identifier ??
    pkg?.storeProduct?.identifier ??
    pkg?.product?.productIdentifier ??
    undefined
  );
}

/**
 * Find a RevenueCat package from an offering-scoped array by plan type.
 *
 * Searches the package list for one whose product identifier matches
 * the requested type. The packages array MUST come from a single
 * offering (challenge or default) — never a merged/flat array.
 *
 * Returns undefined if no matching package is found.
 */
export function resolvePackageByType(
  packages: any[],
  type: "weekly" | "monthly" | "annual"
): any | undefined {
  if (!packages || packages.length === 0) return undefined;

  // First try: match by RC package type identifier
  const rcId =
    type === "weekly"
      ? "$rc_weekly"
      : type === "monthly"
        ? "$rc_monthly"
        : "$rc_annual";

  const byRcId = packages.find((pkg: any) => (pkg.identifier ?? "") === rcId);
  if (byRcId) return byRcId;

  // Second try: match by product identifier pattern
  return packages.find((pkg: any) => {
    const productId = getProductId(pkg);
    return getPackageType(productId) === type;
  });
}
