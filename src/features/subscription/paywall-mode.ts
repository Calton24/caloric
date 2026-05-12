/**
 * Paywall route `mode` query param (Expo Router / onboarding paywall).
 *
 * - onboarding: first-run paywall (default when param omitted)
 * - gate: hard subscription gate (mode=gate)
 * - upgrade: settings / in-app upgrade (mode=upgrade)
 */

export type PaywallRouteMode = "onboarding" | "gate" | "upgrade";

/**
 * In-app upgrade paywall — search param must be in the URL string so Expo Router
 * reliably applies `mode=upgrade` (static route; object `params` alone is not
 * always equivalent to `?mode=upgrade` across versions).
 */
export const PAYWALL_UPGRADE_HREF =
  "/(onboarding)/paywall?mode=upgrade" as const;

export function parsePaywallRouteMode(
  mode: string | string[] | undefined,
): PaywallRouteMode {
  const raw = Array.isArray(mode) ? mode[0] : mode;
  if (raw === "gate") return "gate";
  if (raw === "upgrade") return "upgrade";
  return "onboarding";
}

/** Free-challenge UI must not appear in gate or upgrade contexts. */
export function paywallHidesFreeChallengePath(mode: PaywallRouteMode): boolean {
  return mode === "gate" || mode === "upgrade";
}
