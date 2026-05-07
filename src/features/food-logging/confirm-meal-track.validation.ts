import type { MealDraft } from "../nutrition/nutrition.draft.types";
import { normalizeMealDraftForStorage } from "../nutrition/meal-normalize";
import { validateMealDraft } from "../nutrition/meal-draft.validation";

export type ConfirmMealTrackInvalidReason =
  | "no_draft"
  | "draft_validation"
  | "invalid_log_date"
  | "invalid_estimated_item";

export interface ConfirmMealTrackValid {
  ok: true;
  draft: MealDraft;
}

export interface ConfirmMealTrackInvalid {
  ok: false;
  reason: ConfirmMealTrackInvalidReason;
  /** Short machine-readable codes only — no raw draft payload. */
  detail: string;
}

export type ConfirmMealTrackValidation = ConfirmMealTrackValid | ConfirmMealTrackInvalid;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Payload checks before `saveDraftWithoutNav` — avoids throws from bad items/dates.
 */
export function validateConfirmMealDraftForTrack(
  draft: MealDraft | null | undefined,
  logDate: string | null | undefined
): ConfirmMealTrackValidation {
  if (!draft) {
    return {
      ok: false,
      reason: "no_draft",
      detail: "missing_draft",
    };
  }

  const normalized = normalizeMealDraftForStorage(draft);
  const validated = validateMealDraft(normalized);
  if (!validated.ok) {
    return {
      ok: false,
      reason: "draft_validation",
      detail: validated.issues.join(","),
    };
  }

  if (logDate != null && logDate.trim() !== "") {
    if (!ISO_DATE.test(logDate)) {
      return {
        ok: false,
        reason: "invalid_log_date",
        detail: "log_date_format",
      };
    }
  }

  const items = validated.value.estimatedItems;
  if (items?.length) {
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const name =
        typeof it.matchedName === "string" ? it.matchedName.trim() : "";
      if (!name) {
        return {
          ok: false,
          reason: "invalid_estimated_item",
          detail: `item_${i}_name`,
        };
      }
      if (
        !Number.isFinite(it.estimatedServings) ||
        it.estimatedServings < 0
      ) {
        return {
          ok: false,
          reason: "invalid_estimated_item",
          detail: `item_${i}_servings`,
        };
      }
      const cal = it.nutrients?.calories;
      if (!Number.isFinite(cal) || (cal as number) < 0) {
        return {
          ok: false,
          reason: "invalid_estimated_item",
          detail: `item_${i}_calories`,
        };
      }
    }
  }

  return { ok: true, draft: validated.value };
}
