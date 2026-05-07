import { computeEffectiveOnboardingStatus } from "../src/features/onboarding/compute-effective-onboarding-status";

describe("computeEffectiveOnboardingStatus", () => {
  const baseCtx = {
    userId: "user-1",
    profileUserId: "user-1",
    profileOnboardingCompleted: true,
    rcValidationStatus: "inactive" as const,
    trialBootstrapStatus: "idle" as const,
    trialIsActive: false,
    onboardingWaitExpired: false,
  };

  it("passes through non-loading server status unchanged", () => {
    expect(
      computeEffectiveOnboardingStatus("complete", baseCtx),
    ).toBe("complete");
    expect(
      computeEffectiveOnboardingStatus("incomplete", baseCtx),
    ).toBe("incomplete");
    expect(computeEffectiveOnboardingStatus("error", baseCtx)).toBe("error");
  });

  it("stays loading without local proof", () => {
    expect(
      computeEffectiveOnboardingStatus("loading", {
        ...baseCtx,
        profileOnboardingCompleted: false,
      }),
    ).toBe("loading");
  });

  it("stays loading when profile id does not match userId", () => {
    expect(
      computeEffectiveOnboardingStatus("loading", {
        ...baseCtx,
        profileUserId: "other",
      }),
    ).toBe("loading");
  });

  it("upgrades loading → complete when RC active + local proof", () => {
    expect(
      computeEffectiveOnboardingStatus("loading", {
        ...baseCtx,
        rcValidationStatus: "active",
      }),
    ).toBe("complete");
  });

  it("upgrades loading → complete when trial ready+active + local proof", () => {
    expect(
      computeEffectiveOnboardingStatus("loading", {
        ...baseCtx,
        trialBootstrapStatus: "ready",
        trialIsActive: true,
      }),
    ).toBe("complete");
  });

  it("upgrades loading → complete after wait expired + local proof", () => {
    expect(
      computeEffectiveOnboardingStatus("loading", {
        ...baseCtx,
        onboardingWaitExpired: true,
      }),
    ).toBe("complete");
  });

  it("stays loading when RC inactive, trial not active, wait not expired", () => {
    expect(
      computeEffectiveOnboardingStatus("loading", {
        ...baseCtx,
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "ready",
        trialIsActive: false,
        onboardingWaitExpired: false,
      }),
    ).toBe("loading");
  });
});
