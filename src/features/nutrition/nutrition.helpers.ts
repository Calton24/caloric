import { MealDraft } from "./nutrition.draft.types";
import { MealEntry } from "./nutrition.types";

export function buildMealEntryFromDraft(params: {
  draft: MealDraft;
  loggedAt?: string;
}): MealEntry {
  const { draft, loggedAt } = params;
  // Priority: explicit param > draft.loggedAt > now
  // All timestamps are stored as UTC ISO so that `new Date(loggedAt)` is
  // unambiguous everywhere — local persist, Supabase TIMESTAMPTZ, and date
  // math in `getMealsForDate` all agree on the same instant.
  const provided = loggedAt ?? draft.loggedAt;
  let timestamp: string;
  if (provided) {
    if (provided.length === 10) {
      // Bare YYYY-MM-DD: anchor it at the current local time of day, then
      // serialise to UTC ISO so it round-trips through Supabase correctly.
      const now = new Date();
      const local = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        now.getMinutes(),
        now.getSeconds()
      );
      const [y, m, d] = provided.split("-").map(Number);
      local.setFullYear(y, m - 1, d);
      timestamp = local.toISOString();
    } else if (/Z$|[+-]\d{2}:?\d{2}$/.test(provided)) {
      // Already has a timezone — trust it.
      timestamp = provided;
    } else {
      // Legacy local-time string with no offset — interpret as local and
      // re-serialise to UTC ISO.
      timestamp = new Date(provided).toISOString();
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
