/**
 * AI Correction Service — "Fix with AI"
 *
 * Sends an existing meal draft + a free-text user correction to the
 * `correct-meal-draft` Supabase Edge Function and returns a revised draft.
 *
 * Why a separate service from `meal-analysis.service.ts`:
 *   - Text-only round-trip (no base64 photo).
 *   - Different validation surface — we only correct an existing draft,
 *     not produce one from scratch.
 *   - Smaller error vocabulary tailored to the UX: the confirm-meal sheet
 *     just needs to know "ok" vs "couldn't do it".
 *
 * Strict rules:
 *   - Never mutates state. Returns a new draft on success; the caller
 *     (sheet UI) decides when/whether to apply it via `setDraft`.
 *   - Preserves the original draft's image and link fields when applying:
 *     `imageUri`, `imagePath`, `pendingReviewId`, `source`, `loggedAt` are
 *     ALL pulled from the original — the AI never controls these.
 *   - Validates the response against `validateFoodResult` before declaring
 *     success. If validation fails → `{ ok: false, reason: "validation" }`.
 *   - Telemetry truncates `userCorrection` to 120 chars and excludes any
 *     image bytes from breadcrumbs.
 */

import {
  addFoodLoggingBreadcrumb,
  captureFoodLoggingError,
} from "../../../infrastructure/errorReporting/foodLoggingErrors";
import { getSupabaseClient } from "../../../lib/supabase/client";
import type { MealDraft } from "../nutrition.draft.types";
import { validateFoodResult } from "../validation/food-validator.service";

// ─── Public types ────────────────────────────────────────────────────────────

export type CorrectMealDraftResult =
  | { ok: true; draft: MealDraft; explanation?: string }
  | {
      ok: false;
      reason:
        | "no_session"
        | "rate_limited"
        | "ai_unavailable"
        | "ai_error"
        | "validation"
        | "network"
        | "unknown";
      message?: string;
    };

export interface CorrectMealDraftInput {
  /** Existing draft to refine. Caller's draft is never mutated. */
  draft: MealDraft;
  /** Natural-language correction from the user. */
  userCorrection: string;
  /** Optional storage path; reserved for future image-aware corrections. */
  imagePath?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_CORRECTION_LEN = 1000;
const TELEMETRY_TRUNCATE = 120;

// Same bounds as the server. Defence in depth.
const MIN_CALORIES = 1;
const MAX_CALORIES = 5000;
const MAX_MACRO_GRAMS = 700;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function truncateForTelemetry(text: string): string {
  if (text.length <= TELEMETRY_TRUNCATE) return text;
  return `${text.slice(0, TELEMETRY_TRUNCATE)}…`;
}

function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

interface CorrectionResponseData {
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  estimatedItems?: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
  confidence?: number;
  explanation?: string;
  vendor?: string;
  model?: string;
  latencyMs?: number;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Send a correction request to the edge function. The original `draft` is
 * never mutated.
 */
export async function correctMealDraftWithAI(
  input: CorrectMealDraftInput
): Promise<CorrectMealDraftResult> {
  const correction = input.userCorrection.trim().slice(0, MAX_CORRECTION_LEN);
  if (correction.length === 0) {
    return { ok: false, reason: "validation", message: "Empty correction" };
  }

  const hasImage = Boolean(input.draft.imagePath || input.draft.imageUri);
  const hasPendingReviewId = Boolean(input.draft.pendingReviewId);

  addFoodLoggingBreadcrumb("food_logging.ai_fix_submitted", {
    has_image: hasImage,
    has_pending_review_id: hasPendingReviewId,
    original_calories: input.draft.calories,
    correction_length: correction.length,
    correction_preview: truncateForTelemetry(correction),
  });

  const client = getSupabaseClient();

  // Resolve a session token. The edge function uses the standard
  // `Authorization: Bearer <jwt>` flow because it doesn't have to deal with
  // ES256 quirks the way `ai-scan` does. The default `functions.invoke`
  // forwards the session, but we double-check we have one.
  let token: string | undefined;
  try {
    const { data } = await client.auth.getSession();
    token = data.session?.access_token ?? undefined;
  } catch {
    // fall through
  }
  if (!token) {
    addFoodLoggingBreadcrumb("food_logging.ai_fix_failed", {
      reason: "no_session",
    });
    return {
      ok: false,
      reason: "no_session",
      message: "Sign in to use AI corrections.",
    };
  }

  // ── Invoke the edge function ───────────────────────────────────────────
  let envelope: { ok?: boolean; data?: CorrectionResponseData; code?: string; message?: string } | null;
  try {
    const { data, error } = await client.functions.invoke("correct-meal-draft", {
      body: {
        draft: serialiseDraftForServer(input.draft),
        userCorrection: correction,
        imagePath: input.imagePath ?? input.draft.imagePath ?? undefined,
      },
    });

    if (error) {
      // Try to extract the structured `code` the function returns on errors.
      let detail = "";
      let code: string | undefined;
      try {
        if (error.context && typeof error.context.json === "function") {
          const body = await error.context.json();
          code = body?.code;
          detail = body?.detail || body?.message || body?.error || "";
        }
      } catch {
        // ignore — no body / already consumed
      }

      const reason = mapEdgeErrorCode(code);
      addFoodLoggingBreadcrumb("food_logging.ai_fix_failed", {
        reason,
        code,
        detail,
        error_name: error.name,
      });

      // Only report unexpected vendor/internal failures to Sentry as full
      // events. Auth / rate-limit / unavailable are routine.
      if (reason === "ai_error" || reason === "unknown") {
        captureFoodLoggingError(
          error,
          {
            flow: "confirm_meal",
            step: "ai_fix",
            extras: {
              code,
              detail,
              hasImage,
              hasPendingReviewId,
              originalCalories: input.draft.calories,
              correctionLength: correction.length,
            },
          },
          { level: "warning" }
        );
      }
      return { ok: false, reason, message: detail };
    }

    envelope = data as typeof envelope;
  } catch (e) {
    addFoodLoggingBreadcrumb("food_logging.ai_fix_failed", {
      reason: "network",
    });
    captureFoodLoggingError(
      e,
      {
        flow: "confirm_meal",
        step: "ai_fix",
        extras: {
          phase: "network",
          hasImage,
          hasPendingReviewId,
          originalCalories: input.draft.calories,
          correctionLength: correction.length,
        },
      },
      { level: "warning" }
    );
    return { ok: false, reason: "network" };
  }

  if (!envelope?.ok || !envelope.data) {
    addFoodLoggingBreadcrumb("food_logging.ai_fix_failed", {
      reason: "ai_error",
      code: envelope?.code,
    });
    return {
      ok: false,
      reason: "ai_error",
      message: envelope?.message,
    };
  }

  const corrected = envelope.data;

  // ── Client-side bounds + structural validation ─────────────────────────
  const calories = clamp(corrected.calories, MIN_CALORIES, MAX_CALORIES);
  const protein = clamp(corrected.protein, 0, MAX_MACRO_GRAMS);
  const carbs = clamp(corrected.carbs, 0, MAX_MACRO_GRAMS);
  const fat = clamp(corrected.fat, 0, MAX_MACRO_GRAMS);
  const title = (corrected.title ?? "").trim();

  if (!title) {
    addFoodLoggingBreadcrumb("food_logging.ai_fix_failed", {
      reason: "validation",
      detail: "empty_title",
    });
    return { ok: false, reason: "validation", message: "Empty title" };
  }

  // Run the project's canonical food validator. We only reject on a hard
  // "invalid" verdict — soft confidence drops are fine; the user explicitly
  // asked for this correction.
  const validation = validateFoodResult(title, calories, protein, carbs, fat);
  if (!validation.valid && validation.confidenceMultiplier < 0.2) {
    const detail = validation.issues.map((i) => i.type).join(",");
    addFoodLoggingBreadcrumb("food_logging.ai_fix_failed", {
      reason: "validation",
      detail,
    });
    return {
      ok: false,
      reason: "validation",
      message: validation.issues[0]?.message ?? "Validation failed",
    };
  }

  // ── Build the merged draft ─────────────────────────────────────────────
  // CRITICAL: AI never controls image, link, or source fields. Pull them
  // straight from the original draft.
  const merged: MealDraft = {
    ...input.draft,
    title,
    calories,
    protein,
    carbs,
    fat,
    confidence:
      typeof corrected.confidence === "number"
        ? corrected.confidence
        : input.draft.confidence,
    parseMethod: "ai-correction",
    // Keep the original `source`, `imageUri`, `imagePath`, `pendingReviewId`,
    // `loggedAt`, `rawInput` — already covered by the spread above.
  };

  // estimatedItems: we drop them entirely on correction. The AI's structural
  // estimatedItems shape doesn't match the project's `EstimatedFoodItem`
  // type (which is much richer). The confirm-meal screen prefers the
  // top-level macros anyway, and the original items are likely no longer
  // accurate after a correction. If a future iteration wants to keep them,
  // we can map the simplified server items into a "synthesised"
  // EstimatedFoodItem shape.
  if (merged.estimatedItems && merged.estimatedItems.length > 0) {
    delete merged.estimatedItems;
  }

  addFoodLoggingBreadcrumb("food_logging.ai_fix_success", {
    has_pending_review_id: hasPendingReviewId,
    original_calories: input.draft.calories,
    new_calories: calories,
    delta_calories: calories - input.draft.calories,
    vendor: corrected.vendor,
    model: corrected.model,
    latency_ms: corrected.latencyMs,
  });

  return {
    ok: true,
    draft: merged,
    explanation: corrected.explanation,
  };
}

// ─── Internal helpers ────────────────────────────────────────────────────────

type FailureReason = Exclude<CorrectMealDraftResult, { ok: true }>["reason"];

function mapEdgeErrorCode(code: string | undefined): FailureReason {
  switch (code) {
    case "UNAUTHORIZED":
      return "no_session";
    case "RATE_LIMITED":
      return "rate_limited";
    case "AI_UNAVAILABLE":
      return "ai_unavailable";
    case "AI_VENDOR_ERROR":
    case "AI_INVALID_JSON":
    case "AI_INVALID_RESULT":
      return "ai_error";
    case "BAD_REQUEST":
      return "validation";
    default:
      return "unknown";
  }
}

/**
 * Strip the draft to the minimal payload the edge function expects.
 * - Drops image bytes (we never have those client-side anyway).
 * - Drops anything not directly relevant to the correction prompt.
 * - Caps `estimatedItems` to 8 entries to keep the prompt bounded.
 */
function serialiseDraftForServer(draft: MealDraft): Record<string, unknown> {
  const items = draft.estimatedItems
    ? draft.estimatedItems.slice(0, 8).map((it) => ({
        matchedName: it.matchedName,
        nutrients: it.nutrients,
      }))
    : [];
  return {
    title: draft.title,
    calories: draft.calories,
    protein: draft.protein,
    carbs: draft.carbs,
    fat: draft.fat,
    estimatedItems: items,
  };
}
