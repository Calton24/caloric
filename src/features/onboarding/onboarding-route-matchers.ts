/**
 * Path matchers for OnboardingAuthorityGate.
 *
 * Pure, dependency-free functions extracted from the gate so they can be
 * unit-tested without pulling React, Expo Router, or the rest of the
 * gate's runtime context. The path matchers are the locus of the
 * production bugs we keep hitting (group-stripped pathnames, group-
 * prefixed pathnames, the loop-on-Continue regression), so it's
 * important they're testable in isolation.
 *
 * Why we even have these matchers:
 *   Expo Router's `usePathname()` returns paths with route group
 *   segments (the parenthesised parts) sometimes stripped, sometimes
 *   not. So `/(onboarding)/goal` may arrive as `/goal`, `/(tabs)/index`
 *   may arrive as `/`, etc. We match all forms defensively because some
 *   navigation paths and version differences emit the prefixed form and
 *   some emit the stripped form.
 */

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
export function isProtectedAppRoute(pathname: string): boolean {
  return (
    !isInsideOnboardingFlow(pathname) &&
    !isAuthRoute(pathname) &&
    !isPermissionsRoute(pathname) &&
    !isIndexRoute(pathname)
  );
}
