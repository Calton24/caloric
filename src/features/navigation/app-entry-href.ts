/**
 * Stack href for the `(tabs)` group.
 *
 * The root stack registers this layout as `name="(tabs)"` → navigate with
 * `/(tabs)`, not `/(tabs)/index`. The latter is not a valid href here (typed
 * routes / file layout) and lands on `+not-found`, which retriggers the
 * access gate in a loop.
 *
 * When `pathname` stays `/` while tabs are mounted, use
 * `useSegments()` + `isInTabsGroup` — `pathname` alone is ambiguous with
 * `app/index`.
 *
 * Expo Router groups like `(tabs)` are not extra URL path segments; this is
 * the concrete screen route the stack knows.
 *
 * @see app/_layout.tsx — `<Stack.Screen name="(tabs)" />`
 * @see app/(tabs)/_layout.tsx
 */

export const APP_ENTRY_PATH = "/(tabs)" as const;

/** Used by the gate when recovering from `+not-found` after a bad entry href. */
export const APP_ENTRY_NOT_FOUND_LOOP_MS = 3_000;

export type AppEntryNotFoundGuardResult =
  | { action: "proceed" }
  | { action: "proceed_mark_attempt" }
  | { action: "skip_blocked" }
  | { action: "fatal_config"; payload: Record<string, unknown> };

/**
 * Prevents infinite redirect loops when `APP_ENTRY_PATH` still resolves to
 * `+not-found`. First not-found recovery attempt is allowed; a second within
 * {@link APP_ENTRY_NOT_FOUND_LOOP_MS} triggers a fatal config outcome.
 */
export function evaluateAppEntryNotFoundRedirectGuard(params: {
  isRedirectTabsToAppEntry: boolean;
  isNotFoundRoute: boolean;
  blocked: boolean;
  lastAttemptAt: number | null;
  now: number;
}): AppEntryNotFoundGuardResult {
  if (!params.isRedirectTabsToAppEntry) {
    return { action: "proceed" };
  }
  if (!params.isNotFoundRoute) {
    return { action: "proceed" };
  }
  if (params.blocked) {
    return { action: "skip_blocked" };
  }
  if (
    params.lastAttemptAt !== null &&
    params.now - params.lastAttemptAt < APP_ENTRY_NOT_FOUND_LOOP_MS
  ) {
    return {
      action: "fatal_config",
      payload: {
        message: "APP_ENTRY_PATH resolved to +not-found",
        appEntryPath: APP_ENTRY_PATH,
      },
    };
  }
  return { action: "proceed_mark_attempt" };
}

if (__DEV__) {
  const p = APP_ENTRY_PATH as string;
  if (p === "/(tabs)/index" || p.includes("/(tabs)/")) {
    throw new Error(
      `Invalid APP_ENTRY_PATH "${p}": use stack group href /(tabs), not a nested (tabs)/… segment.`,
    );
  }
  if (p.includes("(") && !p.startsWith("/(")) {
    throw new Error(`Invalid APP_ENTRY_PATH "${p}": malformed group prefix.`);
  }
}
