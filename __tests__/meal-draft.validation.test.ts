import { validateMealDraft } from "../src/features/nutrition/meal-draft.validation";
import type { MealDraft } from "../src/features/nutrition/nutrition.draft.types";

function baseDraft(over: Partial<MealDraft> = {}): MealDraft {
  return {
    title: "Eggs",
    source: "manual",
    rawInput: "eggs",
    calories: 140,
    protein: 12,
    carbs: 1,
    fat: 10,
    ...over,
  };
}

describe("validateMealDraft", () => {
  it("accepts a sane draft", () => {
    const r = validateMealDraft(baseDraft());
    expect(r.ok).toBe(true);
  });

  it("rejects empty title", () => {
    const r = validateMealDraft(baseDraft({ title: "  " }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues).toContain("missing_title");
  });

  it("rejects non-finite calories", () => {
    const r = validateMealDraft(baseDraft({ calories: NaN }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues).toContain("invalid_calories");
  });

  it("rejects negative macros", () => {
    const r = validateMealDraft(baseDraft({ protein: -1 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues).toContain("invalid_protein");
  });

  it("rejects unknown source", () => {
    const r = validateMealDraft(
      baseDraft({ source: "not-a-real-source" as MealDraft["source"] })
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues).toContain("unknown_source");
  });

  it("rejects null draft", () => {
    const r = validateMealDraft(null);
    expect(r.ok).toBe(false);
  });
});
