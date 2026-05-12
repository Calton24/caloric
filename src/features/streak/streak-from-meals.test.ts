import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  computeCurrentStreakFromMeals,
  getLoggedMealDates,
} from "./streak-from-meals";
import type { MealEntry } from "../nutrition/nutrition.types";

function meal(
  id: string,
  loggedDateLocal: string,
  loggedAt = `${loggedDateLocal}T12:00:00.000Z`
): MealEntry {
  return {
    id,
    title: "x",
    source: "manual",
    calories: 1,
    protein: 0,
    carbs: 0,
    fat: 0,
    loggedAt,
    loggedAtUtc: loggedAt,
    loggedDateLocal,
    timezone: "UTC",
  };
}

describe("computeCurrentStreakFromMeals", () => {
  const realDate = Date;

  afterEach(() => {
    global.Date = realDate;
    jest.restoreAllMocks();
  });

  it("counts 2 when meals exist on today and yesterday (wall clock)", () => {
    global.Date = jest.fn(
      (arg?: string | number | Date) =>
        arg !== undefined ? new realDate(arg) : new realDate("2026-05-11T15:00:00Z")
    ) as unknown as DateConstructor;
    global.Date.now = realDate.now;
    global.Date.parse = realDate.parse;
    global.Date.UTC = realDate.UTC;

    const meals = [
      meal("a", "2026-05-10", "2026-05-10T18:00:00.000Z"),
      meal("b", "2026-05-11", "2026-05-11T12:00:00.000Z"),
    ];
    expect(getLoggedMealDates(meals).size).toBe(2);
    expect(computeCurrentStreakFromMeals(meals)).toBe(2);
  });

  it("stays 1 when both meals share the same calendar day", () => {
    global.Date = jest.fn(
      (arg?: string | number | Date) =>
        arg !== undefined ? new realDate(arg) : new realDate("2026-05-11T15:00:00Z")
    ) as unknown as DateConstructor;
    global.Date.now = realDate.now;
    global.Date.parse = realDate.parse;
    global.Date.UTC = realDate.UTC;

    const meals = [
      meal("a", "2026-05-11", "2026-05-11T08:00:00.000Z"),
      meal("b", "2026-05-11", "2026-05-11T20:00:00.000Z"),
    ];
    expect(computeCurrentStreakFromMeals(meals)).toBe(1);
  });

  it("excludes meals with invalid loggedAt from date set", () => {
    global.Date = jest.fn(
      (arg?: string | number | Date) =>
        arg !== undefined ? new realDate(arg) : new realDate("2026-05-11T15:00:00Z")
    ) as unknown as DateConstructor;
    global.Date.now = realDate.now;
    global.Date.parse = realDate.parse;
    global.Date.UTC = realDate.UTC;

    const bad: MealEntry = {
      ...meal("bad", "2026-05-10"),
      loggedAt: "not-a-date",
    };
    const meals = [bad, meal("good", "2026-05-11")];
    expect(getLoggedMealDates(meals).has("2026-05-10")).toBe(false);
    expect(computeCurrentStreakFromMeals(meals)).toBe(1);
  });
});
