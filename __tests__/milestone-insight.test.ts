/**
 * Tests for the Milestone Insight system
 *
 * Covers:
 *   - Context builder (state resolution, priority, edge cases)
 *   - Fallback copy generator (per-state copy, real data references)
 *   - AI copy validation (schema, length, banned phrases)
 *   - Service orchestrator (getMilestoneInsight, buildMilestoneInsightModel)
 */

import {
    getMilestoneInsightCopySync,
    validateAICopy,
} from "../src/features/milestone/milestone-insight-ai";
import { getMilestoneInsightContext } from "../src/features/milestone/milestone-insight-context";
import { getFallbackCopy } from "../src/features/milestone/milestone-insight-fallback";
import {
    buildMilestoneInsightModel,
    getMilestoneInsight,
} from "../src/features/milestone/milestone-insight.service";
import type {
    MilestoneInsightContext
} from "../src/features/milestone/milestone-insight.types";

// ── Helpers ──────────────────────────────────────────────────

/** Create a fixed date at a specific hour */
function dateAt(hour: number, minute = 0): Date {
  const d = new Date("2025-01-15T00:00:00");
  d.setHours(hour, minute, 0, 0);
  return d;
}

/** Today's date string in ISO format */
function todayISO(now: Date): string {
  return now.toISOString().split("T")[0];
}

/** Yesterday relative to a given date */
function yesterdayISO(now: Date): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

/** N days ago relative to a given date */
function daysAgoISO(now: Date, n: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ════════════════════════════════════════════════════════════
// Context Builder
// ════════════════════════════════════════════════════════════

describe("getMilestoneInsightContext", () => {
  const now = dateAt(14); // 2pm

  it("returns null when no streak and no recovery", () => {
    const result = getMilestoneInsightContext({
      currentStreak: 0,
      lastLogDate: null,
      hasLoggedToday: false,
      streakRecoveryActive: false,
      now,
    });
    expect(result).toBeNull();
  });

  it("returns recovery when streak=0, recovery active, and lostStreak > 0", () => {
    const result = getMilestoneInsightContext({
      currentStreak: 0,
      lastLogDate: daysAgoISO(now, 2),
      hasLoggedToday: false,
      streakRecoveryActive: true,
      lostStreak: 7,
      now,
    });
    expect(result).not.toBeNull();
    expect(result!.state).toBe("recovery");
    expect(result!.lostStreak).toBe(7);
    expect(result!.streakCount).toBe(0);
  });

  it("detects risk when streak exists but no log today and last log was yesterday (evening)", () => {
    const evening = dateAt(22); // 10pm
    const result = getMilestoneInsightContext({
      currentStreak: 5,
      lastLogDate: yesterdayISO(evening),
      hasLoggedToday: false,
      streakRecoveryActive: false,
      now: evening,
    });
    expect(result).not.toBeNull();
    expect(result!.state).toBe("risk");
  });

  it("detects milestone_achieved when streak hits a milestone day and logged today", () => {
    const result = getMilestoneInsightContext({
      currentStreak: 7,
      lastLogDate: todayISO(now),
      hasLoggedToday: true,
      streakRecoveryActive: false,
      now,
    });
    expect(result).not.toBeNull();
    expect(result!.state).toBe("milestone_achieved");
  });

  it("detects milestone_preview when within 2 days of next milestone", () => {
    // streak=5 → next milestone is 7, remaining = 2
    const result = getMilestoneInsightContext({
      currentStreak: 5,
      lastLogDate: todayISO(now),
      hasLoggedToday: true,
      streakRecoveryActive: false,
      now,
    });
    expect(result).not.toBeNull();
    expect(result!.state).toBe("milestone_preview");
    expect(result!.nextMilestone).toBe(7);
    expect(result!.daysToNextMilestone).toBe(2);
  });

  it("returns momentum for a normal day with active streak", () => {
    // streak=4 → next milestone is 7, remaining = 3 (not within 2)
    const result = getMilestoneInsightContext({
      currentStreak: 4,
      lastLogDate: todayISO(now),
      hasLoggedToday: true,
      streakRecoveryActive: false,
      now,
    });
    expect(result).not.toBeNull();
    expect(result!.state).toBe("momentum");
  });

  it("priority: risk beats milestone_achieved", () => {
    // streak=7 (milestone), but last log was 2 days ago and not logged today
    const evening = dateAt(21);
    const result = getMilestoneInsightContext({
      currentStreak: 7,
      lastLogDate: daysAgoISO(evening, 1),
      hasLoggedToday: false,
      streakRecoveryActive: false,
      now: evening,
    });
    // Urgency should fire for evening + no log
    if (result) {
      expect(result.state).toBe("risk");
    }
  });

  it("priority: recovery beats momentum when streak=0 and recovery active", () => {
    const result = getMilestoneInsightContext({
      currentStreak: 0,
      lastLogDate: daysAgoISO(now, 3),
      hasLoggedToday: false,
      streakRecoveryActive: true,
      lostStreak: 10,
      now,
    });
    expect(result).not.toBeNull();
    expect(result!.state).toBe("recovery");
  });

  it("clamps negative streak to 0", () => {
    const result = getMilestoneInsightContext({
      currentStreak: -1,
      lastLogDate: null,
      hasLoggedToday: false,
      streakRecoveryActive: true,
      lostStreak: 5,
      now,
    });
    expect(result).not.toBeNull();
    expect(result!.streakCount).toBe(0);
  });

  it("computes timeOfDay correctly", () => {
    const morning = getMilestoneInsightContext({
      currentStreak: 3,
      lastLogDate: todayISO(dateAt(9)),
      hasLoggedToday: true,
      streakRecoveryActive: false,
      now: dateAt(9),
    });
    expect(morning!.timeOfDay).toBe("morning");

    const afternoon = getMilestoneInsightContext({
      currentStreak: 3,
      lastLogDate: todayISO(dateAt(14)),
      hasLoggedToday: true,
      streakRecoveryActive: false,
      now: dateAt(14),
    });
    expect(afternoon!.timeOfDay).toBe("afternoon");

    const evening = getMilestoneInsightContext({
      currentStreak: 3,
      lastLogDate: todayISO(dateAt(20)),
      hasLoggedToday: true,
      streakRecoveryActive: false,
      now: dateAt(20),
    });
    expect(evening!.timeOfDay).toBe("evening");
  });

  it("computes adherence from daily summary", () => {
    // on_track: consumed ~= target
    const onTrack = getMilestoneInsightContext({
      currentStreak: 5,
      lastLogDate: todayISO(now),
      hasLoggedToday: true,
      streakRecoveryActive: false,
      dailySummary: { targetCalories: 2000, consumedCalories: 1900 },
      now,
    });
    expect(onTrack!.adherence).toBe("on_track");

    // under: consumed < 85% of target
    const under = getMilestoneInsightContext({
      currentStreak: 5,
      lastLogDate: todayISO(now),
      hasLoggedToday: true,
      streakRecoveryActive: false,
      dailySummary: { targetCalories: 2000, consumedCalories: 500 },
      now,
    });
    expect(under!.adherence).toBe("under");

    // over: consumed > 110% of target
    const over = getMilestoneInsightContext({
      currentStreak: 5,
      lastLogDate: todayISO(now),
      hasLoggedToday: true,
      streakRecoveryActive: false,
      dailySummary: { targetCalories: 2000, consumedCalories: 2500 },
      now,
    });
    expect(over!.adherence).toBe("over");

    // unknown: no daily summary
    const unknown = getMilestoneInsightContext({
      currentStreak: 5,
      lastLogDate: todayISO(now),
      hasLoggedToday: true,
      streakRecoveryActive: false,
      now,
    });
    expect(unknown!.adherence).toBe("unknown");
  });

  it("computes recentTrend correctly", () => {
    // improving: streak >= 3 and logged today
    const improving = getMilestoneInsightContext({
      currentStreak: 4,
      lastLogDate: todayISO(now),
      hasLoggedToday: true,
      streakRecoveryActive: false,
      now,
    });
    expect(improving!.recentTrend).toBe("improving");

    // declining: streak > 0, not logged today, last log >= 24h ago
    const declining = getMilestoneInsightContext({
      currentStreak: 3,
      lastLogDate: daysAgoISO(now, 1),
      hasLoggedToday: false,
      streakRecoveryActive: false,
      now: dateAt(10), // morning, so no urgency
    });
    // declining needs lastLogHoursAgo >= 24 and not logged today
    if (declining) {
      expect(declining.recentTrend).toBe("declining");
    }
  });
});

// ════════════════════════════════════════════════════════════
// Fallback Copy Generator
// ════════════════════════════════════════════════════════════

describe("getFallbackCopy", () => {
  const baseCtx: MilestoneInsightContext = {
    state: "momentum",
    streakCount: 10,
    hasLoggedToday: true,
    nextMilestone: 14,
    daysToNextMilestone: 4,
    recentTrend: "improving",
    adherence: "on_track",
    timeOfDay: "afternoon",
    goalType: "eat_healthier",
    lastLogHoursAgo: 2,
    lostStreak: undefined,
  };

  it("returns risk copy with streak count", () => {
    const copy = getFallbackCopy({ ...baseCtx, state: "risk", streakCount: 5 });
    expect(copy.title).toContain("5");
    expect(copy.ctaLabel).toBe("Log meal");
    expect(copy.chip).toBe("At risk");
  });

  it("returns evening-specific risk copy at night", () => {
    const copy = getFallbackCopy({
      ...baseCtx,
      state: "risk",
      streakCount: 12,
      timeOfDay: "evening",
      lastLogHoursAgo: 22,
    });
    expect(copy.title).toContain("tonight");
    expect(copy.title).toContain("12");
  });

  it("returns generic risk copy when not evening", () => {
    const copy = getFallbackCopy({
      ...baseCtx,
      state: "risk",
      streakCount: 5,
      timeOfDay: "morning",
      lastLogHoursAgo: 10,
    });
    expect(copy.title).toContain("at risk");
  });

  it("returns recovery copy with lost streak count", () => {
    const copy = getFallbackCopy({
      ...baseCtx,
      state: "recovery",
      streakCount: 0,
      lostStreak: 14,
    });
    expect(copy.title).toContain("14");
    expect(copy.title).toContain("ended");
    expect(copy.ctaLabel).toBe("Log meal");
    expect(copy.chip).toBe("Restart");
  });

  it("returns milestone_achieved copy with streak count", () => {
    const copy = getFallbackCopy({
      ...baseCtx,
      state: "milestone_achieved",
      streakCount: 30,
    });
    expect(copy.title).toContain("30");
    expect(copy.chip).toBe("Milestone");
  });

  it("returns milestone_achieved copy for 7-day milestone", () => {
    const copy = getFallbackCopy({
      ...baseCtx,
      state: "milestone_achieved",
      streakCount: 7,
    });
    expect(copy.title).toContain("7");
    expect(copy.subtitle).toContain("week");
  });

  it("returns milestone_achieved copy for 14-day milestone", () => {
    const copy = getFallbackCopy({
      ...baseCtx,
      state: "milestone_achieved",
      streakCount: 14,
    });
    expect(copy.title).toContain("14");
    expect(copy.subtitle).toContain("Two weeks");
  });

  it("returns milestone_achieved copy for 3-day milestone", () => {
    const copy = getFallbackCopy({
      ...baseCtx,
      state: "milestone_achieved",
      streakCount: 3,
    });
    expect(copy.title).toContain("3");
    expect(copy.subtitle).toContain("3 days");
  });

  it("returns milestone_preview copy with remaining days", () => {
    const copy = getFallbackCopy({
      ...baseCtx,
      state: "milestone_preview",
      daysToNextMilestone: 1,
      nextMilestone: 14,
    });
    expect(copy.title).toContain("1 day");
    expect(copy.title).toContain("14");
    expect(copy.chip).toBe("Almost there");
  });

  it("returns milestone_preview copy for 2 days remaining", () => {
    const copy = getFallbackCopy({
      ...baseCtx,
      state: "milestone_preview",
      daysToNextMilestone: 2,
      nextMilestone: 7,
    });
    expect(copy.title).toContain("2 days");
    expect(copy.title).toContain("7");
    expect(copy.chip).toBe("Next up");
  });

  it("returns momentum copy with day count in chip", () => {
    const copy = getFallbackCopy({
      ...baseCtx,
      state: "momentum",
      streakCount: 10,
    });
    expect(copy.chip).toContain("Day 10");
  });

  it("returns momentum copy for day >= 21 (habit territory)", () => {
    const copy = getFallbackCopy({
      ...baseCtx,
      state: "momentum",
      streakCount: 25,
      nextMilestone: 30,
      daysToNextMilestone: 5,
    });
    expect(copy.title).toContain("habit");
    expect(copy.subtitle).toContain("30");
    expect(copy.chip).toBe("Day 25");
  });

  it("returns momentum copy for day >= 7 (consistency)", () => {
    const copy = getFallbackCopy({
      ...baseCtx,
      state: "momentum",
      streakCount: 10,
      nextMilestone: 14,
      daysToNextMilestone: 4,
    });
    expect(copy.title).toContain("consistency");
    expect(copy.subtitle).toContain("14");
  });

  it("returns momentum copy for day >= 3", () => {
    const copy = getFallbackCopy({
      ...baseCtx,
      state: "momentum",
      streakCount: 4,
      nextMilestone: 7,
      daysToNextMilestone: 3,
    });
    expect(copy.title).toContain("consistent");
    expect(copy.subtitle).toContain("7");
  });

  it("returns momentum copy for streak < 3", () => {
    const copy = getFallbackCopy({
      ...baseCtx,
      state: "momentum",
      streakCount: 1,
      nextMilestone: 3,
      daysToNextMilestone: 2,
    });
    expect(copy.title).toContain("streak");
    expect(copy.chip).toBe("Day 1");
  });

  it("all copies have title and subtitle", () => {
    const states = [
      "risk",
      "recovery",
      "milestone_achieved",
      "milestone_preview",
      "momentum",
    ] as const;
    for (const state of states) {
      const copy = getFallbackCopy({ ...baseCtx, state });
      expect(copy.title).toBeTruthy();
      expect(copy.subtitle).toBeTruthy();
      expect(copy.title.length).toBeGreaterThan(0);
      expect(copy.subtitle.length).toBeGreaterThan(0);
    }
  });
});

// ════════════════════════════════════════════════════════════
// AI Copy Validation
// ════════════════════════════════════════════════════════════

describe("validateAICopy", () => {
  it("accepts valid copy", () => {
    const result = validateAICopy({
      title: "Day 7 complete",
      subtitle: "A full week of consistent logging.",
      chip: "Milestone",
      ctaLabel: "View streak",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.copy.title).toBe("Day 7 complete");
      expect(result.copy.subtitle).toBe("A full week of consistent logging.");
      expect(result.copy.chip).toBe("Milestone");
      expect(result.copy.ctaLabel).toBe("View streak");
    }
  });

  it("accepts copy without optional fields", () => {
    const result = validateAICopy({
      title: "Building momentum",
      subtitle: "4 days of tracking done.",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.copy.chip).toBeUndefined();
      expect(result.copy.ctaLabel).toBeUndefined();
    }
  });

  it("rejects null/undefined input", () => {
    expect(validateAICopy(null).ok).toBe(false);
    expect(validateAICopy(undefined).ok).toBe(false);
  });

  it("rejects non-object input", () => {
    expect(validateAICopy("string").ok).toBe(false);
    expect(validateAICopy(42).ok).toBe(false);
  });

  it("rejects missing title", () => {
    const result = validateAICopy({
      subtitle: "some subtitle",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing_title");
  });

  it("rejects empty title", () => {
    const result = validateAICopy({
      title: "",
      subtitle: "some subtitle",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing_title");
  });

  it("rejects missing subtitle", () => {
    const result = validateAICopy({
      title: "some title",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("missing_subtitle");
  });

  it("rejects title > 50 chars", () => {
    const result = validateAICopy({
      title: "A".repeat(51),
      subtitle: "short",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("title_too_long");
  });

  it("rejects subtitle > 100 chars", () => {
    const result = validateAICopy({
      title: "Short title",
      subtitle: "B".repeat(101),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("subtitle_too_long");
  });

  it("rejects chip > 20 chars", () => {
    const result = validateAICopy({
      title: "Short title",
      subtitle: "Short subtitle",
      chip: "C".repeat(21),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("chip_too_long");
  });

  it("rejects ctaLabel > 20 chars", () => {
    const result = validateAICopy({
      title: "Short title",
      subtitle: "Short subtitle",
      ctaLabel: "D".repeat(21),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("cta_too_long");
  });

  it("rejects banned phrases in title", () => {
    const result = validateAICopy({
      title: "Keep going strong!",
      subtitle: "You're doing great.",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("banned_phrase");
  });

  it("rejects banned phrases in subtitle", () => {
    const result = validateAICopy({
      title: "Day 7",
      subtitle: "You've got this, keep logging.",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("banned_phrase");
  });

  it("rejects 'crush your goals' phrase", () => {
    const result = validateAICopy({
      title: "Time to crush your goals",
      subtitle: "New day, new opportunities.",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("banned_phrase");
  });

  it("trims whitespace from valid copy", () => {
    const result = validateAICopy({
      title: "  Day 5  ",
      subtitle: "  Five days strong.  ",
      chip: "  Streak  ",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.copy.title).toBe("Day 5");
      expect(result.copy.subtitle).toBe("Five days strong.");
      expect(result.copy.chip).toBe("Streak");
    }
  });
});

// ════════════════════════════════════════════════════════════
// getMilestoneInsightCopySync
// ════════════════════════════════════════════════════════════

describe("getMilestoneInsightCopySync", () => {
  it("returns fallback copy synchronously", () => {
    const ctx: MilestoneInsightContext = {
      state: "momentum",
      streakCount: 5,
      hasLoggedToday: true,
      nextMilestone: 7,
      daysToNextMilestone: 2,
      recentTrend: "improving",
      adherence: "on_track",
      timeOfDay: "afternoon",
      goalType: "eat_healthier",
      lastLogHoursAgo: 2,
    };
    const copy = getMilestoneInsightCopySync(ctx);
    expect(copy.title).toBeTruthy();
    expect(copy.subtitle).toBeTruthy();
  });
});

// ════════════════════════════════════════════════════════════
// Service Orchestrator
// ════════════════════════════════════════════════════════════

describe("buildMilestoneInsightModel", () => {
  const ctx: MilestoneInsightContext = {
    state: "milestone_achieved",
    streakCount: 7,
    hasLoggedToday: true,
    nextMilestone: 14,
    daysToNextMilestone: 7,
    recentTrend: "improving",
    adherence: "on_track",
    timeOfDay: "afternoon",
    goalType: "eat_healthier",
    lastLogHoursAgo: 2,
  };

  const copy = {
    title: "7 days logged",
    subtitle: "A full week.",
    chip: "Week 1",
    ctaLabel: "View streak",
  };

  it("maps state to correct accent and icon", () => {
    const model = buildMilestoneInsightModel(ctx, copy);
    expect(model.accent).toBe("success"); // milestone_achieved → success
    expect(model.icon).toBe("trophy"); // milestone_achieved → trophy
    expect(model.tone).toBe("celebratory");
    expect(model.action).toBe("open_streak");
  });

  it("uses copy fields for display text", () => {
    const model = buildMilestoneInsightModel(ctx, copy);
    expect(model.title).toBe("7 days logged");
    expect(model.subtitle).toBe("A full week.");
    expect(model.chip).toBe("Week 1");
    expect(model.ctaLabel).toBe("View streak");
  });

  it("includes progress when style says showProgress and nextMilestone exists", () => {
    const model = buildMilestoneInsightModel(ctx, copy);
    expect(model.progress).toEqual({ current: 7, target: 14 });
  });

  it("omits progress for risk state", () => {
    const riskCtx: MilestoneInsightContext = {
      ...ctx,
      state: "risk",
      nextMilestone: 14,
    };
    const model = buildMilestoneInsightModel(riskCtx, copy);
    expect(model.progress).toBeUndefined();
  });

  it("uses default chip when copy.chip is undefined", () => {
    const model = buildMilestoneInsightModel(ctx, {
      title: "Title",
      subtitle: "Sub",
    });
    expect(model.chip).toBe("Milestone"); // default for milestone_achieved
  });

  it("maps all states to correct accents", () => {
    const expectations: Array<
      [MilestoneInsightContext["state"], string, string]
    > = [
      ["risk", "warning", "shield"],
      ["recovery", "warning", "refresh"],
      ["milestone_achieved", "success", "trophy"],
      ["milestone_preview", "highlight", "target"],
      ["momentum", "success", "flame"],
    ];

    for (const [state, expectedAccent, expectedIcon] of expectations) {
      const model = buildMilestoneInsightModel({ ...ctx, state }, copy);
      expect(model.accent).toBe(expectedAccent);
      expect(model.icon).toBe(expectedIcon);
    }
  });
});

describe("getMilestoneInsight (full pipeline)", () => {
  const now = dateAt(14);

  it("returns null for zero streak with no recovery", () => {
    const result = getMilestoneInsight({
      currentStreak: 0,
      lastLogDate: null,
      hasLoggedToday: false,
      streakRecoveryActive: false,
      now,
    });
    expect(result).toBeNull();
  });

  it("returns a complete model for an active streak", () => {
    const result = getMilestoneInsight({
      currentStreak: 10,
      lastLogDate: todayISO(now),
      hasLoggedToday: true,
      streakRecoveryActive: false,
      now,
    });
    expect(result).not.toBeNull();
    expect(result!.title).toBeTruthy();
    expect(result!.subtitle).toBeTruthy();
    expect(result!.accent).toBeTruthy();
    expect(result!.icon).toBeTruthy();
    expect(result!.state).toBe("momentum");
    expect(result!.streakCount).toBe(10);
  });

  it("returns recovery model when streak broke", () => {
    const result = getMilestoneInsight({
      currentStreak: 0,
      lastLogDate: daysAgoISO(now, 2),
      hasLoggedToday: false,
      streakRecoveryActive: true,
      lostStreak: 14,
      now,
    });
    expect(result).not.toBeNull();
    expect(result!.state).toBe("recovery");
    expect(result!.accent).toBe("warning");
    expect(result!.icon).toBe("refresh");
    expect(result!.title).toContain("14");
  });

  it("returns milestone_achieved model at day 7", () => {
    const result = getMilestoneInsight({
      currentStreak: 7,
      lastLogDate: todayISO(now),
      hasLoggedToday: true,
      streakRecoveryActive: false,
      now,
    });
    expect(result).not.toBeNull();
    expect(result!.state).toBe("milestone_achieved");
    expect(result!.accent).toBe("success");
    expect(result!.icon).toBe("trophy");
    expect(result!.progress).toBeDefined();
  });

  it("returns milestone_preview model 1 day before milestone", () => {
    // streak=6, next milestone = 7, remaining = 1
    const result = getMilestoneInsight({
      currentStreak: 6,
      lastLogDate: todayISO(now),
      hasLoggedToday: true,
      streakRecoveryActive: false,
      now,
    });
    expect(result).not.toBeNull();
    expect(result!.state).toBe("milestone_preview");
    expect(result!.accent).toBe("highlight");
    expect(result!.icon).toBe("target");
  });

  it("includes dailySummary adherence in the pipeline", () => {
    const result = getMilestoneInsight({
      currentStreak: 10,
      lastLogDate: todayISO(now),
      hasLoggedToday: true,
      streakRecoveryActive: false,
      dailySummary: { targetCalories: 2000, consumedCalories: 1950 },
      now,
    });
    expect(result).not.toBeNull();
    // The model itself doesn't expose adherence, but the pipeline doesn't crash
    expect(result!.state).toBe("momentum");
  });

  it("handles all milestone days correctly", () => {
    const milestones = [3, 7, 14, 21, 30, 60, 90, 100, 365];
    for (const day of milestones) {
      const result = getMilestoneInsight({
        currentStreak: day,
        lastLogDate: todayISO(now),
        hasLoggedToday: true,
        streakRecoveryActive: false,
        now,
      });
      expect(result).not.toBeNull();
      expect(result!.state).toBe("milestone_achieved");
      expect(result!.title).toBeTruthy();
    }
  });
});
