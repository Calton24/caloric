/**
 * Single place to decide when a null `user` means "signed out" vs "auth still bootstrapping".
 *
 * On remount / fast refresh, `AuthProvider` briefly has `{ user: null, isLoading: true }`.
 * Effects that clear Zustand, meal safety, or call RevenueCat `logOut` must NOT run in
 * that window — only after bootstrap resolves with no session.
 */

export function isAuthBootstrapPending(authLoading: boolean): boolean {
  return authLoading;
}

/** `user` is null and auth is not loading — treat as real signed-out. */
export function isAuthSignedOutConfirmed(
  authLoading: boolean,
  userId: string | null | undefined,
): boolean {
  return !authLoading && userId == null;
}

/** Logged-in or still loading — never run signed-out teardown. */
export function shouldSkipSignedOutTeardown(
  authLoading: boolean,
  userId: string | null | undefined,
): boolean {
  return authLoading || userId != null;
}
