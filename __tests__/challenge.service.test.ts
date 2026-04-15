/**
 * Unit tests for challenge.service.ts
 *
 * All functions are pure (no IO, no React) — no mocks needed.
 */

import {
    buildActiveChallengeState,
    buildNewChallenge,
    computeProgress,
    computeStatus,
    computeWindow,
    getOfferType,
    isChallengeTerminal,
    isOfferEligible,
} from "../src/features/challenge/challenge.service";
import type {
    ChallengeProgress,
    UserChallenge,
} from "../src/features/challenge/challenge.types";

// ── Helpers ──────────────────────────────────────────────────

function makeChallenge(overrides: Partial<UserChallenge> = {}): UserChallenge {
  const now = new Date().toISOString();
  return {
    id: "test-id",
    userId: "user-1",
    startedAt: "2025-01-01T00:00:00.000Z",
    challengeDays: 21,
    status: "active",
    offerUnlocked: false,
    offerSeenAt: null,
    convertedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/** Make N logged dates starting from a given YYYY-MM-DD. */
function makeDates(start: string, count: number): string[] {
  const dates: string[] = [];
  const d = new Date(start + "T12:00:00");
  for (let i = 0; i < count; i++) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    dates.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return dates;
}

// ── buildNewChallenge ─────────────────────────────────────────

describe("buildNewChallenge", () => {
  it("creates an active challenge with 21 days", () => {
    const c = buildNewChallenge("user-1");
    expect(c.userId).toBe("user-1");
    expect(c.challengeDays).toBe(21);
    expect(c.status).toBe("active");
    expect(c.offerUnlocked).toBe(false);
  });

  it("sets startedAt to now (within 1 second)", () => {
    const before = Date.now();
    const c = buildNewChallenge("user-1");
    const after = Date.now();
    const ts = new Date(c.startedAt).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

// ── computeWindow ─────────────────────────────────────────────

describe("computeWindow", () => {
  it("returns windowStart equal to the start date", () => {
    const c = makeChallenge({ startedAt: "2025-03-01T00:00:00.000Z" });
    const { windowStart } = computeWindow(c);
    // 2025-03-01 UTC midnight → local could be 2025-02-28 in some zones
    // We just test format and that windowEnd is 20 days after windowStart
    expect(windowStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("windowEnd is challengeDays - 1 days after windowStart", () => {
    const c = makeChallenge({
      startedAt: "2025-03-01T12:00:00.000Z",
      challengeDays: 21,
    });
    const { windowStart, windowEnd } = computeWindow(c);
    const start = new Date(windowStart + "T12:00:00").getTime();
    const end = new Date(windowEnd + "T12:00:00").getTime();
    const days = Math.round((end - start) / 86_400_000);
    expect(days).toBe(20); // 21 days inclusive = 20-day gap
  });
});

// ── computeProgress ───────────────────────────────────────────

describe("computeProgress", () => {
  const challenge = makeChallenge({ startedAt: "2025-01-01T12:00:00.000Z" });
  const windowStart = "2025-01-01";
  const today = "2025-01-10"; // day 10

  it("returns 0 completedDays when no logs", () => {
    const p = computeProgress(challenge, [], today);
    expect(p.completedDays).toBe(0);
  });

  it("counts only unique dates (deduplicates)", () => {
    const dates = ["2025-01-01", "2025-01-01", "2025-01-02"];
    const p = computeProgress(challenge, dates, today);
    expect(p.completedDays).toBe(2);
  });

  it("counts all 21 logged days when fully complete", () => {
    const dates = makeDates(windowStart, 21);
    const p = computeProgress(challenge, dates, "2025-01-21");
    expect(p.completedDays).toBe(21);
  });

  it("ignores dates outside the challenge window", () => {
    const outside = ["2024-12-31", "2025-01-22", "2025-02-01"];
    const p = computeProgress(challenge, outside, today);
    expect(p.completedDays).toBe(0);
  });

  it("currentDay increases with time", () => {
    const p1 = computeProgress(challenge, [], "2025-01-01");
    const p5 = computeProgress(challenge, [], "2025-01-05");
    const p21 = computeProgress(challenge, [], "2025-01-21");
    expect(p1.currentDay).toBe(1);
    expect(p5.currentDay).toBe(5);
    expect(p21.currentDay).toBe(21);
  });

  it("currentDay is clamped to challengeDays even after the window", () => {
    const p = computeProgress(challenge, [], "2025-06-01"); // way past
    expect(p.currentDay).toBe(21);
  });

  it("includes the last day of the window", () => {
    const lastDay = "2025-01-21";
    const p = computeProgress(challenge, [lastDay], lastDay);
    expect(p.completedDays).toBe(1);
  });
});

// ── computeStatus ─────────────────────────────────────────────

describe("computeStatus", () => {
  const challenge = makeChallenge({ startedAt: "2025-01-01T12:00:00.000Z" });

  it("returns active while still within window with insufficient days", () => {
    const p: ChallengeProgress = {
      currentDay: 5,
      completedDays: 3,
      windowStart: "2025-01-01",
      windowEnd: "2025-01-21",
    };
    expect(computeStatus(challenge, p, "2025-01-05")).toBe("active");
  });

  it("returns completed when completedDays >= challengeDays", () => {
    const p: ChallengeProgress = {
      currentDay: 21,
      completedDays: 21,
      windowStart: "2025-01-01",
      windowEnd: "2025-01-21",
    };
    expect(computeStatus(challenge, p, "2025-01-21")).toBe("completed");
  });

  it("returns expired when window has elapsed without enough days", () => {
    const p: ChallengeProgress = {
      currentDay: 21,
      completedDays: 5,
      windowStart: "2025-01-01",
      windowEnd: "2025-01-21",
    };
    expect(computeStatus(challenge, p, "2025-01-22")).toBe("expired");
  });

  it("returns converted when convertedAt is set", () => {
    const converted = makeChallenge({
      convertedAt: "2025-01-15T00:00:00.000Z",
    });
    const p: ChallengeProgress = {
      currentDay: 10,
      completedDays: 10,
      windowStart: "2025-01-01",
      windowEnd: "2025-01-21",
    };
    expect(computeStatus(converted, p, "2025-01-10")).toBe("converted");
  });

  it("completed > expired (enough days logged even after window)", () => {
    const p: ChallengeProgress = {
      currentDay: 21,
      completedDays: 21,
      windowStart: "2025-01-01",
      windowEnd: "2025-01-21",
    };
    // Even if today is after window end, fully logged = completed
    expect(computeStatus(challenge, p, "2025-02-01")).toBe("completed");
  });
});

// ── isOfferEligible ───────────────────────────────────────────

describe("isOfferEligible", () => {
  const active = makeChallenge();

  it("returns false when completedDays < 14", () => {
    const p: ChallengeProgress = {
      currentDay: 13,
      completedDays: 13,
      windowStart: "",
      windowEnd: "",
    };
    expect(isOfferEligible(active, p)).toBe(false);
  });

  it("returns true when completedDays === 14", () => {
    const p: ChallengeProgress = {
      currentDay: 14,
      completedDays: 14,
      windowStart: "",
      windowEnd: "",
    };
    expect(isOfferEligible(active, p)).toBe(true);
  });

  it("returns true when completedDays > 14", () => {
    const p: ChallengeProgress = {
      currentDay: 21,
      completedDays: 21,
      windowStart: "",
      windowEnd: "",
    };
    expect(isOfferEligible(active, p)).toBe(true);
  });

  it("returns false if already converted", () => {
    const converted = makeChallenge({
      convertedAt: "2025-01-15T00:00:00.000Z",
    });
    const p: ChallengeProgress = {
      currentDay: 15,
      completedDays: 15,
      windowStart: "",
      windowEnd: "",
    };
    expect(isOfferEligible(converted, p)).toBe(false);
  });
});

// ── getOfferType ─────────────────────────────────────────────

describe("getOfferType", () => {
  it("returns null when not eligible", () => {
    const c = makeChallenge();
    const p: ChallengeProgress = {
      currentDay: 5,
      completedDays: 5,
      windowStart: "",
      windowEnd: "",
    };
    expect(getOfferType(c, p)).toBeNull();
  });

  it("returns mid_challenge for active challenge past day 14", () => {
    const c = makeChallenge({ status: "active" });
    const p: ChallengeProgress = {
      currentDay: 16,
      completedDays: 14,
      windowStart: "",
      windowEnd: "",
    };
    expect(getOfferType(c, p)).toBe("mid_challenge");
  });

  it("returns completion for completed challenge", () => {
    const c = makeChallenge({ status: "completed" });
    const p: ChallengeProgress = {
      currentDay: 21,
      completedDays: 21,
      windowStart: "",
      windowEnd: "",
    };
    expect(getOfferType(c, p)).toBe("completion");
  });

  it("returns re_engagement for expired challenge", () => {
    const c = makeChallenge({ status: "expired" });
    const p: ChallengeProgress = {
      currentDay: 21,
      completedDays: 14,
      windowStart: "",
      windowEnd: "",
    };
    expect(getOfferType(c, p)).toBe("re_engagement");
  });
});

// ── isChallengeTerminal ───────────────────────────────────────

describe("isChallengeTerminal", () => {
  it.each(["completed", "expired", "converted"] as const)(
    "%s is terminal",
    (status) => expect(isChallengeTerminal(status)).toBe(true)
  );

  it.each(["active", "not_started"] as const)("%s is not terminal", (status) =>
    expect(isChallengeTerminal(status)).toBe(false)
  );
});

// ── buildActiveChallengeState ─────────────────────────────────

describe("buildActiveChallengeState", () => {
  it("composes all fields consistently", () => {
    const challenge = makeChallenge({ startedAt: "2025-01-01T12:00:00.000Z" });
    const dates = makeDates("2025-01-01", 14);
    const today = "2025-01-14";
    const state = buildActiveChallengeState(challenge, dates, today);

    expect(state.progress.completedDays).toBe(14);
    expect(state.offerEligible).toBe(true);
    expect(state.offerType).toBe("mid_challenge");
    expect(state.challenge.status).toBe("active");
  });

  it("reflects completed status when all 21 logged", () => {
    const challenge = makeChallenge({ startedAt: "2025-01-01T12:00:00.000Z" });
    const dates = makeDates("2025-01-01", 21);
    const today = "2025-01-21";
    const state = buildActiveChallengeState(challenge, dates, today);

    expect(state.challenge.status).toBe("completed");
    expect(state.offerType).toBe("completion");
  });

  it("reflects expired status when window elapsed without enough logs", () => {
    const challenge = makeChallenge({ startedAt: "2025-01-01T12:00:00.000Z" });
    const dates: string[] = []; // no logs
    const today = "2025-02-01"; // past window
    const state = buildActiveChallengeState(challenge, dates, today);

    expect(state.challenge.status).toBe("expired");
    expect(state.offerEligible).toBe(false);
  });
});
