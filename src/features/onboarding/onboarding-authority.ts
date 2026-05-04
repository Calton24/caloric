/**
 * Onboarding Authority — server-authoritative onboarding status resolver.
 *
 * For authenticated users, the source of truth for "have they completed
 * onboarding?" is `user_profiles.onboarding_completed` in Supabase, NOT
 * the local persisted flag. The local flag is used only as a write-through
 * cache for speed; it must never decide routing on its own.
 *
 * Why?
 *   Cold-start race conditions, AsyncStorage rehydration, account switches,
 *   and persisted-state bleed-through across users have repeatedly produced
 *   the bug where an Apple/Google user lands back on the goal screen after
 *   force-quit, despite having completed onboarding. Making the server the
 *   sole authority eliminates an entire class of those failures.
 *
 * Three concrete states are surfaced to the routing layer:
 *   - "complete"   → row exists, onboarding_completed = true
 *   - "incomplete" → row exists, onboarding_completed = false (or null)
 *   - "missing"    → no row exists yet for this user (first social sign-in)
 *   - "error"      → query failed (network, RLS, 5xx). Caller MUST treat
 *                    this as "unknown" — show loading/retry, never route to
 *                    onboarding.
 */

import { getSupabaseClient } from "../../lib/supabase/client";
import { logColdStartStep } from "../../infrastructure/tracing/coldStartTrace";

export type OnboardingAuthorityStatus =
  | "complete"
  | "incomplete"
  | "missing"
  | "error";

/** Allowed onboarding_step checkpoint values. Mirrors the SQL CHECK. */
export type OnboardingStep =
  | "goal"
  | "body"
  | "activity"
  | "weight-goal"
  | "timeframe"
  | "calculating"
  | "plan"
  | "save-progress"
  | "paywall"
  | "complete";

const VALID_ONBOARDING_STEPS: ReadonlySet<string> = new Set<OnboardingStep>([
  "goal",
  "body",
  "activity",
  "weight-goal",
  "timeframe",
  "calculating",
  "plan",
  "save-progress",
  "paywall",
  "complete",
]);

export function isValidOnboardingStep(value: unknown): value is OnboardingStep {
  return typeof value === "string" && VALID_ONBOARDING_STEPS.has(value);
}

export interface OnboardingResolveResult {
  status: OnboardingAuthorityStatus;
  /** Server-side onboarding_completed value (only set when status is complete/incomplete). */
  onboardingCompleted: boolean | null;
  /** Server-side onboarding_step checkpoint (only set when row exists). */
  onboardingStep: OnboardingStep | null;
  /** Server-side updated_at (used as a freshness signal for the cache). */
  updatedAt: string | null;
  /** Underlying error if status === "error" (for logging only — never surface to UI). */
  error?: { code: string | null; message: string };
}

/**
 * Resolve a user's onboarding status using ONLY the server.
 *
 * - Uses the userId argument directly (no `auth.getUser()` round-trip — that
 *   call has historically returned null transiently right after session
 *   restore on cold start, which would have shown up here as a spurious
 *   "error" / "no-auth-user" state and forced the loading screen).
 * - Selects only the three columns the routing layer cares about. Less data,
 *   smaller surface area for transient column / RLS issues.
 * - Uses .maybeSingle() so a 0-row response is "missing", not an error.
 */
export async function resolveOnboardingStatus(
  userId: string
): Promise<OnboardingResolveResult> {
  if (!userId) {
    return {
      status: "error",
      onboardingCompleted: null,
      onboardingStep: null,
      updatedAt: null,
      error: { code: null, message: "no-userId" },
    };
  }

  if (__DEV__) {
    console.log("[OnboardingState] resolving", { userId });
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("user_profiles")
      .select("user_id, onboarding_completed, onboarding_step, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      const code = (error as { code?: string }).code ?? null;
      const message = error.message ?? String(error);
      if (__DEV__) {
        console.warn("[OnboardingState] resolved", {
          authUserId: userId,
          serverUserProfileFound: false,
          status: "error",
          code,
          message,
        });
      }
      logColdStartStep("onboarding_authority_resolved", {
        userId,
        status: "error",
        onboardingCompleted: null,
        onboardingStep: null,
        updatedAt: null,
        errorCode: code,
        errorMessage: message,
      });
      return {
        status: "error",
        onboardingCompleted: null,
        onboardingStep: null,
        updatedAt: null,
        error: { code, message },
      };
    }

    if (!data) {
      if (__DEV__) {
        console.log("[OnboardingState] resolved", {
          authUserId: userId,
          serverUserProfileFound: false,
          status: "missing",
        });
      }
      logColdStartStep("onboarding_authority_resolved", {
        userId,
        status: "missing",
        onboardingCompleted: null,
        onboardingStep: null,
        updatedAt: null,
      });
      return {
        status: "missing",
        onboardingCompleted: null,
        onboardingStep: null,
        updatedAt: null,
      };
    }

    const onboardingCompleted = data.onboarding_completed === true;
    const rawStep = data.onboarding_step;
    const onboardingStep: OnboardingStep | null = isValidOnboardingStep(rawStep)
      ? rawStep
      : null;
    const updatedAt =
      typeof data.updated_at === "string" ? data.updated_at : null;
    const status: OnboardingAuthorityStatus = onboardingCompleted
      ? "complete"
      : "incomplete";
    if (__DEV__) {
      console.log("[OnboardingState] resolved", {
        authUserId: userId,
        serverUserProfileFound: true,
        serverOnboardingCompleted: onboardingCompleted,
        serverOnboardingStep: onboardingStep,
        status,
        updatedAt,
      });
    }
    logColdStartStep("onboarding_authority_resolved", {
      userId,
      status,
      onboardingCompleted,
      onboardingStep,
      updatedAt,
    });
    return { status, onboardingCompleted, onboardingStep, updatedAt };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (__DEV__) {
      console.warn("[OnboardingState] resolved (threw)", {
        authUserId: userId,
        status: "error",
        message,
      });
    }
    logColdStartStep("onboarding_authority_resolved", {
      userId,
      status: "error",
      onboardingCompleted: null,
      onboardingStep: null,
      updatedAt: null,
      errorMessage: message,
      threw: true,
    });
    return {
      status: "error",
      onboardingCompleted: null,
      onboardingStep: null,
      updatedAt: null,
      error: { code: null, message },
    };
  }
}

/**
 * Insert a minimal user_profiles row for a brand-new authenticated user.
 *
 * Called when `resolveOnboardingStatus` returns `missing` so the next
 * resolve cycle reliably returns `incomplete` and the user proceeds into
 * the onboarding flow with a real DB-backed identity.
 *
 * onboarding_completed is explicitly false. updated_at is stamped.
 */
export async function createMissingProfileRow(userId: string): Promise<{
  ok: boolean;
  error?: { code: string | null; message: string };
}> {
  if (!userId) {
    return { ok: false, error: { code: null, message: "no-userId" } };
  }
  if (__DEV__) {
    console.log("[OnboardingAuthority] create_missing_profile_started", {
      userId,
    });
  }
  logColdStartStep("onboarding_authority_create_started", { userId });
  try {
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    const { error } = await client.from("user_profiles").insert({
      user_id: userId,
      onboarding_completed: false,
      onboarding_step: null,
      updated_at: now,
    });
    if (error) {
      const code = (error as { code?: string }).code ?? null;
      const message = error.message ?? String(error);
      // 23505 = unique_violation: someone else created the row in between
      // (e.g. race with a parallel sync path). Treat as success since the
      // row now exists.
      const isRace = code === "23505";
      if (__DEV__) {
        console.warn(
          isRace
            ? "[OnboardingAuthority] create_missing_profile race (existing row)"
            : "[OnboardingAuthority] create_missing_profile_failed",
          { userId, code, message }
        );
      }
      logColdStartStep("onboarding_authority_create_result", {
        userId,
        ok: isRace,
        code,
        message,
      });
      return isRace ? { ok: true } : { ok: false, error: { code, message } };
    }
    if (__DEV__) {
      console.log("[OnboardingAuthority] create_missing_profile_success", {
        userId,
      });
    }
    logColdStartStep("onboarding_authority_create_result", {
      userId,
      ok: true,
    });
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (__DEV__) {
      console.warn("[OnboardingAuthority] create_missing_profile threw", {
        userId,
        message,
      });
    }
    logColdStartStep("onboarding_authority_create_result", {
      userId,
      ok: false,
      message,
      threw: true,
    });
    return { ok: false, error: { code: null, message } };
  }
}

/**
 * Mark onboarding as complete on the server.
 *
 * The routing layer treats this write as the source of truth. Callers must
 * await the result and only navigate forward on `ok: true`. If the write
 * fails, the UI surfaces an error and stays on the completion screen — we
 * MUST NOT mark complete locally and quietly hope to retry, because that
 * is exactly how the original bug class was created.
 */
export async function markOnboardingCompleteRemote(
  userId: string
): Promise<{
  ok: boolean;
  updatedAt?: string;
  error?: { code: string | null; message: string };
}> {
  if (!userId) {
    return { ok: false, error: { code: null, message: "no-userId" } };
  }
  if (__DEV__) {
    console.log("[OnboardingState] completion_write_started", { userId });
  }
  logColdStartStep("onboarding_authority_completion_started", { userId });
  try {
    const client = getSupabaseClient();
    const updatedAt = new Date().toISOString();
    // First UPDATE existing row… clear the step checkpoint at the same
    // time so a future resume can never re-enter onboarding for a
    // completed user.
    const { data: updatedRows, error: updateError } = await client
      .from("user_profiles")
      .update({
        onboarding_completed: true,
        onboarding_step: null,
        updated_at: updatedAt,
      })
      .eq("user_id", userId)
      .select("user_id");
    if (updateError) {
      const code = (updateError as { code?: string }).code ?? null;
      const message = updateError.message ?? String(updateError);
      if (__DEV__) {
        console.warn("[OnboardingAuthority] completion_write_failed", {
          userId,
          code,
          message,
        });
      }
      logColdStartStep("onboarding_authority_completion_result", {
        userId,
        ok: false,
        code,
        message,
      });
      return { ok: false, error: { code, message } };
    }
    // …if no row updated, the user has no profile yet. INSERT one with
    // onboarding_completed=true so we don't end up in a "row missing"
    // state after the user already finished the flow.
    if (!updatedRows || updatedRows.length === 0) {
      const { error: insertError } = await client.from("user_profiles").insert({
        user_id: userId,
        onboarding_completed: true,
        onboarding_step: null,
        updated_at: updatedAt,
      });
      if (insertError) {
        const code = (insertError as { code?: string }).code ?? null;
        const message = insertError.message ?? String(insertError);
        // 23505 → row appeared between UPDATE and INSERT; retry UPDATE once.
        if (code === "23505") {
          const { error: retryError } = await client
            .from("user_profiles")
            .update({
              onboarding_completed: true,
              onboarding_step: null,
              updated_at: updatedAt,
            })
            .eq("user_id", userId);
          if (retryError) {
            const rcode = (retryError as { code?: string }).code ?? null;
            const rmessage = retryError.message ?? String(retryError);
            if (__DEV__) {
              console.warn("[OnboardingAuthority] completion_write_failed (retry)", {
                userId,
                code: rcode,
                message: rmessage,
              });
            }
            logColdStartStep("onboarding_authority_completion_result", {
              userId,
              ok: false,
              code: rcode,
              message: rmessage,
            });
            return { ok: false, error: { code: rcode, message: rmessage } };
          }
        } else {
          if (__DEV__) {
            console.warn("[OnboardingAuthority] completion_write_failed (insert)", {
              userId,
              code,
              message,
            });
          }
          logColdStartStep("onboarding_authority_completion_result", {
            userId,
            ok: false,
            code,
            message,
          });
          return { ok: false, error: { code, message } };
        }
      }
    }
    if (__DEV__) {
      console.log("[OnboardingAuthority] completion_write_success", {
        userId,
        updatedAt,
      });
    }
    logColdStartStep("onboarding_authority_completion_result", {
      userId,
      ok: true,
      updatedAt,
    });
    return { ok: true, updatedAt };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (__DEV__) {
      console.warn("[OnboardingAuthority] completion_write threw", {
        userId,
        message,
      });
    }
    logColdStartStep("onboarding_authority_completion_result", {
      userId,
      ok: false,
      message,
      threw: true,
    });
    return { ok: false, error: { code: null, message } };
  }
}

/**
 * Write the user's current incomplete-onboarding checkpoint.
 *
 * Called whenever the user advances to a new onboarding screen so that
 * a force-quit + reopen resumes them at the same step instead of
 * snapping back to /goal.
 *
 * Behaviour notes:
 *   - This is a write-through cache; failures are NOT propagated to the
 *     UI as errors. The user can keep navigating; we'll re-attempt on the
 *     next step. Routing falls back to /goal if the checkpoint never
 *     lands.
 *   - We UPDATE the existing row. We do not INSERT here — that is the
 *     job of the resolver's missing-row recovery path. If no row exists
 *     yet, the UPDATE is a no-op and the resolver will create the row
 *     on its next pass.
 */
export async function setOnboardingStepRemote(
  userId: string,
  step: OnboardingStep
): Promise<{ ok: boolean; error?: { code: string | null; message: string } }> {
  if (!userId) {
    return { ok: false, error: { code: null, message: "no-userId" } };
  }
  if (!isValidOnboardingStep(step)) {
    return {
      ok: false,
      error: { code: null, message: `invalid-step:${step}` },
    };
  }
  if (__DEV__) {
    console.log("[OnboardingState] step_write_started", { userId, step });
  }
  try {
    const client = getSupabaseClient();
    const updatedAt = new Date().toISOString();
    const { error } = await client
      .from("user_profiles")
      .update({ onboarding_step: step, updated_at: updatedAt })
      .eq("user_id", userId);
    if (error) {
      const code = (error as { code?: string }).code ?? null;
      const message = error.message ?? String(error);
      if (__DEV__) {
        console.warn("[OnboardingState] step_write_failed", {
          userId,
          step,
          code,
          message,
        });
      }
      return { ok: false, error: { code, message } };
    }
    if (__DEV__) {
      console.log("[OnboardingState] step_write_success", {
        userId,
        step,
        updatedAt,
      });
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (__DEV__) {
      console.warn("[OnboardingState] step_write threw", {
        userId,
        step,
        message,
      });
    }
    return { ok: false, error: { code: null, message } };
  }
}
