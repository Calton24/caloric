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

