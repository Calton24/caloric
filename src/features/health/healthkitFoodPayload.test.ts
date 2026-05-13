import { buildWriteDietaryEnergySampleInputFromMeal } from "./healthkitFoodPayload";

describe("buildWriteDietaryEnergySampleInputFromMeal", () => {
  it("produces finite primitives and required mealType for native bridge", () => {
    const input = buildWriteDietaryEnergySampleInputFromMeal({
      id: "m1",
      title: "  ",
      calories: 42,
      protein: null,
      carbs: undefined,
      fat: Number.NaN,
      loggedAt: null,
      createdAt: "2026-05-08T12:00:00.000Z",
    });
    expect(input).not.toBeNull();
    expect(input!.foodName).toBe("Food");
    expect(input!.mealType).toBe("Lunch");
    expect(input!.energyKcal).toBe(42);
    expect(input!.proteinG).toBe(0);
    expect(input!.carbohydratesG).toBe(0);
    expect(input!.fatG).toBe(0);
    expect(Number.isNaN(input!.date.getTime())).toBe(false);
    expect(JSON.stringify(input)).not.toContain("null");
  });

  it("honours custom mealType", () => {
    const input = buildWriteDietaryEnergySampleInputFromMeal(
      { title: "Snack", calories: 100, loggedAt: "2026-05-08T12:00:00.000Z" },
      { mealType: "Snacks" }
    );
    expect(input?.mealType).toBe("Snacks");
  });

  it("returns null for zero-calorie meals", () => {
    expect(
      buildWriteDietaryEnergySampleInputFromMeal({
        title: "Water",
        calories: 0,
        loggedAt: "2026-05-08T12:00:00.000Z",
      })
    ).toBeNull();
  });
});
