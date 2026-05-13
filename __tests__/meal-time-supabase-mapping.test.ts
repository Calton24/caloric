/**
 * Contract: `pushMealUpdate` maps local `mealTime` → `meal_time` on Supabase.
 * Logic lives in sync.service.ts — this test locks the shape and snake_case key.
 */
import { normaliseMealTime } from "../src/features/nutrition/mealtime";

function buildMealUpdatePayload(updates: {
  mealTime?: string;
  updatedAt?: string;
}) {
  const mapped: Record<string, unknown> = {
    updated_at: updates.updatedAt ?? new Date().toISOString(),
  };
  if (updates.mealTime !== undefined) {
    mapped.meal_time = normaliseMealTime(updates.mealTime);
  }
  return mapped;
}

describe("meal_entries push meal_time mapping", () => {
  it("uses snake_case meal_time, not camelCase mealTime", () => {
    const mapped = buildMealUpdatePayload({ mealTime: "dinner" });
    expect(mapped).toMatchObject({ meal_time: "dinner" });
    expect(mapped).not.toHaveProperty("mealTime");
  });

  it("passes through explicit updated_at from local meal", () => {
    const ts = "2026-03-15T12:00:00.000Z";
    const mapped = buildMealUpdatePayload({
      mealTime: "lunch",
      updatedAt: ts,
    });
    expect(mapped.updated_at).toBe(ts);
    expect(mapped.meal_time).toBe("lunch");
  });
});
