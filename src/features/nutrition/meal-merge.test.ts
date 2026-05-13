import type { MealEntry } from "./nutrition.types";
import { mealEditTimestampMs, mergeMealWithRemoteSnapshot } from "./meal-merge";

function base(id: string): MealEntry {
  return {
    id,
    title: "T",
    source: "manual",
    calories: 1,
    protein: 1,
    carbs: 1,
    fat: 1,
    loggedAt: "2026-05-08T10:00:00.000Z",
  };
}

describe("mealEditTimestampMs", () => {
  it("prefers updatedAt over loggedAt", () => {
    expect(
      mealEditTimestampMs({
        ...base("a"),
        updatedAt: "2026-07-01T00:00:00.000Z",
        loggedAt: "2020-01-01T00:00:00.000Z",
      })
    ).toBe(Date.parse("2026-07-01T00:00:00.000Z"));
  });
});

describe("mergeMealWithRemoteSnapshot", () => {
  it("when local is newer, local mealTime wins", () => {
    const local = {
      ...base("m"),
      mealTime: "dinner" as const,
      updatedAt: "2026-06-02T00:00:00.000Z",
    };
    const remote = {
      ...base("m"),
      mealTime: "snack" as const,
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const merged = mergeMealWithRemoteSnapshot(local, remote);
    expect(merged.mealTime).toBe("dinner");
  });

  it("when remote is newer, remote mealTime wins", () => {
    const local = {
      ...base("m"),
      mealTime: "snack" as const,
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const remote = {
      ...base("m"),
      mealTime: "dinner" as const,
      updatedAt: "2026-06-02T00:00:00.000Z",
    };
    const merged = mergeMealWithRemoteSnapshot(local, remote);
    expect(merged.mealTime).toBe("dinner");
  });
});
