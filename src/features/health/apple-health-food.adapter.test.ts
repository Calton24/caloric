import { buildAppleHealthFoodPayload } from "./apple-health-food.adapter";

describe("buildAppleHealthFoodPayload", () => {
  it("defaults empty title to Food", () => {
    const result = buildAppleHealthFoodPayload({
      calories: 250,
      loggedAt: new Date().toISOString(),
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.name).toBe("Food");
  });

  it("rejects null calories", () => {
    const result = buildAppleHealthFoodPayload({
      title: "Meal",
      calories: null,
      loggedAt: new Date().toISOString(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_calories");
  });

  it("rejects undefined calories", () => {
    const result = buildAppleHealthFoodPayload({
      title: "Meal",
      loggedAt: new Date().toISOString(),
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_calories");
  });

  it("converts string calories when valid", () => {
    const result = buildAppleHealthFoodPayload({
      title: "Meal",
      calories: "321.5",
      loggedAt: "2026-05-08T10:00:00.000Z",
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.calories).toBe(321.5);
  });

  it("defaults protein/carbs/fat to zero", () => {
    const result = buildAppleHealthFoodPayload({
      title: "Meal",
      calories: 300,
      loggedAt: "2026-05-08T10:00:00.000Z",
      protein: undefined,
      carbs: null,
      fat: "bad",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.protein).toBe(0);
      expect(result.payload.carbs).toBe(0);
      expect(result.payload.fat).toBe(0);
    }
  });

  it("rejects invalid loggedAt date", () => {
    const result = buildAppleHealthFoodPayload({
      title: "Meal",
      calories: 200,
      loggedAt: "not-a-date",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid_date");
  });

  it("valid payload has no null/undefined/NaN", () => {
    const result = buildAppleHealthFoodPayload({
      title: "Meal",
      calories: 200,
      loggedAt: "2026-05-08T10:00:00.000Z",
      protein: 10,
      carbs: 20,
      fat: 5,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const value of Object.values(result.payload)) {
        expect(value).not.toBeNull();
        expect(value).not.toBeUndefined();
        if (typeof value === "number") {
          expect(Number.isFinite(value)).toBe(true);
        }
      }
    }
  });
});

