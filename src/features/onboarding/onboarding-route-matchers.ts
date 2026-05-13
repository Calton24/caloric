/**
 * Path matchers for OnboardingAuthorityGate.
 *
 * Pure helpers (no React) so the gate logic can be tested in isolation.
 * `isVoluntaryUpgradePaywallPath` imports `parsePaywallRouteMode` from
 * subscription so paywall `mode` stays consistent app-wide.
 */

import { parsePaywallRouteMode } from "../subscription/paywall-mode";

/**
 * Names of every screen file inside `app/(onboarding)/` and
 * `app/onboarding/`. These are the bare-pathname forms that
 * `usePathname()` will produce when the (onboarding) group prefix is
 * stripped. Keep this list authoritative — adding a new onboarding step
 * without listing it here will cause the gate to kick the user back to
 * /goal whenever they reach that step.
 */
export const ONBOARDING_STEP_NAMES: ReadonlySet<string> = new Set<string>([
  "activity",
  "body",
  "calculating",
  "complete",
  "goal",
  "landing",
  "paywall",
  "plan",
  "save-progress",
  "timeframe",
  "weight-goal",
  "welcome",
]);

function firstSegment(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length > 0 ? parts[0] : null;
}

export function isInsideOnboardingFlow(pathname: string): boolean {
  // 1. Group-prefixed forms.
  if (
    pathname === "/(onboarding)" ||
    pathname.startsWith("/(onboarding)/") ||
    pathname === "/onboarding" ||
    pathname.startsWith("/onboarding/")
  ) {
    return true;
  }
  // 2. Group-stripped form: pathname is `/<step>` for one of the known
  //    onboarding steps. We compare against the explicit set so we never
  //    accidentally classify a future top-level standalone screen (e.g.
  //    `/settings`, `/progress`) as an onboarding screen.
  const seg = firstSegment(pathname);
  return seg !== null && ONBOARDING_STEP_NAMES.has(seg);
}

export function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith("/auth/") || pathname === "/auth";
}

export function isPermissionsRoute(pathname: string): boolean {
  return (
    pathname === "/(modals)/permissions-setup" ||
    pathname === "/permissions-setup" ||
    pathname === "/permissions"
  );
}

export function isIndexRoute(pathname: string): boolean {
  // expo-router returns "" for the root index in some configurations.
  return pathname === "/" || pathname === "";
}

/**
 * "Protected app route" = anything that is NOT inside the onboarding
 * flow, NOT auth, NOT permissions setup, and NOT the index. These are
 * the routes that an incomplete or unauthenticated user must NOT be
 * allowed to view, so the gate redirects them away.
 */
/**
 * True when the user is on the subscription paywall screen.
 *
 * We match all Expo Router forms of the path (group-prefixed, bare,
 * and the alternate /onboarding/paywall subtree) so that a
 * complete-but-unpaid user is allowed to stay on the paywall without
 * the gate redirecting them away.
 */
export function isPaywallRoute(pathname: string): boolean {
  // Match all Expo Router path forms. Strip any search-param suffix
  // (e.g. "/paywall?mode=gate") before comparing so the gate correctly
  // identifies the route regardless of the mode param it added.
  const bare = pathname.split("?")[0];
  return (
    bare === "/(onboarding)/paywall" ||
    bare === "/onboarding/paywall" ||
    bare === "/paywall"
  );
}

/**
 * Settings / drawer "Upgrade to Pro" — same physical route as onboarding paywall
 * but must not be treated like the subscription gate when the user has an
 * active free challenge (gate bounces them off `/paywall`; voluntary upgrade
 * must stay).
 */
export function isVoluntaryUpgradePaywallPath(
  pathname: string,
  rawMode: string | string[] | undefined,
): boolean {
  if (!isPaywallRoute(pathname)) return false;
  return parsePaywallRouteMode(rawMode) === "upgrade";
}

/**
 * Web viewer modal — used for in-app rendering of Privacy Policy / Terms.
 * Always allowed under the hard gate so users can read legal pages.
 */
export function isWebViewerRoute(pathname: string): boolean {
  const bare = pathname.split("?")[0];
  return bare === "/(modals)/web-viewer" || bare === "/web-viewer";
}

/**
 * Locked-account "shell" screen. Holds delete-account, sign-out, and account
 * identity for users gated by the hard paywall — must NOT expose tracking
 * features. Reachable from the gate paywall footer.
 */
export function isManageAccountRoute(pathname: string): boolean {
  const bare = pathname.split("?")[0];
  return (
    bare === "/(modals)/manage-account" ||
    bare === "/manage-account"
  );
}

/** Dedicated delete-account flow (modal screen, not nested RN Modal). */
export function isDeleteAccountRoute(pathname: string): boolean {
  const bare = pathname.split("?")[0];
  return (
    bare === "/(modals)/delete-account" || bare === "/delete-account"
  );
}

/**
 * Routes an EXPIRED-trial / NO-subscription user must always be able to reach
 * for App Review compliance: subscribe, restore, read legal, delete account,
 * sign out. Everything else is hard-locked by the gate.
 */
export function isGatedAllowedRoute(
  pathname: string,
  rawMode: string | string[] | undefined,
): boolean {
  return (
    isPaywallRoute(pathname) ||
    isWebViewerRoute(pathname) ||
    isManageAccountRoute(pathname) ||
    isDeleteAccountRoute(pathname) ||
    isAuthRoute(pathname) ||
    // mode=upgrade explicitly allowed too (already a paywall route, but be
    // defensive against future paywall route renames).
    isVoluntaryUpgradePaywallPath(pathname, rawMode)
  );
}

export function isProtectedAppRoute(pathname: string): boolean {
  return (
    !isInsideOnboardingFlow(pathname) &&
    !isAuthRoute(pathname) &&
    !isPermissionsRoute(pathname) &&
    !isIndexRoute(pathname)
  );
}
