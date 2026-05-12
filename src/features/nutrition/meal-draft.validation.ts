/**
 * Defensive validation for meal drafts before local persist.
 * Keeps logging flows from writing NaN/empty payloads into the store.
 */

import type { MealDraft } from "./nutrition.draft.types";
import type { MealEntry } from "./nutrition.types";

const KNOWN_SOURCES = new Set<MealEntry["source"]>([
  "voice",
  "manual",
  "camera",
  "text",
  "image",
  "barcode",
]);

function isFiniteNonNegative(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

export type MealDraftValidationIssue =
  | "missing_title"
  | "invalid_calories"
  | "invalid_protein"
  | "invalid_carbs"
  | "invalid_fat"
  | "unknown_source"
  | "invalid_logged_at";

export interface MealDraftValidationFailure {
  ok: false;
  reason: string;
  issues: MealDraftValidationIssue[];
}

export interface MealDraftValidationSuccess {
  ok: true;
  value: MealDraft;
}

export type MealDraftValidationResult =
  | MealDraftValidationSuccess
  | MealDraftValidationFailure;

/**
 * Validates a draft before `buildMealEntryFromDraft` / `addMeal`.
 * `loggedAt` on draft is optional; when present it must be a non-empty string.
 */
export function validateMealDraft(
  draft: MealDraft | null | undefined
): MealDraftValidationResult {
  const issues: MealDraftValidationIssue[] = [];

  if (!draft) {
    return {
      ok: false,
      reason: "No meal draft",
      issues: ["missing_title"],
    };
  }

  const title = typeof draft.title === "string" ? draft.title.trim() : "";
  if (!title) {
    issues.push("missing_title");
  }

  if (!isFiniteNonNegative(draft.calories)) {
    issues.push("invalid_calories");
  }
  if (!isFiniteNonNegative(draft.protein)) {
    issues.push("invalid_protein");
  }
  if (!isFiniteNonNegative(draft.carbs)) {
    issues.push("invalid_carbs");
  }
  if (!isFiniteNonNegative(draft.fat)) {
    issues.push("invalid_fat");
  }

  if (!KNOWN_SOURCES.has(draft.source)) {
    issues.push("unknown_source");
  }

  if (draft.loggedAt != null) {
    if (
      typeof draft.loggedAt !== "string" ||
      draft.loggedAt.trim().length === 0
    ) {
      issues.push("invalid_logged_at");
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      reason: `Invalid meal draft: ${issues.join(",")}`,
      issues,
    };
  }

  return { ok: true, value: draft };
}
