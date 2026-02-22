/**
 * Screen Tracking — Pure helpers
 *
 * Zero-dependency functions for normalising expo-router pathnames and
 * deciding whether a screen event should fire.  Extracted into their own
 * module so they can be unit-tested without pulling in React or expo-router.
 */

/**
 * Normalise an expo-router pathname into a stable, human-readable screen name.
 *
 * Rules:
 *  1. Strip parenthesised route groups: "/(tabs)/home" → "/home"
 *  2. Collapse duplicate slashes
 *  3. Strip trailing slash (keep leading slash for root "/")
 *
 * Returns `null` for empty/undefined input (boot-time).
 */
export function normalisePathname(
  raw: string | undefined | null
): string | null {
  if (!raw || raw.length === 0) return null;

  const cleaned = raw
    .replace(/\([^)]*\)\/?/g, "") // strip (group)/ segments
    .replace(/\/+/g, "/") // collapse duplicate slashes
    .replace(/\/$/, ""); // strip trailing slash

  // After stripping, an empty string means root
  return cleaned.length === 0 ? "/" : cleaned;
}

/**
 * Decide whether a new screen event should fire.
 * Returns `true` only when pathname is non-null and differs from previous.
 */
export function shouldTrackScreen(
  current: string | null,
  previous: string | null
): boolean {
  if (current === null) return false; // still booting
  return current !== previous;
}
