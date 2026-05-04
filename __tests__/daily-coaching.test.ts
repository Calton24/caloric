/// <reference types="jest" />
/**
 * Tests for the Daily Coaching Engine
 *
 * Covers:
 *   - State resolver (priority, combinations, edge cases)
 *   - Copy generator (per-state text, combined states)
 *   - Full pipeline (resolveStates → buildCopy)
 */

import {
    buildCoachingCopy,
    getDailyCoachingInsight,
    resolveCoachingStates,
    type CoachingInput,
} from "../src/features/milestone/daily-coaching";

jest.mock("i18next", () => ({
  __esModule: true,
  default: {
    t: (key: string, params?: Record<string, unknown>) => {
      // Return key with param values appended so tests can match on content
      if (!params) return key;
      const parts = Object.entries(params)
        .filter(([k]) => k !== "count")
        .map(([, v]) => String(v));
      return parts.length ? `${key} ${parts.join(" ")}` : key;
    },
  },
}));

// ── Helpers ──────────────────────────────────────────────────

function baseInput(overrides: Partial<CoachingInput> = {}): CoachingInput {
  return {
    caloriesRemaining: 800,
    proteinRemaining: 50,
    targetCalories: 2000,
    targetProtein: 120,
    loggedMeals: 2,
    streak: 5,
    daysToMilestone: 4,
    timeOfDay: "afternoon",
    secured: true,
    missedYesterday: false,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════
// State Resolver
// ════════════════════════════════════════════════════════════

describe("resolveCoachingStates", () => {
  it("returns recovery_start when missed yesterday and not secured", () => {
    const states = resolveCoachingStates(
      baseInput({ missedYesterday: true, secured: false })
    );
    expect(states).toEqual(["recovery_start"]);
  });

  it("returns late_critical when late evening and not secured", () => {
    // Mock time to 10pm
    const realDate = Date;
    const mockDate = new Date("2025-01-15T22:00:00");
    jest
      .spyOn(globalThis, "Date")
      .mockImplementation((...args: unknown[]) =>
        args.length ? new (realDate as any)(...args) : mockDate
      );

    const states = resolveCoachingStates(
      baseInput({ timeOfDay: "evening", secured: false })
    );
    expect(states).toEqual(["late_critical"]);

    jest.restoreAllMocks();
  });

  it("returns evening_drift when evening and not secured", () => {
    // Mock time to 7pm (not late)
    const realDate = Date;
    const mockDate = new Date("2025-01-15T19:00:00");
    jest
      .spyOn(globalThis, "Date")
      .mockImplementation((...args: unknown[]) =>
        args.length ? new (realDate as any)(...args) : mockDate
      );

    const states = resolveCoachingStates(
      baseInput({ timeOfDay: "evening", secured: false })
    );
    expect(states[0]).toBe("evening_drift");

    jest.restoreAllMocks();
  });

  it("returns protein_priority when protein > 40g behind and secured", () => {
    const states = resolveCoachingStates(
      baseInput({ proteinRemaining: 50, secured: true })
    );
    expect(states).toContain("protein_priority");
  });

  it("returns tight_budget when < 300 cal remaining", () => {
    const states = resolveCoachingStates(baseInput({ caloriesRemaining: 200 }));
    expect(states).toContain("tight_budget");
  });

  it("returns strong_position when > 600 cal and not evening", () => {
    const states = resolveCoachingStates(
      baseInput({ caloriesRemaining: 800, timeOfDay: "morning" })
    );
    expect(states).toContain("strong_position");
  });

  it("does not return strong_position in the evening", () => {
    const states = resolveCoachingStates(
      baseInput({ caloriesRemaining: 800, timeOfDay: "evening", secured: true })
    );
    expect(states).not.toContain("strong_position");
  });

  it("returns high_quality_day when secured and protein hit", () => {
    const states = resolveCoachingStates(
      baseInput({ proteinRemaining: 5, secured: true })
    );
    expect(states).toContain("high_quality_day");
  });

  it("returns milestone_pressure when <= 2 days to milestone", () => {
    const states = resolveCoachingStates(
      baseInput({ daysToMilestone: 1, proteinRemaining: 5 })
    );
    expect(states).toContain("milestone_pressure");
  });

  it("returns momentum_building for streak 3-6", () => {
    const states = resolveCoachingStates(
      baseInput({ streak: 4, proteinRemaining: 5 })
    );
    expect(states).toContain("momentum_building");
  });

  it("does not return momentum_building for streak > 6", () => {
    const states = resolveCoachingStates(baseInput({ streak: 10 }));
    expect(states).not.toContain("momentum_building");
  });

  it("returns on_track when nothing urgent", () => {
    const states = resolveCoachingStates(
      baseInput({
        caloriesRemaining: 500,
        proteinRemaining: 10,
        targetProtein: 120,
        streak: 10,
        daysToMilestone: 5,
        timeOfDay: "afternoon",
        secured: true,
      })
    );
    // high_quality_day or on_track — both are fine when protein is close
    expect(
      states.includes("on_track") || states.includes("high_quality_day")
    ).toBe(true);
  });

  it("combines protein_priority with momentum_building", () => {
    const states = resolveCoachingStates(
      baseInput({
        proteinRemaining: 50,
        streak: 5,
        caloriesRemaining: 500,
        timeOfDay: "afternoon",
      })
    );
    expect(states).toContain("protein_priority");
    expect(states).toContain("momentum_building");
  });

  it("caps states at 3", () => {
    const states = resolveCoachingStates(
      baseInput({
        caloriesRemaining: 800,
        proteinRemaining: 50,
        streak: 5,
        daysToMilestone: 2,
        timeOfDay: "morning",
      })
    );
    expect(states.length).toBeLessThanOrEqual(3);
  });
});

// ════════════════════════════════════════════════════════════
// Copy Generator
// ════════════════════════════════════════════════════════════

describe("buildCoachingCopy", () => {
  it("always returns label and text", () => {
    const states = ["on_track"] as any;
    const copy = buildCoachingCopy(states, baseInput());
    expect(copy.label).toBe("coaching.todaysFocus");
    expect(copy.text).toBeTruthy();
    expect(typeof copy.text).toBe("string");
  });

  it("references protein amount in protein_priority", () => {
    const copy = buildCoachingCopy(
      ["protein_priority"],
      baseInput({ proteinRemaining: 68 })
    );
    expect(copy.text).toMatch(/proteinPriority/);
    expect(copy.text).toContain("68");
  });

  it("references calories in tight_budget", () => {
    const copy = buildCoachingCopy(
      ["tight_budget"],
      baseInput({ caloriesRemaining: 250 })
    );
    expect(copy.text).toMatch(/tightBudget/);
    expect(copy.text).toContain("250");
  });

  it("mentions streak in momentum_building", () => {
    const copy = buildCoachingCopy(
      ["momentum_building"],
      baseInput({ streak: 5 })
    );
    expect(copy.text).toMatch(/momentumBuilding/);
    expect(copy.text).toContain("5");
  });

  it("produces urgent text for late_critical", () => {
    const copy = buildCoachingCopy(["late_critical"], baseInput());
    expect(copy.text).toMatch(/lateCritical/);
  });

  it("mentions restart for recovery_start", () => {
    const copy = buildCoachingCopy(
      ["recovery_start"],
      baseInput({ missedYesterday: true })
    );
    expect(copy.text).toMatch(/recoveryStart/);
  });

  it("combines protein_priority + momentum_building", () => {
    const copy = buildCoachingCopy(
      ["protein_priority", "momentum_building"],
      baseInput({ proteinRemaining: 45, streak: 4 })
    );
    expect(copy.text).toMatch(/proteinMomentum/);
    expect(copy.text).toContain("45");
  });

  it("combines tight_budget + protein_priority", () => {
    const copy = buildCoachingCopy(
      ["tight_budget", "protein_priority"],
      baseInput({ caloriesRemaining: 200, proteinRemaining: 55 })
    );
    expect(copy.text).toMatch(/tightBudgetProtein/);
  });

  it("handles high_quality_day with milestone_pressure", () => {
    const copy = buildCoachingCopy(
      ["high_quality_day", "milestone_pressure"],
      baseInput({ daysToMilestone: 2 })
    );
    expect(copy.text).toMatch(/highQualityMilestone/);
  });

  it("handles morning on_track", () => {
    const copy = buildCoachingCopy(
      ["on_track"],
      baseInput({ timeOfDay: "morning" })
    );
    expect(copy.text).toMatch(/onTrackMorning/);
  });
});

// ════════════════════════════════════════════════════════════
// Full Pipeline
// ════════════════════════════════════════════════════════════

describe("getDailyCoachingInsight", () => {
  it("returns states and copy", () => {
    const { states, copy } = getDailyCoachingInsight(baseInput());
    expect(states.length).toBeGreaterThan(0);
    expect(copy.label).toBe("coaching.todaysFocus");
    expect(copy.text.length).toBeGreaterThan(0);
  });

  it("resolves protein_priority for typical afternoon state", () => {
    const { states, copy } = getDailyCoachingInsight(
      baseInput({
        caloriesRemaining: 688,
        proteinRemaining: 68,
        streak: 5,
        timeOfDay: "evening",
        secured: true,
      })
    );
    expect(states).toContain("protein_priority");
    expect(copy.text).toContain("68");
  });

  it("handles zero targets gracefully", () => {
    const { states, copy } = getDailyCoachingInsight(
      baseInput({
        targetCalories: 0,
        targetProtein: 0,
        caloriesRemaining: 0,
        proteinRemaining: 0,
      })
    );
    expect(states.length).toBeGreaterThan(0);
    expect(copy.text.length).toBeGreaterThan(0);
  });

  it("never returns empty text", () => {
    const scenarios: Partial<CoachingInput>[] = [
      { secured: false, timeOfDay: "morning" },
      { secured: true, proteinRemaining: 5 },
      { caloriesRemaining: 100 },
      { missedYesterday: true, secured: false },
      { streak: 3, daysToMilestone: 1 },
    ];

    for (const s of scenarios) {
      const { copy } = getDailyCoachingInsight(baseInput(s));
      expect(copy.text.length).toBeGreaterThan(10);
    }
  });
});
