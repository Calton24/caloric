/**
 * Pure helpers for Expo Router `useSegments()` output.
 * Route groups like `(tabs)` appear as segment strings; they may be absent from `pathname`.
 */

export function isInTabsGroup(segments: string[]): boolean {
  return segments.includes("(tabs)");
}

export function isInOnboardingGroup(segments: string[]): boolean {
  return segments.includes("(onboarding)");
}

/** `useSegments()` includes the literal `+not-found` when the route did not resolve. */
export function isNotFoundRoute(segments: string[]): boolean {
  return segments.includes("+not-found");
}

/**
 * `app/index.tsx` bootstrap stub: pathname is `/` or `""` but we are NOT
 * yet inside the `(tabs)` layout, and we did not land on `+not-found`.
 *
 * Expo may report `["index"]` alone at the root before groups mount — treat
 * that as the same stub. Any other segment (e.g. a real screen name) is not
 * the bare root index.
 */
export function isTrueRootIndex(pathname: string, segments: string[]): boolean {
  const bare = pathname.split("?")[0];
  if (bare !== "/" && bare !== "") return false;
  if (isNotFoundRoute(segments)) return false;
  if (isInTabsGroup(segments)) return false;
  if (segments.length === 0) return true;
  return segments.length === 1 && segments[0] === "index";
}

export function buildRouteContext(pathname: string, segments: string[]) {
  const isTabs = isInTabsGroup(segments);
  const notFound = isNotFoundRoute(segments);
  return {
    pathname,
    segments: [...segments],
    isInTabsGroup: isTabs,
    isInOnboardingGroup: isInOnboardingGroup(segments),
    isNotFoundRoute: notFound,
    isTrueRootIndex: isTrueRootIndex(pathname, segments),
  };
}

export type RouteContext = ReturnType<typeof buildRouteContext>;
