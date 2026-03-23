import { MealDraft } from "./nutrition.draft.types";
import { MealEntry } from "./nutrition.types";

export function buildMealEntryFromDraft(params: {
  draft: MealDraft;
  loggedAt?: string;
}): MealEntry {
  const { draft, loggedAt } = params;
  // Priority: explicit param > draft.loggedAt > now
  let timestamp = loggedAt ?? draft.loggedAt;
  if (timestamp) {
    // If only a date (YYYY-MM-DD), attach the current time of day
    if (timestamp.length === 10) {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const ss = String(now.getSeconds()).padStart(2, "0");
      timestamp = `${timestamp}T${hh}:${mm}:${ss}`;
    }
  } else {
    timestamp = new Date().toISOString();
  }

  const entry: MealEntry = {
    id: `meal_${Date.now()}`,
    title: draft.title,
    source: draft.source,
    rawInput: draft.rawInput,
    calories: draft.calories,
    protein: draft.protein,
    carbs: draft.carbs,
    fat: draft.fat,
    loggedAt: timestamp,
  };

  // Carry provenance data from the enhanced pipeline
  if (draft.estimatedItems) {
    entry.items = draft.estimatedItems.map((item) => ({
      name: item.parsed?.name ?? item.matchedName ?? "unknown",
      quantity: item.parsed?.quantity ?? 1,
      unit: item.parsed?.unit ?? "serving",
      calories: item.nutrients.calories,
      protein: item.nutrients.protein,
      carbs: item.nutrients.carbs,
      fat: item.nutrients.fat,
      matchSource: item.matchSource,
      matchId: item.matchId,
      confidence: item.confidence,
      emoji: item.emoji,
    }));
  }

  if (draft.confidence !== undefined) {
    entry.confidence = draft.confidence;
  }

  if (draft.parseMethod) {
    entry.parseMethod = draft.parseMethod;
  }

  if (draft.emoji) {
    entry.emoji = draft.emoji;
  }

  if (draft.mealTime) {
    entry.mealTime = draft.mealTime;
  }

  if (draft.imageUri) {
    entry.imageUri = draft.imageUri;
  }

  return entry;
}
