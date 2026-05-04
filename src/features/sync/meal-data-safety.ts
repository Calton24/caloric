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
 */

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

export const mealDataSafety = {
  /** Called by `useResetStoresOnUserChange` when a user identity change starts. */
  beginAccountSwitch(previousUserId: string | null, nextUserId: string | null) {
    state.phase = "account_switch";
    state.hasCloudRestoredForUser = null;
    logSafety("beginAccountSwitch", { previousUserId, nextUserId });
  },

  /** Called by `useProgressSync` immediately before `restoreFromSupabase`. */
  beginCloudRestore(userId: string) {
    state.phase = "cloud_restore";
    logSafety("beginCloudRestore", { userId });
  },

  /** Called by `useProgressSync` when `restoreFromSupabase` returns true. */
  markCloudRestoreComplete(userId: string) {
    state.phase = "ready";
    state.hasCloudRestoredForUser = userId;
    logSafety("markCloudRestoreComplete", { userId });
  },

  /** Called when sign-out happens — block all sync until next sign-in restore. */
  reset() {
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
   */
  canDelete(userId: string, context: string): boolean {
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
