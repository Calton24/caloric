/**
 * Unit tests for challenge-phase.service.ts
 *
 * Pure functions — no mocks needed.
 */

import type {
    PhaseInput,
    TriggerContext,
} from "../src/features/challenge/challenge-monetisation.types";
import {
    buildPaywallContext,
    getMilestoneContent,
    isPaywallPhase,
    phaseToVariant,
    resolvePhase,
    shouldTriggerPaywall,
} from "../src/features/challenge/challenge-phase.service";

// ── Helpers ──────────────────────────────────────────────────

function makeInput(overrides: Partial<PhaseInput> = {}): PhaseInput {
  return {
    challengeDay: 1,
    insightTriggered: false,
    introUsed: false,
    hasPurchased: false,
    milestonesSeen: { day7: false, day14: false, day21: false },
    ...overrides,
  };
}

function makeTriggerCtx(
  overrides: Partial<TriggerContext> = {}
): TriggerContext {
  return {
    phase: "hook",
    currentTime: Date.now(),
    isInCriticalFlow: false,
    ...overrides,
  };
}

// ── resolvePhase() ──────────────────────────────────────────

describe("resolvePhase", () => {
  it("returns IDENTITY when challengeDay >= 21", () => {
    const result = resolvePhase(makeInput({ challengeDay: 21 }));
    expect(result.phase).toBe("identity");
  });

  it("returns IDENTITY at day 25 (terminal)", () => {
    const result = resolvePhase(
      makeInput({ challengeDay: 25, insightTriggered: true })
    );
    expect(result.phase).toBe("identity");
  });

  it("returns HOOK when insightTriggered is false", () => {
    const result = resolvePhase(
      makeInput({ challengeDay: 5, insightTriggered: false })
    );
    expect(result.phase).toBe("hook");
  });

  it("returns FIRST_PAYWALL when insight triggered but intro not used", () => {
    const result = resolvePhase(
      makeInput({
        challengeDay: 4,
        insightTriggered: true,
        introUsed: false,
      })
    );
    expect(result.phase).toBe("first_paywall");
  });

  it("does NOT return FIRST_PAYWALL when introUsed is true", () => {
    const result = resolvePhase(
      makeInput({
        challengeDay: 4,
        insightTriggered: true,
        introUsed: true,
      })
    );
    expect(result.phase).not.toBe("first_paywall");
  });

  it("does NOT return FIRST_PAYWALL when hasPurchased", () => {
    const result = resolvePhase(
      makeInput({
        challengeDay: 4,
        insightTriggered: true,
        introUsed: false,
        hasPurchased: true,
      })
    );
    expect(result.phase).not.toBe("first_paywall");
  });

  it("returns STRUCTURED_PUSH on day 7 when not seen", () => {
    const result = resolvePhase(
      makeInput({
        challengeDay: 7,
        insightTriggered: true,
        introUsed: true,
      })
    );
    expect(result.phase).toBe("structured_push");
    expect(result.milestoneDay).toBe(7);
  });

  it("returns STRUCTURED_PUSH on day 14 when not seen", () => {
    const result = resolvePhase(
      makeInput({
        challengeDay: 14,
        insightTriggered: true,
        introUsed: true,
      })
    );
    expect(result.phase).toBe("structured_push");
    expect(result.milestoneDay).toBe(14);
  });

  it("does NOT return STRUCTURED_PUSH when milestone already seen", () => {
    const result = resolvePhase(
      makeInput({
        challengeDay: 7,
        insightTriggered: true,
        introUsed: true,
        milestonesSeen: { day7: true, day14: false, day21: false },
      })
    );
    expect(result.phase).toBe("value_buffer");
  });

  it("does NOT return STRUCTURED_PUSH when hasPurchased", () => {
    const result = resolvePhase(
      makeInput({
        challengeDay: 7,
        insightTriggered: true,
        introUsed: true,
        hasPurchased: true,
      })
    );
    // Purchased users get value_buffer (passive)
    expect(result.phase).toBe("value_buffer");
  });

  it("returns VALUE_BUFFER for day 4+ unpurchased after intro", () => {
    const result = resolvePhase(
      makeInput({
        challengeDay: 5,
        insightTriggered: true,
        introUsed: true,
      })
    );
    expect(result.phase).toBe("value_buffer");
  });

  it("returns VALUE_BUFFER as fallback for early purchased users", () => {
    const result = resolvePhase(
      makeInput({
        challengeDay: 2,
        insightTriggered: true,
        introUsed: true,
        hasPurchased: true,
      })
    );
    expect(result.phase).toBe("value_buffer");
  });

  it("IDENTITY takes priority over everything", () => {
    const result = resolvePhase(
      makeInput({
        challengeDay: 21,
        insightTriggered: false, // would be hook
      })
    );
    expect(result.phase).toBe("identity");
  });

  it("HOOK takes priority over FIRST_PAYWALL", () => {
    const result = resolvePhase(
      makeInput({
        challengeDay: 3,
        insightTriggered: false,
        introUsed: false,
      })
    );
    expect(result.phase).toBe("hook");
  });

  it("FIRST_PAYWALL takes priority over STRUCTURED_PUSH", () => {
    // Even if it's day 7, if intro hasn't been used, show first_paywall
    const result = resolvePhase(
      makeInput({
        challengeDay: 7,
        insightTriggered: true,
        introUsed: false,
      })
    );
    expect(result.phase).toBe("first_paywall");
  });
});

// ── shouldTriggerPaywall() ──────────────────────────────────

describe("shouldTriggerPaywall", () => {
  it("returns false during critical flow", () => {
    expect(
      shouldTriggerPaywall(
        makeTriggerCtx({ phase: "first_paywall", isInCriticalFlow: true })
      )
    ).toBe(false);
  });

  it("returns false when phase has not changed", () => {
    expect(
      shouldTriggerPaywall(
        makeTriggerCtx({
          phase: "first_paywall",
          lastPhase: "first_paywall",
        })
      )
    ).toBe(false);
  });

  it("returns false within 10-minute cooldown", () => {
    const now = Date.now();
    expect(
      shouldTriggerPaywall(
        makeTriggerCtx({
          phase: "first_paywall",
          lastPhase: "hook",
          lastShownAt: now - 5 * 60 * 1000, // 5 minutes ago
          currentTime: now,
        })
      )
    ).toBe(false);
  });

  it("returns true for FIRST_PAYWALL when conditions met", () => {
    const now = Date.now();
    expect(
      shouldTriggerPaywall(
        makeTriggerCtx({
          phase: "first_paywall",
          lastPhase: "hook",
          lastShownAt: now - 15 * 60 * 1000, // 15 minutes ago
          currentTime: now,
        })
      )
    ).toBe(true);
  });

  it("returns true for STRUCTURED_PUSH when conditions met", () => {
    expect(
      shouldTriggerPaywall(
        makeTriggerCtx({
          phase: "structured_push",
          lastPhase: "value_buffer",
        })
      )
    ).toBe(true);
  });

  it("returns false for VALUE_BUFFER (passive)", () => {
    expect(
      shouldTriggerPaywall(
        makeTriggerCtx({
          phase: "value_buffer",
          lastPhase: "hook",
        })
      )
    ).toBe(false);
  });

  it("returns false for HOOK", () => {
    expect(shouldTriggerPaywall(makeTriggerCtx({ phase: "hook" }))).toBe(false);
  });

  it("returns false for IDENTITY (terminal)", () => {
    expect(
      shouldTriggerPaywall(
        makeTriggerCtx({ phase: "identity", lastPhase: "value_buffer" })
      )
    ).toBe(false);
  });

  it("returns true for first_paywall with no lastPhase (first time)", () => {
    expect(
      shouldTriggerPaywall(makeTriggerCtx({ phase: "first_paywall" }))
    ).toBe(true);
  });

  it("returns true after cooldown expires", () => {
    const now = Date.now();
    expect(
      shouldTriggerPaywall(
        makeTriggerCtx({
          phase: "structured_push",
          lastPhase: "first_paywall",
          lastShownAt: now - 11 * 60 * 1000, // 11 minutes ago
          currentTime: now,
        })
      )
    ).toBe(true);
  });
});

// ── isPaywallPhase() ────────────────────────────────────────

describe("isPaywallPhase", () => {
  it("returns true for first_paywall", () => {
    expect(isPaywallPhase("first_paywall")).toBe(true);
  });

  it("returns true for structured_push", () => {
    expect(isPaywallPhase("structured_push")).toBe(true);
  });

  it("returns false for hook", () => {
    expect(isPaywallPhase("hook")).toBe(false);
  });

  it("returns false for value_buffer", () => {
    expect(isPaywallPhase("value_buffer")).toBe(false);
  });

  it("returns false for identity", () => {
    expect(isPaywallPhase("identity")).toBe(false);
  });
});

// ── phaseToVariant() ────────────────────────────────────────

describe("phaseToVariant", () => {
  it("maps first_paywall to intro", () => {
    expect(phaseToVariant("first_paywall")).toBe("intro");
  });

  it("maps structured_push to milestone", () => {
    expect(phaseToVariant("structured_push")).toBe("milestone");
  });

  it("maps value_buffer to buffer", () => {
    expect(phaseToVariant("value_buffer")).toBe("buffer");
  });

  it("maps hook to buffer", () => {
    expect(phaseToVariant("hook")).toBe("buffer");
  });
});

// ── getMilestoneContent() ───────────────────────────────────

describe("getMilestoneContent", () => {
  it("returns content for day 7", () => {
    const c = getMilestoneContent(7);
    expect(c.headline).toContain("week");
    expect(c.cta).toBeTruthy();
  });

  it("returns content for day 14", () => {
    const c = getMilestoneContent(14);
    expect(c.headline).toContain("Two weeks");
    expect(c.cta).toBeTruthy();
  });

  it("returns content for day 21", () => {
    const c = getMilestoneContent(21);
    expect(c.headline).toContain("21 days");
    expect(c.cta).toBeTruthy();
  });
});

// ── buildPaywallContext() ───────────────────────────────────

describe("buildPaywallContext", () => {
  it("builds intro context for first_paywall", () => {
    const ctx = buildPaywallContext("first_paywall");
    expect(ctx.variant).toBe("intro");
    expect(ctx.showIntroPricing).toBe(true);
    expect(ctx.showAnnualDiscount).toBe(true);
    expect(ctx.headline).toBeTruthy();
    expect(ctx.insightMessage).toBeUndefined();
  });

  it("includes insightMessage in intro when provided", () => {
    const msg =
      "You're 420 calories off your target — this is likely affecting your results.";
    const ctx = buildPaywallContext("first_paywall", undefined, msg);
    expect(ctx.variant).toBe("intro");
    expect(ctx.insightMessage).toBe(msg);
    expect(ctx.headline).toContain("pattern");
    expect(ctx.body).toContain("correct this");
  });

  it("builds milestone context for structured_push", () => {
    const ctx = buildPaywallContext("structured_push", 7);
    expect(ctx.variant).toBe("milestone");
    expect(ctx.milestoneDay).toBe(7);
    expect(ctx.showIntroPricing).toBe(false);
    expect(ctx.insightMessage).toBeUndefined();
  });

  it("builds buffer context for value_buffer", () => {
    const ctx = buildPaywallContext("value_buffer");
    expect(ctx.variant).toBe("buffer");
    expect(ctx.showIntroPricing).toBe(false);
    expect(ctx.showAnnualDiscount).toBe(false);
  });
});
