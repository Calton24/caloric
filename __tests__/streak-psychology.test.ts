/**
 * Tests for streak psychology service
 */

import {
    getNextMilestone,
    getProgressionMessage,
    getStreakLabel,
    getStreakUrgency,
    isStreakAtRisk,
    shouldActivateFreeze,
} from "../src/features/streak/streak-psychology.service";

// ── getStreakLabel ────────────────────────────────────────────

describe("getStreakLabel", () => {
  it("returns null for streak < 3", () => {
    expect(getStreakLabel(0)).toBeNull();
    expect(getStreakLabel(1)).toBeNull();
    expect(getStreakLabel(2)).toBeNull();
  });

  it("returns 'Getting consistent' at day 3", () => {
    const label = getStreakLabel(3);
    expect(label).not.toBeNull();
    expect(label!.label).toBe("Getting consistent");
    expect(label!.tier).toBe("starter");
  });

  it("returns 'On a streak' at day 7", () => {
    const label = getStreakLabel(7);
    expect(label!.label).toBe("On a streak");
    expect(label!.emoji).toBe("🔥");
  });

  it("returns 'Disciplined' at day 14", () => {
    expect(getStreakLabel(14)!.label).toBe("Disciplined");
    expect(getStreakLabel(14)!.tier).toBe("strong");
  });

  it("returns 'Challenge completed' at day 21+", () => {
    expect(getStreakLabel(21)!.label).toBe("Challenge completed");
    expect(getStreakLabel(100)!.label).toBe("Challenge completed");
  });

  it("picks highest matching tier for in-between values", () => {
    expect(getStreakLabel(5)!.label).toBe("Getting consistent");
    expect(getStreakLabel(10)!.label).toBe("On a streak");
    expect(getStreakLabel(18)!.label).toBe("Disciplined");
  });
});

// ── getProgressionMessage ────────────────────────────────────

describe("getProgressionMessage", () => {
  it("returns null for streak 0", () => {
    expect(getProgressionMessage(0)).toBeNull();
  });

  it("returns a message for streaks >= 1", () => {
    expect(getProgressionMessage(1)).toBeTruthy();
    expect(getProgressionMessage(7)).toContain("week");
    expect(getProgressionMessage(21)).toContain("habit");
  });
});

// ── isStreakAtRisk ────────────────────────────────────────────

describe("isStreakAtRisk", () => {
  it("returns false when streak is 0", () => {
    expect(isStreakAtRisk(null, 0)).toBe(false);
  });

  it("returns false when already logged today", () => {
    const now = new Date("2025-01-15T20:00:00");
    expect(isStreakAtRisk("2025-01-15", 5, now)).toBe(false);
  });

  it("returns false before 6pm even if not logged", () => {
    const now = new Date("2025-01-15T14:00:00");
    expect(isStreakAtRisk("2025-01-14", 5, now)).toBe(false);
  });

  it("returns true after 6pm if not logged today", () => {
    const now = new Date("2025-01-15T18:30:00");
    expect(isStreakAtRisk("2025-01-14", 5, now)).toBe(true);
  });
});

// ── getStreakUrgency ─────────────────────────────────────────

describe("getStreakUrgency", () => {
  it("returns null when not at risk", () => {
    const now = new Date("2025-01-15T14:00:00");
    expect(getStreakUrgency("2025-01-14", 5, now)).toBeNull();
  });

  it("returns 'warning' between 6-9pm", () => {
    const now = new Date("2025-01-15T19:00:00");
    expect(getStreakUrgency("2025-01-14", 5, now)).toBe("warning");
  });

  it("returns 'critical' at 9pm+", () => {
    const now = new Date("2025-01-15T21:30:00");
    expect(getStreakUrgency("2025-01-14", 5, now)).toBe("critical");
  });
});

// ── shouldActivateFreeze ─────────────────────────────────────

describe("shouldActivateFreeze", () => {
  it("returns false when freeze not available", () => {
    expect(shouldActivateFreeze("2025-01-13", 5, false, "2025-01-15")).toBe(
      false
    );
  });

  it("returns false when streak is 0", () => {
    expect(shouldActivateFreeze("2025-01-13", 0, true, "2025-01-15")).toBe(
      false
    );
  });

  it("returns false when last log was yesterday (streak still valid)", () => {
    expect(shouldActivateFreeze("2025-01-14", 5, true, "2025-01-15")).toBe(
      false
    );
  });

  it("returns true when last log was 2+ days ago and freeze available", () => {
    expect(shouldActivateFreeze("2025-01-13", 5, true, "2025-01-15")).toBe(
      true
    );
  });
});

// ── getNextMilestone ─────────────────────────────────────────

describe("getNextMilestone", () => {
  it("returns day 3 for streak 1", () => {
    const m = getNextMilestone(1);
    expect(m).toEqual({ target: 3, remaining: 2 });
  });

  it("returns day 7 for streak 5", () => {
    const m = getNextMilestone(5);
    expect(m).toEqual({ target: 7, remaining: 2 });
  });

  it("returns day 14 for streak 10", () => {
    const m = getNextMilestone(10);
    expect(m).toEqual({ target: 14, remaining: 4 });
  });

  it("returns null for extremely high streak past all milestones", () => {
    expect(getNextMilestone(500)).toBeNull();
  });
});
