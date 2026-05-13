import { useNutritionStore } from "./nutrition.store";
import type { MealEntry } from "./nutrition.types";

function meal(id: string): MealEntry {
  return {
    id,
    title: `Meal ${id}`,
    source: "manual",
    calories: 100,
    protein: 10,
    carbs: 10,
    fat: 5,
    loggedAt: "2026-05-08T10:00:00.000Z",
  };
}

describe("nutrition store tombstones", () => {
  beforeEach(() => {
    useNutritionStore.setState({ meals: [], deletedMealIds: [], syncedMealIds: [] });
  });

  it("mergeMealsFromRepositorySnapshot never re-adds tombstoned meal ids", () => {
    useNutritionStore.setState({
      deletedMealIds: ["meal_deleted"],
      meals: [],
      syncedMealIds: [],
    });

    useNutritionStore
      .getState()
      .mergeMealsFromRepositorySnapshot([meal("meal_deleted"), meal("meal_kept")]);

    const ids = useNutritionStore.getState().meals.map((m) => m.id);
    expect(ids).toEqual(["meal_kept"]);
  });

  it("mergeMealsFromRepositorySnapshot keeps in-memory-only meals not in the snapshot", () => {
    useNutritionStore.setState({
      deletedMealIds: [],
      meals: [meal("only_memory")],
      syncedMealIds: [],
    });

    useNutritionStore.getState().mergeMealsFromRepositorySnapshot([meal("meal_kept")]);

    const ids = useNutritionStore.getState().meals.map((m) => m.id).sort();
    expect(ids).toEqual(["meal_kept", "only_memory"].sort());
  });
});

describe("mealTime updates (drag / sync)", () => {
  beforeEach(() => {
    useNutritionStore.setState({
      meals: [],
      deletedMealIds: [],
      syncedMealIds: [],
    });
  });

  it("updateMeal moves snack -> dinner locally", () => {
    const m = { ...meal("m1"), mealTime: "snack" as const };
    useNutritionStore.setState({
      meals: [m],
      deletedMealIds: [],
      syncedMealIds: [],
    });
    useNutritionStore.getState().updateMeal("m1", { mealTime: "dinner" });
    const updated = useNutritionStore.getState().meals[0];
    expect(updated.mealTime).toBe("dinner");
    expect(updated.updatedAt).toBeDefined();
    expect(typeof updated.updatedAt).toBe("string");
  });

  it("mergeMealsFromRepositorySnapshot prefers remote mealTime when remote updatedAt is newer", () => {
    useNutritionStore.setState({
      meals: [
        {
          ...meal("m1"),
          mealTime: "snack",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      deletedMealIds: [],
      syncedMealIds: [],
    });
    useNutritionStore.getState().mergeMealsFromRepositorySnapshot([
      {
        ...meal("m1"),
        mealTime: "dinner",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    ]);
    expect(useNutritionStore.getState().meals.find((x) => x.id === "m1")?.mealTime).toBe(
      "dinner"
    );
  });

  it("mergeMealsFromRepositorySnapshot keeps local mealTime when local updatedAt is newer", () => {
    useNutritionStore.setState({
      meals: [
        {
          ...meal("m1"),
          mealTime: "dinner",
          updatedAt: "2026-06-02T00:00:00.000Z",
        },
      ],
      deletedMealIds: [],
      syncedMealIds: [],
    });
    useNutritionStore.getState().mergeMealsFromRepositorySnapshot([
      {
        ...meal("m1"),
        mealTime: "snack",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
    expect(useNutritionStore.getState().meals.find((x) => x.id === "m1")?.mealTime).toBe(
      "dinner"
    );
  });
});

