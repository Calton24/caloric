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

  it("returns 'Getting consistent' key at day 3", () => {
    const label = getStreakLabel(3);
    expect(label).not.toBeNull();
    expect(label!.labelKey).toBe("streak.labels.gettingConsistent");
    expect(label!.tier).toBe("starter");
  });

  it("returns 'On a streak' key at day 7", () => {
    const label = getStreakLabel(7);
    expect(label!.labelKey).toBe("streak.labels.onAStreak");
    expect(label!.emoji).toBe("🔥");
  });

  it("returns 'Disciplined' key at day 14", () => {
    expect(getStreakLabel(14)!.labelKey).toBe("streak.labels.disciplined");
    expect(getStreakLabel(14)!.tier).toBe("strong");
  });

  it("returns 'Challenge completed' key at day 21", () => {
    expect(getStreakLabel(21)!.labelKey).toBe(
      "streak.labels.challengeCompleted"
    );
  });

  it("returns higher identity tiers past day 21", () => {
    expect(getStreakLabel(30)!.labelKey).toBe("streak.labels.habitLockedIn");
    expect(getStreakLabel(60)!.labelKey).toBe("streak.labels.eliteTracker");
    expect(getStreakLabel(90)!.labelKey).toBe("streak.labels.unstoppable");
    expect(getStreakLabel(100)!.labelKey).toBe("streak.labels.unstoppable");
  });

  it("picks highest matching tier for in-between values", () => {
    expect(getStreakLabel(5)!.labelKey).toBe("streak.labels.gettingConsistent");
    expect(getStreakLabel(10)!.labelKey).toBe("streak.labels.onAStreak");
    expect(getStreakLabel(18)!.labelKey).toBe("streak.labels.disciplined");
  });
});

// ── getProgressionMessage ────────────────────────────────────

describe("getProgressionMessage", () => {
  it("returns null for streak 0", () => {
    expect(getProgressionMessage(0)).toBeNull();
  });

  it("returns a message key for streaks >= 1", () => {
    expect(getProgressionMessage(1)).toBeTruthy();
    expect(getProgressionMessage(7)!.key).toBe("streak.progression.day7");
    expect(getProgressionMessage(21)!.key).toBe("streak.progression.day21");
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
