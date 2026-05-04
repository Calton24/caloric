/**
 * Tests for the onboarding step ↔ route mapping.
 *
 * The mapping is the bridge between the SQL CHECK on
 * `user_profiles.onboarding_step` and the Expo Router pathname strings.
 * If they drift apart, the gate resumes the user to a 404 or to the
 * wrong screen. Lock both directions in.
 */
import { isValidOnboardingStep } from "../src/features/onboarding/onboarding-authority";
import {
  STEP_TO_ROUTE,
  pathnameToCheckpointStep,
} from "../src/features/onboarding/onboarding-step-routes";

describe("onboarding step routes", () => {
  describe("STEP_TO_ROUTE", () => {
    it("maps every valid step to a /(onboarding)/<step> route", () => {
      const steps: ReadonlyArray<keyof typeof STEP_TO_ROUTE> = [
        "goal",
        "body",
        "activity",
        "weight-goal",
        "timeframe",
        "calculating",
        "plan",
        "save-progress",
        "paywall",
        "complete",
      ];
      for (const step of steps) {
        expect(STEP_TO_ROUTE[step]).toBe(`/(onboarding)/${step}`);
        expect(isValidOnboardingStep(step)).toBe(true);
      }
    });

    it("does not map names that are not steps (defensive)", () => {
      // Compile-time exhaustiveness already enforces this, but a runtime
      // check guards against future additions slipping in without test
      // coverage.
      const knownSteps = Object.keys(STEP_TO_ROUTE);
      expect(knownSteps).toHaveLength(10);
    });
  });

  describe("pathnameToCheckpointStep", () => {
    it("maps group-prefixed step pathnames to step names", () => {
      expect(pathnameToCheckpointStep("/(onboarding)/goal")).toBe("goal");
      expect(pathnameToCheckpointStep("/(onboarding)/body")).toBe("body");
      expect(pathnameToCheckpointStep("/(onboarding)/activity")).toBe(
        "activity"
      );
      expect(pathnameToCheckpointStep("/(onboarding)/weight-goal")).toBe(
        "weight-goal"
      );
      expect(pathnameToCheckpointStep("/(onboarding)/timeframe")).toBe(
        "timeframe"
      );
      expect(pathnameToCheckpointStep("/(onboarding)/calculating")).toBe(
        "calculating"
      );
      expect(pathnameToCheckpointStep("/(onboarding)/plan")).toBe("plan");
      expect(pathnameToCheckpointStep("/(onboarding)/save-progress")).toBe(
        "save-progress"
      );
      expect(pathnameToCheckpointStep("/(onboarding)/paywall")).toBe("paywall");
    });

    it("maps non-group step pathnames", () => {
      expect(pathnameToCheckpointStep("/onboarding/goal")).toBe("goal");
      expect(pathnameToCheckpointStep("/onboarding/timeframe")).toBe(
        "timeframe"
      );
    });

    it("maps GROUP-STRIPPED bare step pathnames", () => {
      // Expo Router strips group prefixes from usePathname() results; the
      // checkpoint hook must accept the bare form.
      expect(pathnameToCheckpointStep("/goal")).toBe("goal");
      expect(pathnameToCheckpointStep("/body")).toBe("body");
      expect(pathnameToCheckpointStep("/activity")).toBe("activity");
      expect(pathnameToCheckpointStep("/weight-goal")).toBe("weight-goal");
      expect(pathnameToCheckpointStep("/timeframe")).toBe("timeframe");
      expect(pathnameToCheckpointStep("/calculating")).toBe("calculating");
      expect(pathnameToCheckpointStep("/plan")).toBe("plan");
      expect(pathnameToCheckpointStep("/save-progress")).toBe("save-progress");
      expect(pathnameToCheckpointStep("/paywall")).toBe("paywall");
    });

    it("does NOT checkpoint pre-step or terminal screens", () => {
      // Persisting these would create UX bugs: a user who briefly saw
      // landing forever resumes to landing; a checkpoint write at
      // /complete races the completion write.
      expect(pathnameToCheckpointStep("/(onboarding)/landing")).toBeNull();
      expect(pathnameToCheckpointStep("/(onboarding)/welcome")).toBeNull();
      expect(pathnameToCheckpointStep("/(onboarding)/complete")).toBeNull();
      expect(pathnameToCheckpointStep("/landing")).toBeNull();
      expect(pathnameToCheckpointStep("/welcome")).toBeNull();
      expect(pathnameToCheckpointStep("/complete")).toBeNull();
    });

    it("returns null for non-onboarding pathnames", () => {
      expect(pathnameToCheckpointStep("/")).toBeNull();
      expect(pathnameToCheckpointStep("/(tabs)")).toBeNull();
      expect(pathnameToCheckpointStep("/(tabs)/index")).toBeNull();
      expect(pathnameToCheckpointStep("/auth/sign-in")).toBeNull();
      expect(pathnameToCheckpointStep("/settings")).toBeNull();
      expect(pathnameToCheckpointStep("/progress")).toBeNull();
    });
  });

  describe("isValidOnboardingStep", () => {
    it("accepts the canonical step names", () => {
      expect(isValidOnboardingStep("goal")).toBe(true);
      expect(isValidOnboardingStep("body")).toBe(true);
      expect(isValidOnboardingStep("activity")).toBe(true);
      expect(isValidOnboardingStep("weight-goal")).toBe(true);
      expect(isValidOnboardingStep("timeframe")).toBe(true);
      expect(isValidOnboardingStep("calculating")).toBe(true);
      expect(isValidOnboardingStep("plan")).toBe(true);
      expect(isValidOnboardingStep("save-progress")).toBe(true);
      expect(isValidOnboardingStep("paywall")).toBe(true);
      expect(isValidOnboardingStep("complete")).toBe(true);
    });

    it("rejects invalid values", () => {
      expect(isValidOnboardingStep("landing")).toBe(false);
      expect(isValidOnboardingStep("welcome")).toBe(false);
      expect(isValidOnboardingStep("")).toBe(false);
      expect(isValidOnboardingStep(null)).toBe(false);
      expect(isValidOnboardingStep(undefined)).toBe(false);
      expect(isValidOnboardingStep(42)).toBe(false);
      expect(isValidOnboardingStep("/(onboarding)/goal")).toBe(false);
    });
  });
});
