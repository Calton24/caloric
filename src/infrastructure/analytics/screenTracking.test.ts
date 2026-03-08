/**
 * Screen Tracking — Unit tests
 *
 * Tests the pure logic extracted from useScreenTracking:
 *  - normalisePathname: route group stripping, slash normalisation, boot resilience
 *  - shouldTrackScreen: dedupe logic
 */

import { normalisePathname, shouldTrackScreen } from "./screenTrackingUtils";

describe("normalisePathname", () => {
  it("strips route groups", () => {
    expect(normalisePathname("/(tabs)/home")).toBe("/home");
    expect(normalisePathname("/(tabs)/(drawer)/settings")).toBe("/settings");
  });

  it("handles nested groups with remaining segments", () => {
    expect(normalisePathname("/(tabs)/caloric/primitives")).toBe(
      "/caloric/primitives"
    );
  });

  it("returns '/' for root paths", () => {
    expect(normalisePathname("/")).toBe("/");
    expect(normalisePathname("/(tabs)/")).toBe("/");
    expect(normalisePathname("/(tabs)")).toBe("/");
  });

  it("collapses duplicate slashes", () => {
    expect(normalisePathname("//home///settings")).toBe("/home/settings");
  });

  it("strips trailing slash", () => {
    expect(normalisePathname("/settings/")).toBe("/settings");
  });

  it("passes through clean paths unchanged", () => {
    expect(normalisePathname("/auth/forgot-password")).toBe(
      "/auth/forgot-password"
    );
    expect(normalisePathname("/modal")).toBe("/modal");
  });

  it("returns null for undefined/null/empty (boot time)", () => {
    expect(normalisePathname(undefined)).toBeNull();
    expect(normalisePathname(null)).toBeNull();
    expect(normalisePathname("")).toBeNull();
  });
});

describe("shouldTrackScreen", () => {
  it("returns false when current is null (still booting)", () => {
    expect(shouldTrackScreen(null, null)).toBe(false);
    expect(shouldTrackScreen(null, "/home")).toBe(false);
  });

  it("returns true when screen changes", () => {
    expect(shouldTrackScreen("/home", null)).toBe(true);
    expect(shouldTrackScreen("/settings", "/home")).toBe(true);
  });

  it("returns false for duplicate consecutive screen", () => {
    expect(shouldTrackScreen("/home", "/home")).toBe(false);
  });

  it("returns true when navigating back to a previous screen", () => {
    // home → settings → home should track the return to home
    expect(shouldTrackScreen("/home", "/settings")).toBe(true);
  });
});
