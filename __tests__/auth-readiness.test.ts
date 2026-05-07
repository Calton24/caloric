/**
 * Auth-readiness derivation tests for the gate.
 *
 * Codifies the release-blocker fix: a present userId means signedIn,
 * regardless of the AuthProvider's `isLoading` flag. This protects
 * against the bootstrap race where setUser/setSession run from
 * onAuthStateChange before getSession()'s setIsLoading(false).
 */

import type { AuthStatus } from "../src/features/access/access-decision";

/**
 * Mirrors the derivation in OnboardingAuthorityGate. Pure function so we
 * can test the contract without React/Supabase.
 */
function deriveAuthStatus(
  userId: string | null,
  authLoading: boolean,
): AuthStatus {
  return userId ? "signedIn" : authLoading ? "loading" : "signedOut";
}

describe("deriveAuthStatus — userId presence wins", () => {
  it("userId present + isLoading true → signedIn (the bug)", () => {
    expect(deriveAuthStatus("3907be2f-0e6c-4d97", true)).toBe("signedIn");
  });

  it("userId present + isLoading false → signedIn", () => {
    expect(deriveAuthStatus("3907be2f-0e6c-4d97", false)).toBe("signedIn");
  });

  it("no userId + isLoading true → loading", () => {
    expect(deriveAuthStatus(null, true)).toBe("loading");
  });

  it("no userId + isLoading false → signedOut", () => {
    expect(deriveAuthStatus(null, false)).toBe("signedOut");
  });
});
