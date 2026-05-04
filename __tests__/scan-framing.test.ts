/// <reference types="jest" />
/**
 * Tests for resolveScanFraming
 *
 * Covers all 6 states, priority ordering, boundary conditions,
 * and CTA label mapping.
 */

import { resolveScanFraming } from "../src/features/scan-framing/scan-framing.service";
import type { ScanFramingInput } from "../src/features/scan-framing/scan-framing.types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeInput(
  overrides: Partial<ScanFramingInput> = {}
): ScanFramingInput {
  return {
    consumedCalories: 600,
    calorieBudget: 2000,
    mealCalories: 500,
    currentStreak: 0,
    consumedProtein: 80,
    proteinTarget: 150,
    hourOfDay: 14,
    ...overrides,
  };
}

// ─── overshoot_risk ───────────────────────────────────────────────────────────

describe("overshoot_risk", () => {
  it("triggers when meal pushes daily total > 15% over budget", () => {
    // budget 2000, consumed 1800, meal 600 → after = -400 which is < -(2000*0.15=-300)
    const result = resolveScanFraming(
      makeInput({
        consumedCalories: 1800,
        mealCalories: 600,
        calorieBudget: 2000,
      })
    );
    expect(result.state).toBe("overshoot_risk");
    expect(result.tintColor).toBe("error");
    expect(result.cta).toBe("Log anyway");
  });

  it("does NOT trigger when over budget by less than 15%", () => {
    // budget 2000, consumed 1700, meal 400 → after = -100, which is > -(2000*0.15=300)
    const result = resolveScanFraming(
      makeInput({
        consumedCalories: 1700,
        mealCalories: 400,
        calorieBudget: 2000,
      })
    );
    expect(result.state).not.toBe("overshoot_risk");
  });

  it("overshoot_risk has highest priority over streak_saver", () => {
    // streak 5, first meal, late evening, AND overshoot
    const result = resolveScanFraming(
      makeInput({
        consumedCalories: 1800,
        mealCalories: 600,
        calorieBudget: 2000,
        currentStreak: 5,
        hourOfDay: 20,
      })
    );
    expect(result.state).toBe("overshoot_risk");
  });
});

// ─── streak_saver ─────────────────────────────────────────────────────────────

describe("streak_saver", () => {
  it("triggers on active streak, no meals yet, late in the day", () => {
    const result = resolveScanFraming(
      makeInput({
        consumedCalories: 0,
        mealCalories: 400,
        currentStreak: 5,
        hourOfDay: 19,
      })
    );
    expect(result.state).toBe("streak_saver");
    expect(result.tintColor).toBe("warning");
    expect(result.title).toContain("5");
  });

  it("does NOT trigger when streak < 3", () => {
    const result = resolveScanFraming(
      makeInput({
        consumedCalories: 0,
        mealCalories: 400,
        currentStreak: 2,
        hourOfDay: 21,
      })
    );
    expect(result.state).not.toBe("streak_saver");
  });

  it("does NOT trigger before 18:00", () => {
    const result = resolveScanFraming(
      makeInput({
        consumedCalories: 0,
        mealCalories: 400,
        currentStreak: 7,
        hourOfDay: 17,
      })
    );
    expect(result.state).not.toBe("streak_saver");
  });

  it("does NOT trigger if meals already logged today", () => {
    const result = resolveScanFraming(
      makeInput({
        consumedCalories: 500,
        mealCalories: 400,
        currentStreak: 7,
        hourOfDay: 20,
      })
    );
    expect(result.state).not.toBe("streak_saver");
  });
});

// ─── protein_boost ────────────────────────────────────────────────────────────

describe("protein_boost", () => {
  it("triggers when protein ratio < 40% past midday", () => {
    const result = resolveScanFraming(
      makeInput({
        consumedProtein: 30,
        proteinTarget: 150, // ratio = 0.2
        hourOfDay: 13,
      })
    );
    expect(result.state).toBe("protein_boost");
    expect(result.tintColor).toBe("info");
  });

  it("does NOT trigger before 12:00", () => {
    const result = resolveScanFraming(
      makeInput({
        consumedProtein: 10,
        proteinTarget: 150,
        hourOfDay: 11,
      })
    );
    expect(result.state).not.toBe("protein_boost");
  });

  it("does NOT trigger when protein ratio >= 40%", () => {
    const result = resolveScanFraming(
      makeInput({
        consumedProtein: 65, // 65/150 = 0.43
        proteinTarget: 150,
        hourOfDay: 15,
      })
    );
    expect(result.state).not.toBe("protein_boost");
  });
});

// ─── tight_budget ─────────────────────────────────────────────────────────────

describe("tight_budget", () => {
  it("triggers when < 15% budget remaining after meal", () => {
    // budget 2000, consumed 1500, meal 300 → after = 200 = 10% of 2000
    const result = resolveScanFraming(
      makeInput({
        consumedCalories: 1500,
        mealCalories: 300,
        calorieBudget: 2000,
        consumedProtein: 100, // protein ok
        hourOfDay: 14,
      })
    );
    expect(result.state).toBe("tight_budget");
    expect(result.tintColor).toBe("warning");
  });

  it("does NOT trigger when plenty of budget left", () => {
    const result = resolveScanFraming(
      makeInput({
        consumedCalories: 400,
        mealCalories: 400,
        calorieBudget: 2000,
        consumedProtein: 80,
        hourOfDay: 14,
      })
    );
    expect(result.state).not.toBe("tight_budget");
  });
});

// ─── start_strong ─────────────────────────────────────────────────────────────

describe("start_strong", () => {
  it("triggers for first meal in the morning", () => {
    const result = resolveScanFraming(
      makeInput({
        consumedCalories: 0,
        mealCalories: 400,
        currentStreak: 0,
        hourOfDay: 8,
      })
    );
    expect(result.state).toBe("start_strong");
    expect(result.tintColor).toBe("success");
  });

  it("does NOT trigger after 11:00", () => {
    const result = resolveScanFraming(
      makeInput({
        consumedCalories: 0,
        mealCalories: 400,
        currentStreak: 0,
        hourOfDay: 11,
      })
    );
    expect(result.state).not.toBe("start_strong");
  });

  it("does NOT trigger when already logged meals today", () => {
    const result = resolveScanFraming(
      makeInput({
        consumedCalories: 300,
        mealCalories: 400,
        currentStreak: 0,
        hourOfDay: 9,
      })
    );
    expect(result.state).not.toBe("start_strong");
  });
});

// ─── on_track (default) ───────────────────────────────────────────────────────

describe("on_track", () => {
  it("is the default state when no other conditions match", () => {
    const result = resolveScanFraming(
      makeInput({
        consumedCalories: 600,
        mealCalories: 500,
        calorieBudget: 2000,
        currentStreak: 0,
        consumedProtein: 80,
        proteinTarget: 150,
        hourOfDay: 14,
      })
    );
    expect(result.state).toBe("on_track");
    expect(result.tintColor).toBe("primary");
    expect(result.cta).toBe("Log meal");
  });

  it("subtitle reflects remaining calories", () => {
    const result = resolveScanFraming(
      makeInput({
        consumedCalories: 600,
        mealCalories: 400,
        calorieBudget: 2000,
        consumedProtein: 80,
        proteinTarget: 150,
        hourOfDay: 15,
      })
    );
    expect(result.state).toBe("on_track");
    expect(result.subtitle).toContain("1000");
  });
});

// ─── CTA label mapping ────────────────────────────────────────────────────────

describe("CTA labels", () => {
  it("on_track → Log meal", () => {
    const r = resolveScanFraming(makeInput());
    expect(r.cta).toBe("Log meal");
  });

  it("overshoot_risk → Log anyway", () => {
    const r = resolveScanFraming(
      makeInput({ consumedCalories: 1800, mealCalories: 600 })
    );
    expect(r.cta).toBe("Log anyway");
  });

  it("streak_saver → Save my streak", () => {
    const r = resolveScanFraming(
      makeInput({ consumedCalories: 0, currentStreak: 5, hourOfDay: 21 })
    );
    expect(r.cta).toBe("Save my streak");
  });
});
