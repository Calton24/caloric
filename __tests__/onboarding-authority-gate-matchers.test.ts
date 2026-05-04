/**
 * Regression tests for OnboardingAuthorityGate's path matchers.
 *
 * The gate's effect logic is harder to test in isolation (lots of mocked
 * deps), but the path matchers are pure functions and the bug class we
 * keep hitting lives in those matchers. Lock them in here.
 *
 * Why these tests matter:
 *   - Expo Router strips `(onboarding)` group segments from `usePathname()`,
 *     so `/(onboarding)/activity` arrives as `/activity`. If the matcher
 *     fails to recognise that, the gate forces incomplete users back to
 *     /goal whenever they press Continue → infinite loop. Adding a new
 *     onboarding step file MUST be matched by the regex of these tests.
 */
import {
  ONBOARDING_STEP_NAMES,
  isAuthRoute,
  isIndexRoute,
  isInsideOnboardingFlow,
  isPermissionsRoute,
  isProtectedAppRoute,
} from "../src/features/onboarding/onboarding-route-matchers";

describe("OnboardingAuthorityGate: path matchers", () => {
  describe("isInsideOnboardingFlow", () => {
    it("matches group-prefixed onboarding paths", () => {
      expect(isInsideOnboardingFlow("/(onboarding)")).toBe(true);
      expect(isInsideOnboardingFlow("/(onboarding)/goal")).toBe(true);
      expect(isInsideOnboardingFlow("/(onboarding)/activity")).toBe(true);
      expect(isInsideOnboardingFlow("/(onboarding)/landing")).toBe(true);
    });

    it("matches non-group onboarding paths", () => {
      expect(isInsideOnboardingFlow("/onboarding")).toBe(true);
      expect(isInsideOnboardingFlow("/onboarding/goal")).toBe(true);
      expect(isInsideOnboardingFlow("/onboarding/activity")).toBe(true);
    });

    it("matches GROUP-STRIPPED step names (the loop bug fix)", () => {
      // This is the regression: expo-router emits these forms when
      // navigating between onboarding steps within the same group.
      // If the matcher misses them, the gate force-replaces incomplete
      // users back to /goal on every Continue.
      expect(isInsideOnboardingFlow("/goal")).toBe(true);
      expect(isInsideOnboardingFlow("/activity")).toBe(true);
      expect(isInsideOnboardingFlow("/body")).toBe(true);
      expect(isInsideOnboardingFlow("/timeframe")).toBe(true);
      expect(isInsideOnboardingFlow("/weight-goal")).toBe(true);
      expect(isInsideOnboardingFlow("/plan")).toBe(true);
      expect(isInsideOnboardingFlow("/calculating")).toBe(true);
      expect(isInsideOnboardingFlow("/paywall")).toBe(true);
      expect(isInsideOnboardingFlow("/complete")).toBe(true);
      expect(isInsideOnboardingFlow("/landing")).toBe(true);
      expect(isInsideOnboardingFlow("/welcome")).toBe(true);
      expect(isInsideOnboardingFlow("/save-progress")).toBe(true);
    });

    it("does NOT match non-onboarding paths", () => {
      expect(isInsideOnboardingFlow("/")).toBe(false);
      expect(isInsideOnboardingFlow("/(tabs)")).toBe(false);
      expect(isInsideOnboardingFlow("/(tabs)/index")).toBe(false);
      expect(isInsideOnboardingFlow("/auth/sign-in")).toBe(false);
      expect(isInsideOnboardingFlow("/settings")).toBe(false);
      expect(isInsideOnboardingFlow("/progress")).toBe(false);
      expect(isInsideOnboardingFlow("/goals")).toBe(false);
      expect(isInsideOnboardingFlow("/log-weight")).toBe(false);
      expect(isInsideOnboardingFlow("/permissions")).toBe(false);
    });

    it("step set covers every screen file in the onboarding folders", () => {
      // Sanity: the explicit set must include every step we route to in
      // production. If you add a new onboarding step file, add it to
      // ONBOARDING_STEP_NAMES too — this test locks that in.
      const knownSteps = [
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
      ];
      for (const step of knownSteps) {
        expect(ONBOARDING_STEP_NAMES.has(step)).toBe(true);
      }
    });
  });

  describe("isAuthRoute", () => {
    it("matches auth paths", () => {
      expect(isAuthRoute("/auth")).toBe(true);
      expect(isAuthRoute("/auth/sign-in")).toBe(true);
      expect(isAuthRoute("/auth/forgot-password")).toBe(true);
      expect(isAuthRoute("/auth/callback")).toBe(true);
    });
    it("does not match non-auth paths", () => {
      expect(isAuthRoute("/")).toBe(false);
      expect(isAuthRoute("/(onboarding)/goal")).toBe(false);
      expect(isAuthRoute("/authentication-stuff")).toBe(false);
    });
  });

  describe("isPermissionsRoute", () => {
    it("matches all permissions variants", () => {
      expect(isPermissionsRoute("/(modals)/permissions-setup")).toBe(true);
      expect(isPermissionsRoute("/permissions-setup")).toBe(true);
      expect(isPermissionsRoute("/permissions")).toBe(true);
    });
    it("does not match other paths", () => {
      expect(isPermissionsRoute("/")).toBe(false);
      expect(isPermissionsRoute("/(modals)/scan-result")).toBe(false);
    });
  });

  describe("isIndexRoute", () => {
    it("matches root path forms", () => {
      expect(isIndexRoute("/")).toBe(true);
      expect(isIndexRoute("")).toBe(true);
    });
    it("does not match other paths", () => {
      expect(isIndexRoute("/(tabs)")).toBe(false);
      expect(isIndexRoute("/index")).toBe(false);
    });
  });

  describe("isProtectedAppRoute", () => {
    it("classifies tabs and standalone screens as protected", () => {
      expect(isProtectedAppRoute("/(tabs)")).toBe(true);
      expect(isProtectedAppRoute("/(tabs)/index")).toBe(true);
      expect(isProtectedAppRoute("/settings")).toBe(true);
      expect(isProtectedAppRoute("/progress")).toBe(true);
      expect(isProtectedAppRoute("/log-weight")).toBe(true);
    });
    it("does not classify onboarding/auth/permissions/index as protected", () => {
      expect(isProtectedAppRoute("/")).toBe(false);
      expect(isProtectedAppRoute("/(onboarding)/goal")).toBe(false);
      expect(isProtectedAppRoute("/activity")).toBe(false);
      expect(isProtectedAppRoute("/auth/sign-in")).toBe(false);
      expect(isProtectedAppRoute("/permissions")).toBe(false);
    });
  });
});
