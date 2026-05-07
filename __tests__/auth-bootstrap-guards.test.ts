import {
  isAuthBootstrapPending,
  isAuthSignedOutConfirmed,
  shouldSkipSignedOutTeardown,
} from "../src/features/auth/auth-bootstrap-guards";

describe("auth-bootstrap-guards", () => {
  it("isAuthBootstrapPending mirrors authLoading", () => {
    expect(isAuthBootstrapPending(true)).toBe(true);
    expect(isAuthBootstrapPending(false)).toBe(false);
  });

  it("isAuthSignedOutConfirmed only when not loading and no user", () => {
    expect(isAuthSignedOutConfirmed(true, null)).toBe(false);
    expect(isAuthSignedOutConfirmed(true, "u1")).toBe(false);
    expect(isAuthSignedOutConfirmed(false, "u1")).toBe(false);
    expect(isAuthSignedOutConfirmed(false, null)).toBe(true);
    expect(isAuthSignedOutConfirmed(false, undefined)).toBe(true);
  });

  it("shouldSkipSignedOutTeardown during loading or when userId present", () => {
    expect(shouldSkipSignedOutTeardown(true, null)).toBe(true);
    expect(shouldSkipSignedOutTeardown(false, "u1")).toBe(true);
    expect(shouldSkipSignedOutTeardown(false, null)).toBe(false);
  });
});
