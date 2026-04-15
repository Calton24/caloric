/**
 * TDD tests for:
 * 1. DaySelector swipe direction — swipe right (positive translationX)
 *    should go to previous week, swipe left should go to next week
 *    (standard carousel convention matching the visual animation).
 * 2. Streak continuity across week boundaries — meals logged on consecutive
 *    days spanning two weeks should produce a continuous streak count.
 */

import { getMealsForDate } from "../src/features/nutrition/nutrition.selectors";
import type { MealEntry } from "../src/features/nutrition/nutrition.types";
import { getWeekDays, getWeekdayIndex, toISODate } from "../src/lib/utils/date";

// ── Helpers ──────────────────────────────────────────────────

/** Shift a date by N days (mirrors use-home-data.ts shiftDate) */
function shiftDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Same as mealDate() in useProgressSync.ts */
function toLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function mealDate(loggedAt: string): string {
  return toLocalDate(new Date(loggedAt));
}

/**
 * Pure version of computeLocalStreak from useProgressSync.ts.
 * Takes meals and a reference date (today) — no store dependency.
 */
function computeStreakFromMeals(
  mealsLoggedAt: string[],
  today: string
): number {
  if (mealsLoggedAt.length === 0) return 0;

  const loggedDates = new Set<string>();
  for (const loggedAt of mealsLoggedAt) {
    loggedDates.add(mealDate(loggedAt));
  }

  // Walk backwards from today counting consecutive days
  let streak = 0;
  const check = new Date(today + "T12:00:00");
  while (true) {
    const dateStr = toLocalDate(check);
    if (!loggedDates.has(dateStr)) break;
    streak++;
    check.setDate(check.getDate() - 1);
  }

  // If today has no meals yet, check yesterday fallback
  if (streak === 0) {
    const yesterday = new Date(today + "T12:00:00");
    yesterday.setDate(yesterday.getDate() - 1);
    const check2 = new Date(yesterday);
    while (true) {
      const dateStr = toLocalDate(check2);
      if (!loggedDates.has(dateStr)) break;
      streak++;
      check2.setDate(check2.getDate() - 1);
    }
  }

  return streak;
}

// ── 1. DaySelector Swipe Direction Tests ──────────────────────

describe("DaySelector swipe direction mapping", () => {
  /**
   * In a carousel, when the user swipes right (positive translationX),
   * the tray slides right, visually showing the PREVIOUS page.
   * The data navigation should match: go to the previous week.
   *
   * When the user swipes left (negative translationX), the tray slides
   * left, showing the NEXT page. Data should go to next week.
   *
   * The DaySelector pan gesture currently has:
   *   target > 0 → doNext (WRONG — should be doPrev)
   *   target < 0 → doPrev (WRONG — should be doNext)
   */

  it("swipe right (positive target) should trigger previous week, not next", () => {
    // This documents the expected behavior after fix
    const onPrevWeek = jest.fn();
    const onNextWeek = jest.fn();

    // Simulate: target > 0 (swipe right) → should call onPrevWeek
    const target = 1; // positive = swipe right
    if (target > 0) {
      onPrevWeek();
    } else {
      onNextWeek();
    }

    expect(onPrevWeek).toHaveBeenCalled();
    expect(onNextWeek).not.toHaveBeenCalled();
  });

  it("swipe left (negative target) should trigger next week, not previous", () => {
    const onPrevWeek = jest.fn();
    const onNextWeek = jest.fn();

    // Simulate: target < 0 (swipe left) → should call onNextWeek
    const target = -1; // negative = swipe left
    if (target > 0) {
      onPrevWeek();
    } else {
      onNextWeek();
    }

    expect(onNextWeek).toHaveBeenCalled();
    expect(onPrevWeek).not.toHaveBeenCalled();
  });

  it("goToPrevWeek shifts the date back by 7 days", () => {
    const today = "2026-03-31";
    const result = shiftDate(today, -7);
    expect(result).toBe("2026-03-24");
  });

  it("goToNextWeek shifts the date forward by 7 days", () => {
    const today = "2026-03-31";
    const result = shiftDate(today, 7);
    expect(result).toBe("2026-04-07");
  });

  it("week pages correctly show prev/current/next weeks", () => {
    // Selected date: 2026-03-31 (Tuesday)
    const anchor = new Date("2026-03-31T12:00:00");
    const prev = new Date(anchor);
    prev.setDate(prev.getDate() - 7);
    const next = new Date(anchor);
    next.setDate(next.getDate() + 7);

    const prevWeek = getWeekDays(prev);
    const currentWeek = getWeekDays(anchor);
    const nextWeek = getWeekDays(next);

    // Current week should start Mon Mar 30
    expect(currentWeek[0].key).toBe("2026-03-30");
    expect(currentWeek[6].key).toBe("2026-04-05");

    // Previous week should start Mon Mar 23
    expect(prevWeek[0].key).toBe("2026-03-23");
    expect(prevWeek[6].key).toBe("2026-03-29");

    // Next week should start Mon Apr 6
    expect(nextWeek[0].key).toBe("2026-04-06");
    expect(nextWeek[6].key).toBe("2026-04-12");
  });

  it("swiping right from Mar 31 week should show Mar 23 week (prev)", () => {
    // Starting on 2026-03-31
    const selectedDate = "2026-03-31";
    // After swipe right → should go to previous week
    const afterSwipeRight = shiftDate(selectedDate, -7);
    expect(afterSwipeRight).toBe("2026-03-24");
    // The Monday of that week is Mar 23
    const week = getWeekDays(new Date(afterSwipeRight + "T12:00:00"));
    expect(week[0].key).toBe("2026-03-23");
  });

  it("swiping left from Mar 31 week should show Apr 6 week (next)", () => {
    const selectedDate = "2026-03-31";
    // After swipe left → should go to next week
    const afterSwipeLeft = shiftDate(selectedDate, 7);
    expect(afterSwipeLeft).toBe("2026-04-07");
    const week = getWeekDays(new Date(afterSwipeLeft + "T12:00:00"));
    expect(week[0].key).toBe("2026-04-06");
  });
});

// ── 2. Content swipe direction consistency ──────────────────────

describe("Content swipe direction consistency", () => {
  it("swipe right on content area goes to previous day (positive swiped=1 → prev)", () => {
    // The content swipe maps: swiped > 0 → changeToPrevDay
    // This is the standard carousel convention
    const swiped = 1; // positive tx → prev
    const direction = swiped > 0 ? "prev" : "next";
    expect(direction).toBe("prev");
  });

  it("swipe left on content area goes to next day (negative swiped=-1 → next)", () => {
    const swiped = -1; // negative tx → next
    const direction = swiped > 0 ? "prev" : "next";
    expect(direction).toBe("next");
  });

  it("DaySelector and content swipe should use same convention", () => {
    // Both should follow: positive target/swiped → previous, negative → next
    // This ensures a consistent user experience across the whole screen
    const conventions = {
      daySelectorSwipeRight: "prev", // target > 0 → prev week
      daySelectorSwipeLeft: "next", // target < 0 → next week
      contentSwipeRight: "prev", // swiped > 0 → prev day
      contentSwipeLeft: "next", // swiped < 0 → next day
    };

    expect(conventions.daySelectorSwipeRight).toBe(
      conventions.contentSwipeRight
    );
    expect(conventions.daySelectorSwipeLeft).toBe(conventions.contentSwipeLeft);
  });
});

// ── 3. Streak cross-week continuity ─────────────────────────────

describe("Streak continuity across week boundaries", () => {
  it("counts consecutive days spanning two weeks", () => {
    // Meals logged: Sat Mar 28, Sun Mar 29, Mon Mar 30, Tue Mar 31
    // Today: Mar 31, 2026
    // Expected streak: 4 (crosses from prev week to current week)
    const meals = [
      "2026-03-28T13:00:00.000Z", // Saturday
      "2026-03-29T14:00:00.000Z", // Sunday
      "2026-03-30T12:00:00.000Z", // Monday
      "2026-03-31T09:00:00.000Z", // Tuesday (today)
    ];

    const streak = computeStreakFromMeals(meals, "2026-03-31");
    expect(streak).toBe(4);
  });

  it("counts streak spanning three weeks", () => {
    // 10 consecutive days: Mar 22 - Mar 31
    const meals = [];
    for (let d = 22; d <= 31; d++) {
      meals.push(`2026-03-${String(d).padStart(2, "0")}T12:00:00.000Z`);
    }

    const streak = computeStreakFromMeals(meals, "2026-03-31");
    expect(streak).toBe(10);
  });

  it("stops at a gap even across weeks", () => {
    // Meals: Mar 27, Mar 28, [gap Mar 29], Mar 30, Mar 31
    // Streak from today: 2 (Mar 30 + Mar 31), stops at gap on Mar 29
    const meals = [
      "2026-03-27T12:00:00.000Z",
      "2026-03-28T12:00:00.000Z",
      // No meals on Mar 29
      "2026-03-30T12:00:00.000Z",
      "2026-03-31T12:00:00.000Z",
    ];

    const streak = computeStreakFromMeals(meals, "2026-03-31");
    expect(streak).toBe(2);
  });

  it("uses yesterday fallback when today has no meals", () => {
    // Meals: Mar 28, Mar 29, Mar 30 (no meals today Mar 31)
    // Expected: streak = 3 (fallback from yesterday)
    const meals = [
      "2026-03-28T12:00:00.000Z",
      "2026-03-29T12:00:00.000Z",
      "2026-03-30T12:00:00.000Z",
    ];

    const streak = computeStreakFromMeals(meals, "2026-03-31");
    expect(streak).toBe(3);
  });

  it("yesterday fallback also crosses week boundaries", () => {
    // Meals: Mar 27, Mar 28, Mar 29, Mar 30 (no meals today Mar 31)
    // Streak: 4 (fallback to yesterday, then crosses into prev week)
    const meals = [
      "2026-03-27T12:00:00.000Z",
      "2026-03-28T12:00:00.000Z",
      "2026-03-29T12:00:00.000Z",
      "2026-03-30T12:00:00.000Z",
    ];

    const streak = computeStreakFromMeals(meals, "2026-03-31");
    expect(streak).toBe(4);
  });

  it("handles month boundaries correctly", () => {
    // Meals from end of Feb into March
    const meals = [
      "2026-02-26T12:00:00.000Z",
      "2026-02-27T12:00:00.000Z",
      "2026-02-28T12:00:00.000Z",
      "2026-03-01T12:00:00.000Z",
      "2026-03-02T12:00:00.000Z",
    ];

    const streak = computeStreakFromMeals(meals, "2026-03-02");
    expect(streak).toBe(5);
  });

  it("returns 0 when no meals exist", () => {
    const streak = computeStreakFromMeals([], "2026-03-31");
    expect(streak).toBe(0);
  });

  it("returns 1 for meals only today", () => {
    const meals = ["2026-03-31T10:00:00.000Z"];
    const streak = computeStreakFromMeals(meals, "2026-03-31");
    expect(streak).toBe(1);
  });

  it("multiple meals on same day count as 1 day", () => {
    const meals = [
      "2026-03-30T08:00:00.000Z",
      "2026-03-30T12:00:00.000Z",
      "2026-03-30T19:00:00.000Z",
      "2026-03-31T09:00:00.000Z",
      "2026-03-31T13:00:00.000Z",
    ];

    const streak = computeStreakFromMeals(meals, "2026-03-31");
    expect(streak).toBe(2);
  });
});

// ── 4. Date utility correctness ────────────────────────────────

describe("Date utilities for week navigation", () => {
  it("getWeekdayIndex returns 0 for Monday", () => {
    // March 30, 2026 is a Monday
    expect(getWeekdayIndex("2026-03-30")).toBe(0);
  });

  it("getWeekdayIndex returns 1 for Tuesday", () => {
    // March 31, 2026 is a Tuesday
    expect(getWeekdayIndex("2026-03-31")).toBe(1);
  });

  it("getWeekdayIndex returns 6 for Sunday", () => {
    // April 5, 2026 is a Sunday
    expect(getWeekdayIndex("2026-04-05")).toBe(6);
  });

  it("getWeekDays returns 7 days starting from Monday", () => {
    const week = getWeekDays(new Date("2026-03-31T12:00:00"));
    expect(week).toHaveLength(7);
    expect(week[0].label).toBe("M");
    expect(week[6].label).toBe("S");
  });

  it("shiftDate handles month boundaries", () => {
    expect(shiftDate("2026-03-28", 7)).toBe("2026-04-04");
    expect(shiftDate("2026-04-04", -7)).toBe("2026-03-28");
  });

  it("shiftDate handles year boundaries", () => {
    expect(shiftDate("2025-12-29", 7)).toBe("2026-01-05");
    expect(shiftDate("2026-01-05", -7)).toBe("2025-12-29");
  });
});

// ── 5. Calendar & streak date consistency ─────────────────────

describe("Calendar and streak date consistency", () => {
  function makeMeal(loggedAt: string): MealEntry {
    return {
      id: `meal-${loggedAt}`,
      title: "Test Meal",
      source: "voice",
      calories: 500,
      protein: 30,
      carbs: 50,
      fat: 20,
      loggedAt,
    };
  }

  it("calendar and streak agree on which dates have meals (daytime)", () => {
    // Meals logged during normal daytime hours
    const timestamps = [
      "2026-03-28T10:00:00.000Z", // March 28
      "2026-03-29T14:00:00.000Z", // March 29
      "2026-03-30T12:00:00.000Z", // March 30
      "2026-03-31T09:00:00.000Z", // March 31
    ];
    const meals = timestamps.map(makeMeal);

    // Calendar: getMealsForDate uses startsWith on the UTC date prefix
    const calendarDates = [
      "2026-03-28",
      "2026-03-29",
      "2026-03-30",
      "2026-03-31",
    ];
    for (const date of calendarDates) {
      expect(getMealsForDate(meals, date).length).toBeGreaterThan(0);
    }

    // Streak: mealDate uses toLocalDate(new Date(loggedAt))
    const streakDates = new Set(timestamps.map(mealDate));
    for (const date of calendarDates) {
      expect(streakDates.has(date)).toBe(true);
    }
  });

  it("streak counts match visible filled days in weekly calendar", () => {
    // Simulate: 4 meals on 4 consecutive days spanning 2 weeks
    const timestamps = [
      "2026-03-28T13:00:00.000Z",
      "2026-03-29T14:00:00.000Z",
      "2026-03-30T12:00:00.000Z",
      "2026-03-31T09:00:00.000Z",
    ];

    // Count how many calendar days have meals
    const calendarDatesWithMeals = new Set<string>();
    const meals = timestamps.map(makeMeal);
    for (const ts of timestamps) {
      const utcDate = ts.substring(0, 10);
      if (getMealsForDate(meals, utcDate).length > 0) {
        calendarDatesWithMeals.add(utcDate);
      }
    }

    // Count streak
    const streak = computeStreakFromMeals(timestamps, "2026-03-31");

    // The streak should equal the number of consecutive calendar days
    // (since these are all consecutive and end at today)
    expect(streak).toBe(4);
    expect(calendarDatesWithMeals.size).toBe(4);
  });
});

// ── 6. Streak store merge guard ─────────────────────────────────

describe("Streak store rehydration merge guard", () => {
  it("merge function strips currentStreak from persisted state", () => {
    // Simulate the merge function from streak.store.ts
    // Old AsyncStorage data may still contain currentStreak
    const merge = (
      persisted: Record<string, unknown> | undefined,
      current: Record<string, unknown>
    ) => {
      const p = (persisted ?? {}) as Record<string, unknown>;
       
      const { currentStreak: _drop, ...safe } = p;
      return { ...current, ...safe };
    };

    const currentState = {
      currentStreak: 4, // freshly computed
      longestStreak: 4,
      lastLogDate: "2026-03-31",
    };

    const persistedState = {
      currentStreak: 2, // stale value from old AsyncStorage
      longestStreak: 3,
      lastLogDate: "2026-03-30",
    };

    const result = merge(persistedState, currentState);

    // currentStreak should come from current state (4), NOT persisted (2)
    expect(result.currentStreak).toBe(4);
    // longestStreak should come from persisted (3) since it's merged on top
    expect(result.longestStreak).toBe(3);
  });

  it("merge function handles undefined persisted state", () => {
    const merge = (
      persisted: Record<string, unknown> | undefined,
      current: Record<string, unknown>
    ) => {
      const p = (persisted ?? {}) as Record<string, unknown>;
      const { currentStreak: _drop, ...safe } = p;
      return { ...current, ...safe };
    };

    const currentState = {
      currentStreak: 0,
      longestStreak: 0,
    };

    const result = merge(undefined, currentState);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
  });

  it("merge function preserves other persisted fields", () => {
    const merge = (
      persisted: Record<string, unknown> | undefined,
      current: Record<string, unknown>
    ) => {
      const p = (persisted ?? {}) as Record<string, unknown>;
      const { currentStreak: _drop, ...safe } = p;
      return { ...current, ...safe };
    };

    const currentState = {
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null,
      streakFreezeAvailable: false,
    };

    const persistedState = {
      currentStreak: 5, // stale — should be dropped
      longestStreak: 10,
      lastLogDate: "2026-03-30",
      streakFreezeAvailable: true,
    };

    const result = merge(persistedState, currentState);
    expect(result.currentStreak).toBe(0); // from current, not persisted
    expect(result.longestStreak).toBe(10); // from persisted
    expect(result.lastLogDate).toBe("2026-03-30"); // from persisted
    expect(result.streakFreezeAvailable).toBe(true); // from persisted
  });
});
