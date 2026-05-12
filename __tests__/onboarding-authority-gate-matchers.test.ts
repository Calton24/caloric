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
  isGatedAllowedRoute,
  isIndexRoute,
  isInsideOnboardingFlow,
  isManageAccountRoute,
  isPaywallRoute,
  isPermissionsRoute,
  isProtectedAppRoute,
  isVoluntaryUpgradePaywallPath,
  isWebViewerRoute,
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
      expect(isInsideOnboardingFlow("/(tabs)")).toBe(false);
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

  describe("isPaywallRoute", () => {
    it("matches paywall paths ignoring query strings", () => {
      expect(isPaywallRoute("/paywall")).toBe(true);
      expect(isPaywallRoute("/paywall?mode=upgrade")).toBe(true);
      expect(isPaywallRoute("/paywall?mode=gate")).toBe(true);
      expect(isPaywallRoute("/paywall?mode=gate&x=1")).toBe(true);
      expect(isPaywallRoute("/(onboarding)/paywall")).toBe(true);
      expect(isPaywallRoute("/(onboarding)/paywall?mode=upgrade")).toBe(
        true,
      );
      expect(isPaywallRoute("/onboarding/paywall?mode=gate")).toBe(true);
    });

    it("does not match other routes", () => {
      expect(isPaywallRoute("/goal")).toBe(false);
      expect(isPaywallRoute("/settings")).toBe(false);
    });
  });

  describe("isVoluntaryUpgradePaywallPath", () => {
    it("is true only for paywall with mode=upgrade (global search params)", () => {
      expect(isVoluntaryUpgradePaywallPath("/paywall", "upgrade")).toBe(true);
      expect(
        isVoluntaryUpgradePaywallPath("/paywall", ["upgrade", "gate"]),
      ).toBe(true);
      expect(
        isVoluntaryUpgradePaywallPath("/(onboarding)/paywall", "upgrade"),
      ).toBe(true);
    });

    it("is false for gate or onboarding-default paywall", () => {
      expect(isVoluntaryUpgradePaywallPath("/paywall", "gate")).toBe(false);
      expect(isVoluntaryUpgradePaywallPath("/paywall", undefined)).toBe(false);
    });

    it("is false for non-paywall paths", () => {
      expect(isVoluntaryUpgradePaywallPath("/goal", "upgrade")).toBe(false);
    });
  });

  describe("isWebViewerRoute", () => {
    it("matches both group-prefixed and stripped forms", () => {
      expect(isWebViewerRoute("/(modals)/web-viewer")).toBe(true);
      expect(isWebViewerRoute("/web-viewer")).toBe(true);
      expect(
        isWebViewerRoute("/web-viewer?url=https%3A%2F%2Fa.com&title=t"),
      ).toBe(true);
    });
    it("does not match other modals", () => {
      expect(isWebViewerRoute("/(modals)/camera-log")).toBe(false);
      expect(isWebViewerRoute("/manage-account")).toBe(false);
    });
  });

  describe("isManageAccountRoute", () => {
    it("matches both group-prefixed and stripped forms", () => {
      expect(isManageAccountRoute("/(modals)/manage-account")).toBe(true);
      expect(isManageAccountRoute("/manage-account")).toBe(true);
      expect(isManageAccountRoute("/manage-account?x=1")).toBe(true);
    });
    it("does not match settings or other paths", () => {
      expect(isManageAccountRoute("/(main)/settings")).toBe(false);
      expect(isManageAccountRoute("/settings")).toBe(false);
      expect(isManageAccountRoute("/web-viewer")).toBe(false);
    });
  });

  describe("isGatedAllowedRoute (App-Review safe allowlist)", () => {
    it("allows paywall, web-viewer, manage-account and auth routes", () => {
      expect(isGatedAllowedRoute("/paywall", undefined)).toBe(true);
      expect(isGatedAllowedRoute("/(onboarding)/paywall", "gate")).toBe(true);
      expect(isGatedAllowedRoute("/web-viewer", undefined)).toBe(true);
      expect(isGatedAllowedRoute("/(modals)/web-viewer", undefined)).toBe(true);
      expect(isGatedAllowedRoute("/manage-account", undefined)).toBe(true);
      expect(isGatedAllowedRoute("/(modals)/manage-account", undefined)).toBe(
        true,
      );
      expect(isGatedAllowedRoute("/auth/sign-in", undefined)).toBe(true);
    });

    it("blocks tracking / dashboard / settings / standalone screens", () => {
      expect(isGatedAllowedRoute("/(tabs)", undefined)).toBe(false);
      expect(isGatedAllowedRoute("/(tabs)", undefined)).toBe(false);
      expect(isGatedAllowedRoute("/(modals)/camera-log", undefined)).toBe(
        false,
      );
      expect(isGatedAllowedRoute("/(modals)/manual-log", undefined)).toBe(
        false,
      );
      expect(isGatedAllowedRoute("/(modals)/voice-log", undefined)).toBe(
        false,
      );
      expect(isGatedAllowedRoute("/(modals)/edit-meal", undefined)).toBe(
        false,
      );
      expect(isGatedAllowedRoute("/(modals)/confirm-meal", undefined)).toBe(
        false,
      );
      expect(isGatedAllowedRoute("/(modals)/log-weight", undefined)).toBe(
        false,
      );
      expect(isGatedAllowedRoute("/(modals)/scan-result", undefined)).toBe(
        false,
      );
      expect(isGatedAllowedRoute("/settings", undefined)).toBe(false);
      expect(isGatedAllowedRoute("/(main)/settings", undefined)).toBe(false);
      expect(isGatedAllowedRoute("/(main)/home", undefined)).toBe(false);
      expect(isGatedAllowedRoute("/progress", undefined)).toBe(false);
      expect(isGatedAllowedRoute("/goals", undefined)).toBe(false);
      expect(isGatedAllowedRoute("/log-weight", undefined)).toBe(false);
      expect(isGatedAllowedRoute("/permissions", undefined)).toBe(false);
    });
  });

  describe("isProtectedAppRoute", () => {
    it("classifies tabs and standalone screens as protected", () => {
      expect(isProtectedAppRoute("/(tabs)")).toBe(true);
      expect(isProtectedAppRoute("/(tabs)")).toBe(true);
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
