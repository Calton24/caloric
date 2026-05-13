import {
  coerceRemoteMealTime,
  effectiveMealSectionKey,
  normaliseMealTime,
} from "./mealtime";

describe("normaliseMealTime", () => {
  it("passes through valid meal times", () => {
    expect(normaliseMealTime("breakfast")).toBe("breakfast");
    expect(normaliseMealTime("lunch")).toBe("lunch");
    expect(normaliseMealTime("dinner")).toBe("dinner");
    expect(normaliseMealTime("snack")).toBe("snack");
  });

  it("maps invalid and empty values to snack", () => {
    expect(normaliseMealTime("brunch")).toBe("snack");
    expect(normaliseMealTime(null)).toBe("snack");
    expect(normaliseMealTime(undefined)).toBe("snack");
    expect(normaliseMealTime(123)).toBe("snack");
  });
});

describe("coerceRemoteMealTime", () => {
  it("returns undefined for null / missing", () => {
    expect(coerceRemoteMealTime(null)).toBeUndefined();
    expect(coerceRemoteMealTime(undefined)).toBeUndefined();
  });

  it("returns snack for invalid remote strings", () => {
    expect(coerceRemoteMealTime("")).toBe("snack");
    expect(coerceRemoteMealTime("lunch_time")).toBe("snack");
  });

  it("returns valid enum values", () => {
    expect(coerceRemoteMealTime("dinner")).toBe("dinner");
  });
});

describe("effectiveMealSectionKey", () => {
  it("uses mealTime when valid", () => {
    expect(
      effectiveMealSectionKey({
        mealTime: "dinner",
        loggedAt: "2026-05-12T10:00:00.000Z",
      })
    ).toBe("dinner");
  });

  it("falls back to loggedAt when mealTime is unset", () => {
    const key = effectiveMealSectionKey({
      loggedAt: "2026-05-12T10:00:00.000Z",
    });
    expect(["breakfast", "lunch", "dinner", "snack"]).toContain(key);
  });

  it("uses snack for invalid persisted mealTime", () => {
    expect(
      effectiveMealSectionKey({
        mealTime: "brunch" as any,
        loggedAt: "2026-05-12T10:00:00.000Z",
      })
    ).toBe("snack");
  });
});
