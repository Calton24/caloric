import { buildMealEntryFromDraft } from "./nutrition.helpers";
import type { MealDraft } from "./nutrition.draft.types";

describe("buildMealEntryFromDraft", () => {
  it("keeps imageUri from camera draft", () => {
    const draft: MealDraft = {
      title: "Chicken bowl",
      source: "camera",
      calories: 420,
      protein: 32,
      carbs: 28,
      fat: 15,
      imageUri: "file://camera-shot.jpg",
    };

    const meal = buildMealEntryFromDraft({ draft });
    expect(meal.imageUri).toBe("file://camera-shot.jpg");
  });

  it("keeps imagePath when available", () => {
    const draft: MealDraft = {
      title: "Chicken bowl",
      source: "camera",
      calories: 420,
      protein: 32,
      carbs: 28,
      fat: 15,
      imagePath: "user/meal-shot.jpg",
    };

    const meal = buildMealEntryFromDraft({ draft });
    expect(meal.imagePath).toBe("user/meal-shot.jpg");
  });
});

