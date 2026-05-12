/**
 * Meal Data Safety
 *
 * Single source of truth that decides whether a remote meal deletion is
 * allowed to be sent to Supabase. Designed to FAIL CLOSED:
 * if the safety state is ambiguous, deletes are blocked.
 *
 * Background:
 *   On 2026-04-29 12:03 UTC, 75 valid `meal_entries` rows for a single user
 *   were soft-deleted in a single batch immediately after sign-in. The trigger
 *   was a `useNutritionStore.subscribe` watcher that interpreted any local
 *   meal disappearance — including `resetMeals()` during account-switch —
 *   as user-intent delete and called `pushMealDelete()` for each missing id.
 *
 *   This module exists to make that class of bug structurally impossible:
 *   every code path that wants to delete a remote meal MUST consult
 *   `mealDataSafety.canDelete(userId)` first. If we are still hydrating,
 *   account-switching, or haven't completed cloud restore for `userId`, the
 *   delete is rejected and a `[MealDataSafety]` log explains why.
 *
 * Crash isolation:
 *   While `FOOD_LOG_SAFE_MODE` is on every method becomes a no-op so we
 *   never advance phase, never log `[MealDataSafety] markCloudRestoreComplete`,
 *   and `canDelete` returns `false` (FAIL CLOSED). All cloud-sync entry points
 *   are already gated separately, so this is defence in depth.
 */
import { FOOD_LOG_SAFE_MODE } from "../debug/safe-mode-flags";

type SafetyPhase =
  | "idle" // No user signed in, nothing to gate.
  | "account_switch" // User just changed; local stores being reset.
  | "cloud_restore" // Pulling remote data into local stores.
  | "ready"; // Cloud restore complete; explicit user deletes allowed.

interface SafetyState {
  phase: SafetyPhase;
  hasCloudRestoredForUser: string | null;
}

const state: SafetyState = {
  phase: "idle",
  hasCloudRestoredForUser: null,
};

function logSafety(event: string, details: Record<string, unknown>) {
  if (__DEV__) {
    console.log(`[MealDataSafety] ${event}`, {
      phase: state.phase,
      hasCloudRestoredForUser: state.hasCloudRestoredForUser,
      ...details,
    });
  }
}

function logSafeModeNoop(site: string, details?: Record<string, unknown>) {
  if (__DEV__) {
    console.log("[MealDataSafety] disabled_food_log_safe_mode", {
      site,
      ...(details ?? {}),
    });
  }
}

export const mealDataSafety = {
  /** Called by `useResetStoresOnUserChange` when a user identity change starts. */
  beginAccountSwitch(previousUserId: string | null, nextUserId: string | null) {
    if (FOOD_LOG_SAFE_MODE) {
      logSafeModeNoop("beginAccountSwitch", { previousUserId, nextUserId });
      return;
    }
    state.phase = "account_switch";
    state.hasCloudRestoredForUser = null;
    logSafety("beginAccountSwitch", { previousUserId, nextUserId });
  },

  /** Called by `useProgressSync` immediately before `restoreFromSupabase`. */
  beginCloudRestore(userId: string) {
    if (FOOD_LOG_SAFE_MODE) {
      logSafeModeNoop("beginCloudRestore", { userId });
      return;
    }
    state.phase = "cloud_restore";
    logSafety("beginCloudRestore", { userId });
  },

  /** Called by `useProgressSync` when `restoreFromSupabase` returns true. */
  markCloudRestoreComplete(userId: string) {
    if (FOOD_LOG_SAFE_MODE) {
      logSafeModeNoop("markCloudRestoreComplete", { userId });
      return;
    }
    state.phase = "ready";
    state.hasCloudRestoredForUser = userId;
    logSafety("markCloudRestoreComplete", { userId });
  },

  /** Called when sign-out happens — block all sync until next sign-in restore. */
  reset() {
    if (FOOD_LOG_SAFE_MODE) {
      logSafeModeNoop("reset");
      return;
    }
    state.phase = "idle";
    state.hasCloudRestoredForUser = null;
    logSafety("reset", {});
  },

  /**
   * The ONE function every delete-emitting call site must pass through.
   * Returns true ONLY if:
   *   - phase === "ready"
   *   - cloud restore has completed for `userId`
   * Otherwise returns false and logs why.
   *
   * In safe mode this always returns false — fail closed, since cloud sync
   * is disabled and we must never push a delete based on a frozen phase.
   */
  canDelete(userId: string, context: string): boolean {
    if (FOOD_LOG_SAFE_MODE) {
      logSafeModeNoop("canDelete", { userId, context });
      return false;
    }
    if (state.phase !== "ready") {
      logSafety("delete-blocked:not-ready", { context, userId });
      return false;
    }
    if (state.hasCloudRestoredForUser !== userId) {
      logSafety("delete-blocked:user-not-restored", {
        context,
        userId,
        restoredFor: state.hasCloudRestoredForUser,
      });
      return false;
    }
    return true;
  },

  /** Snapshot accessor (test/debug only). */
  getStateForTests(): SafetyState {
    return { ...state };
  },
};
