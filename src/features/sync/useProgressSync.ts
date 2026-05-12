/**
 * useProgressSync
 *
 * React hook that:
 *   1. On auth login → restores data from Supabase into local stores
 *   2. On auth login → pushes any local-only data to Supabase
 *   3. Subscribes to store mutations → pushes changes to Supabase in background
 *   4. Records streak on every meal log
 *
 * Mount once in the app root (CalCutProviders or _layout).
 */

import { useEffect, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
  FOOD_LOG_SAFE_MODE,
  assertFoodLogSafeModeImport,
} from "../debug/safe-mode-flags";

assertFoodLogSafeModeImport("cloud_hydration");
import { reportError } from "../../infrastructure/errorReporting";
import { addFoodLoggingBreadcrumb } from "../../infrastructure/errorReporting/foodLoggingErrors";
import { logColdStartStep } from "../../infrastructure/tracing/coldStartTrace";
import { useAuth } from "../auth/useAuth";
import {
  reconcileDeferredPendingReviewLinks,
  replayPendingReviewOutbox,
} from "../food-logging/pending-review.service";
import {
  DISABLE_POST_SAVE_CLOUD_SYNC,
  DISABLE_POST_SAVE_STREAK_RECOMPUTE,
} from "../food-logging/post-save-debug-flags";
import { useChallengeStore } from "../challenge/challenge.store";
import {
    createChallenge,
    pullChallenge,
    pushChallenge,
} from "../challenge/challenge.sync";
import { useGoalsStore } from "../goals/goals.store";
import { useNutritionStore } from "../nutrition/nutrition.store";
import type { MealEntry } from "../nutrition/nutrition.types";
import { useProfileStore } from "../profile/profile.store";
import { useProgressStore } from "../progress/progress.store";
import { computeLocalStreakFromStores } from "../streak/compute-local-streak";
import { recomputeStreakAfterMealListChange } from "../streak/recompute-streak-after-meal-list-change";
import { fetchStreak, recordMealLogged } from "../streak/streak.service";
import { useStreakStore } from "../streak/streak.store";
import { isPostFoodLogSettling } from "../food-logging/post-food-log-settling";
import { hydrateNutritionStoreMealsFromLocalRepository } from "../food-logging/meal-store-hydration";
import { deletePersistedMeal } from "../food-logging/repositories/meal.repository";
import {
    pushAllToSupabase,
    pushGoals,
    pushMeal,
    pushMealDelete,
    pushMealUpdate,
    pushProfile,
    pushWeightLog,
    restoreFromSupabase,
} from "./sync.service";
import { useSyncReadyStore } from "./sync-ready.store";
import { mealDataSafety } from "./meal-data-safety";

const deferredMealUploads: { meal: MealEntry; userId: string }[] = [];

/** Bounded automatic retries when `restoreFromSupabase` fails or throws mid-login. */
const MAX_CLOUD_RESTORE_ATTEMPTS = 8;

/**
 * Meal pushes skipped during post–food-log settling; flush after apply completes.
 */
export function flushDeferredMealUploads(userId: string | null | undefined) {
  if (!userId) return;
  const batch = deferredMealUploads.splice(0);
  const seen = new Set<string>();
  for (const { meal, userId: uid } of batch) {
    if (uid !== userId) continue;
    if (seen.has(meal.id)) continue;
    seen.add(meal.id);
    if (!DISABLE_POST_SAVE_CLOUD_SYNC) {
      pushMeal(meal, uid);
      recordMealLogged(meal.calories, new Date(meal.loggedAt)).catch(() => {});
    }
  }
}

export function useProgressSync(): void {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id;
  const hasRestoredRef = useRef<string | null>(null);
  const restoreInFlightForUserRef = useRef<string | null>(null);
  /** Latest signed-in user id — async restore completions must no-op if this moved on. */
  const latestSignedInUserIdRef = useRef<string | undefined>(undefined);
  const cloudRestoreFailureStreakRef = useRef(0);
  const cloudRestoreLastUserIdRef = useRef<string | undefined>(undefined);
  const [cloudRestoreRetryNonce, setCloudRestoreRetryNonce] = useState(0);
  const isHydratingFromRemoteRef = useRef(false);
  const suppressUploadUntilHydratedRef = useRef(true);
  const lastAppliedRemoteProfileUpdatedAtRef = useRef<string | null>(null);

  /**
   * Meals are persisted in the meal repository, not in Zustand partialize.
   * After hot reload the nutrition store rehydrates with meals=[] — reload
   * from AsyncStorage whenever we have a user id (including when cloud
   * restore is skipped because hasRestoredRef already matches).
   */
  useEffect(() => {
    if (!userId || authLoading) return;
    let cancelled = false;
    const run = async () => {
      if (!useNutritionStore.persist.hasHydrated()) {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 2000);
          useNutritionStore.persist.onFinishHydration(() => {
            clearTimeout(timer);
            resolve();
          });
        });
      }
      if (cancelled) return;
      try {
        await hydrateNutritionStoreMealsFromLocalRepository(userId);
      } catch {
        /* non-fatal */
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [userId, authLoading]);

  // ── Compute streak from local meals ──
  // Wait for BOTH nutrition and streak stores to finish hydrating from
  // AsyncStorage before computing. Then subscribe to meal changes so the
  // streak stays in sync when meals are added, removed, or restored from
  // Supabase.
  useEffect(() => {
    if (FOOD_LOG_SAFE_MODE) return;
    let cancelled = false;
    let debounceId: ReturnType<typeof setTimeout> | null = null;
    const STREAK_RECOMPUTE_DEBOUNCE_MS = 150;

    const runCompute = () => {
      if (cancelled) return;
      const meals = useNutritionStore.getState().meals;
      if (meals.length > 0) {
        computeLocalStreakFromStores({ force: true });
      }
    };

    const scheduleRecompute = () => {
      if (cancelled || DISABLE_POST_SAVE_STREAK_RECOMPUTE) return;
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(() => {
        debounceId = null;
        runCompute();
      }, STREAK_RECOMPUTE_DEBOUNCE_MS);
    };

    const recomputeImmediate = () => {
      if (cancelled || DISABLE_POST_SAVE_STREAK_RECOMPUTE) return;
      runCompute();
    };

    const recomputeDebounced = () => {
      if (cancelled || DISABLE_POST_SAVE_STREAK_RECOMPUTE) return;
      scheduleRecompute();
    };

    // Wait for both persisted stores to finish hydrating.
    // persist.hasHydrated() returns true if already done (common on
    // hot reload). persist.onFinishHydration registers a callback
    // for when hydration completes in the future.
    const nutritionPersist = useNutritionStore.persist;
    const streakPersist = useStreakStore.persist;

    let nutritionReady = nutritionPersist.hasHydrated();
    let streakReady = streakPersist.hasHydrated();

    const tryCompute = () => {
      if (nutritionReady && streakReady && !cancelled) {
        recomputeImmediate();
      }
    };

    if (!nutritionReady) {
      nutritionPersist.onFinishHydration(() => {
        nutritionReady = true;
        tryCompute();
      });
    }
    if (!streakReady) {
      streakPersist.onFinishHydration(() => {
        streakReady = true;
        tryCompute();
      });
    }

    // If both already hydrated (e.g. hot reload), compute now
    tryCompute();

    // Recompute whenever meals change (restore, add, delete) — debounced
    const unsub = useNutritionStore.subscribe(recomputeDebounced);

    // Safety-net: one immediate recompute after delay
    const safetyTimer = setTimeout(recomputeImmediate, 2000);

    return () => {
      cancelled = true;
      if (debounceId) clearTimeout(debounceId);
      unsub();
      clearTimeout(safetyTimer);
    };
  }, []);

  // ── On login: restore from Supabase + push local data ──
  useEffect(() => {
    // Bootstrap: session not loaded yet — never run signed-out teardown.
    if (authLoading && userId == null) {
      if (__DEV__) {
        console.log("[AuthCleanupDecision]", {
          area: "sync",
          authBootstrapReady: false,
          authLoading: true,
          hasSession: false,
          userId: null,
          didClear: false,
          reason: "defer_teardown_until_auth_resolves",
        });
      }
      return;
    }

    if (!userId) {
      hasRestoredRef.current = null;
      latestSignedInUserIdRef.current = undefined;
      restoreInFlightForUserRef.current = null;
      isHydratingFromRemoteRef.current = false;
      suppressUploadUntilHydratedRef.current = true;
      mealDataSafety.reset();
      useSyncReadyStore.getState().resetSyncReady();
      if (__DEV__) {
        console.log("[AuthCleanupDecision]", {
          area: "sync",
          authBootstrapReady: true,
          authLoading: false,
          hasSession: false,
          userId: null,
          didClear: true,
          reason: "signed_out_confirmed_teardown",
        });
        console.log("[DataLossAudit] auth-cleared", {
          userId: "anonymous",
          pushAllToSupabaseCalled: false,
        });
      }
      return;
    }

    if (FOOD_LOG_SAFE_MODE) {
      // Safe mode gates dangerous post-log side effects (Apple Health, Live
      // Activities, analytics, haptics) but must NOT skip cloud restore.
      // Skipping restore while still calling markSyncRestored creates a false
      // "restored" signal — the routing gate opens but local stores are empty,
      // leaving users with 0 meals and wrong weight even though the server has
      // their data. Cloud restore is read-only and safe to run always.
      //
      // If this path is ever reached (FOOD_LOG_SAFE_MODE flipped back on),
      // fall through to the normal restore path below instead of returning.
      if (__DEV__) {
        console.warn(
          "[CloudHydration] FOOD_LOG_SAFE_MODE is on — cloud restore will still run. " +
            "Safe mode must not block read-only restore."
        );
      }
      // intentional fall-through: do NOT return here
    }

    // Reset failure streak when the signed-in account changes.
    if (cloudRestoreLastUserIdRef.current !== userId) {
      cloudRestoreFailureStreakRef.current = 0;
      cloudRestoreLastUserIdRef.current = userId;
    }
    latestSignedInUserIdRef.current = userId;

    // Only skip after a *successful* cloud merge for this user. (Previously
    // we set this ref before the async restore finished, so a failed restore
    // could never retry and left hydration flags stuck.)
    if (hasRestoredRef.current === userId) return;

    // Do not stack duplicate restores for the same user. A restore for another
    // user may still be in flight; it no-ops on completion via
    // latestSignedInUserIdRef.
    if (restoreInFlightForUserRef.current === userId) return;

    restoreInFlightForUserRef.current = userId;
    isHydratingFromRemoteRef.current = true;
    suppressUploadUntilHydratedRef.current = true;

    const restoreForUserId = userId;

    const scheduleCloudRestoreRetry = (reason: string) => {
      cloudRestoreFailureStreakRef.current += 1;
      const failures = cloudRestoreFailureStreakRef.current;
      if (failures >= MAX_CLOUD_RESTORE_ATTEMPTS) {
        if (__DEV__) {
          console.warn("[CloudHydration] restore abandoned after max attempts", {
            userId: restoreForUserId,
            reason,
            failures,
          });
        }
        mealDataSafety.reset();
        isHydratingFromRemoteRef.current = false;
        suppressUploadUntilHydratedRef.current = false;
        return;
      }
      const delayMs = Math.min(32_000, 800 * 2 ** (failures - 1));
      if (__DEV__) {
        console.warn("[CloudHydration] scheduling cloud restore retry", {
          userId: restoreForUserId,
          reason,
          failures,
          delayMs,
        });
      }
      setTimeout(() => {
        if (latestSignedInUserIdRef.current !== restoreForUserId) return;
        if (hasRestoredRef.current === restoreForUserId) return;
        setCloudRestoreRetryNonce((n) => n + 1);
      }, delayMs);
    };

    (async () => {
      try {
        if (__DEV__) {
          console.log("[CloudHydration] auth-context", {
            userIdFromAuthContext: restoreForUserId,
          });
        }
        // Wait for AsyncStorage hydration of persisted stores to finish before
        // pulling from the server. This closes a race where:
        //   1. useProgressSync fires (userId changed)
        //   2. restoreFromSupabase runs, writes server meals to the store
        //   3. AsyncStorage hydration completes and overwrites the store with
        //      the (empty on fresh install) persisted state
        //
        // Waiting here is safe: on typical devices hydration completes in <5 ms
        // (the value is already in memory by the time effects fire). We cap the
        // wait at 2 s to avoid hanging if AsyncStorage is broken.
        if (!useNutritionStore.persist.hasHydrated()) {
          if (__DEV__) {
            console.log(
              "[CloudHydration] useProgressSync: waiting for local hydration..."
            );
          }
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, 2000);
            useNutritionStore.persist.onFinishHydration(() => {
              clearTimeout(timer);
              resolve();
            });
          });
        }

        if (latestSignedInUserIdRef.current !== restoreForUserId) {
          return;
        }

        if (__DEV__) {
          console.log("[DataLossAudit] hydration:start", {
            userId: restoreForUserId,
            trigger: "user-change",
            localMealsBeforeResetAware: useNutritionStore.getState().meals.length,
            deletedMealIdsCount: useNutritionStore.getState().deletedMealIds.length,
            isHydratingFromRemote: true,
            suppressUploadUntilHydrated: true,
          });
        }

        try {
          await hydrateNutritionStoreMealsFromLocalRepository(restoreForUserId);
        } catch {
          /* non-fatal: restore still runs with whatever is in memory */
        }

        if (latestSignedInUserIdRef.current !== restoreForUserId) {
          return;
        }

        // ORDER MATTERS. Pull and reconcile first, push second.
        //
        // The opposite order silently resurrects deletes done on another
        // device: if Device A deleted a meal that's still cached locally
        // here, pushing first would upsert the cached copy back onto the
        // server, undoing Device A's intent. Pulling first lets
        // `reconcileWithServer` drop the locally-cached meal, after which
        // the push only uploads things that genuinely need to exist.
        //
        // Pass userId directly so restoreFromSupabase doesn't need to
        // re-validate the JWT via supabase.auth.getUser() — avoiding a
        // transient race where getUser() returns null right after sign-in.
        mealDataSafety.beginCloudRestore(restoreForUserId);
        const profileBeforeRestore = useProfileStore.getState().profile;
        logColdStartStep("profile_store_before_restore", {
          userId: restoreForUserId,
          localProfileId: profileBeforeRestore.id,
          localOnboardingCompleted: profileBeforeRestore.onboardingCompleted,
          localUpdatedAt: profileBeforeRestore.updatedAt,
        });
        const hydrationResult = await restoreFromSupabase(
          restoreForUserId,
          "login"
        );

        if (latestSignedInUserIdRef.current !== restoreForUserId) {
          return;
        }

        if (!hydrationResult.ok) {
          if (__DEV__) {
            console.warn(
              "[CloudHydration] restore failed; checking local profile ownership",
              {
                userId: restoreForUserId,
                reason: hydrationResult.reason,
              }
            );
          }
          // Restore failed (no user / unexpected exception) — but if the
          // locally persisted profile already belongs to this user, we can
          // trust it for routing. This prevents the user being stuck on a
          // loading screen while offline.
          const localProfileId = useProfileStore.getState().profile.id;
          const localProfile = useProfileStore.getState().profile;
          if (localProfileId === restoreForUserId) {
            if (__DEV__) {
              console.log(
                "[ProfileHydration] restore failed but local profile matches user — allowing routing",
                {
                  userId: restoreForUserId,
                  onboardingCompleted: localProfile.onboardingCompleted,
                }
              );
            }
            useSyncReadyStore.getState().markSyncRestored(restoreForUserId);
            useSyncReadyStore.getState().markProfileConfirmed(restoreForUserId);
          }
          logColdStartStep("profile_store_after_restore", {
            userId: restoreForUserId,
            localProfileId: localProfile.id,
            localOnboardingCompleted: localProfile.onboardingCompleted,
            localUpdatedAt: localProfile.updatedAt,
            profileConfirmedFor: useSyncReadyStore.getState().profileConfirmedFor,
            syncRestoredFor: useSyncReadyStore.getState().syncRestoredFor,
            hydrationReason: hydrationResult.reason,
            hydrationOk: false,
          });
          mealDataSafety.reset();
          isHydratingFromRemoteRef.current = false;
          suppressUploadUntilHydratedRef.current = true;
          scheduleCloudRestoreRetry(hydrationResult.reason);
          return;
        }

        if (__DEV__) {
          console.log("[DataLossAudit] hydration:restore-complete", {
            userId: restoreForUserId,
            remoteRowsFetchedCount: useNutritionStore.getState().meals.length,
            deletedMealIdsCount: useNutritionStore.getState().deletedMealIds.length,
          });
        }

        // Signal that the initial server restore is done for this user.
        // app/index.tsx waits for this before routing authenticated users,
        // preventing the onboardingCompleted default (false) from causing
        // a redirect to /(onboarding)/goal before the real profile loads.
        useSyncReadyStore.getState().markSyncRestored(restoreForUserId);

        // Confirm that the profile store now holds data verified for this user.
        // We confirm if EITHER:
        //   - profileResolved=true: pullProfile returned `found` or we created
        //     a new row. The local profile reflects authoritative state.
        //   - profileResolved=false BUT local profile.id === userId: pull
        //     errored transiently, but the persisted profile already belongs
        //     to this user, so trusting it is safe and prevents lockout.
        //
        // If neither condition holds (fetch_error AND profile.id mismatch),
        // we deliberately leave profileConfirmedFor=null so the routing guard
        // keeps showing the loading state instead of routing to onboarding
        // based on potentially-stale defaults.
        const localProfileIdAfterRestore = useProfileStore.getState().profile.id;
        const profileBelongsToUser = localProfileIdAfterRestore === restoreForUserId;
        if (hydrationResult.profileResolved || profileBelongsToUser) {
          useSyncReadyStore.getState().markProfileConfirmed(restoreForUserId);
        } else if (__DEV__) {
          console.warn(
            "[ProfileHydration] profile NOT confirmed — fetch errored and local profile.id mismatches",
            {
              userId: restoreForUserId,
              localProfileId: localProfileIdAfterRestore,
              hydrationResult,
            }
          );
        }
        const profileAfterRestore = useProfileStore.getState().profile;
        logColdStartStep("profile_store_after_restore", {
          userId: restoreForUserId,
          localProfileId: profileAfterRestore.id,
          localOnboardingCompleted: profileAfterRestore.onboardingCompleted,
          localUpdatedAt: profileAfterRestore.updatedAt,
          profileConfirmedFor: useSyncReadyStore.getState().profileConfirmedFor,
          syncRestoredFor: useSyncReadyStore.getState().syncRestoredFor,
          hydrationReason: hydrationResult.reason,
          hydrationProfileResolved: hydrationResult.profileResolved,
        });
        // Replay any locally-added meals (and other state) that the server
        // doesn't know about yet, e.g. logged while offline.
        //
        // This upload is suppressed for the common fresh-login case where
        // meals = [] after store reset — the `if (meals.length > 0)` guard
        // in pushAllToSupabase prevents overwriting remote data with an
        // empty store.
        await pushAllToSupabase({
          knownUserId: restoreForUserId,
          suppressMealUpserts: true,
          suppressTombstoneReplay: true,
          reason: "initial_hydration",
        });

        if (latestSignedInUserIdRef.current !== restoreForUserId) {
          return;
        }

        // Cloud restore + idempotent push completed for this user. Only NOW
        // are explicit user deletes allowed to flow back to Supabase.
        mealDataSafety.markCloudRestoreComplete(restoreForUserId);
        cloudRestoreFailureStreakRef.current = 0;
        hasRestoredRef.current = restoreForUserId;

        lastAppliedRemoteProfileUpdatedAtRef.current =
          useProfileStore.getState().profile.updatedAt;
        isHydratingFromRemoteRef.current = false;
        suppressUploadUntilHydratedRef.current = false;
        flushDeferredMealUploads(restoreForUserId);
        // Re-derive streak from the now-merged local+remote meals.
        // Local meals are the authoritative source after restore.
        computeLocalStreakFromStores({ force: true });
        // Also fetch server streak and call RPC to ensure cloud is up-to-date.
        // If the server knows a higher streak (e.g. from another device), adopt it.
        fetchStreak()
          .then((serverStreak) => {
            const local = useStreakStore.getState();
            if (serverStreak.currentStreak > local.currentStreak) {
              useStreakStore.getState().setStreak(serverStreak);
            }
          })
          .catch((err) => {
            // Streak fetch is non-critical; breadcrumb only.
            reportError(err, {
              area: "sync",
              action: "useProgressSync_fetchStreak",
              level: "warning",
              userId: restoreForUserId,
            });
          });

        // Restore challenge: remote wins (server is source of truth after login)
        const remoteChallenge = await pullChallenge();
        if (remoteChallenge) {
          useChallengeStore.getState().setChallenge(remoteChallenge);
        } else {
          // If we have a local challenge that hasn't been pushed yet, push it now
          const localChallenge = useChallengeStore.getState().challenge;
          if (localChallenge) {
            createChallenge(localChallenge);
          }
        }
      } catch (err) {
        if (latestSignedInUserIdRef.current !== restoreForUserId) {
          return;
        }
        isHydratingFromRemoteRef.current = false;
        if (hasRestoredRef.current === restoreForUserId) {
          // Meals/profile were already merged and delete-safety flipped on;
          // only non-critical follow-up (e.g. challenge) failed.
          suppressUploadUntilHydratedRef.current = false;
          reportError(err, {
            area: "sync",
            action: "useProgressSync_loginRestore_post_commit",
            userId: restoreForUserId,
          });
          return;
        }
        suppressUploadUntilHydratedRef.current = true;
        const localProfileId = useProfileStore.getState().profile.id;
        if (localProfileId === restoreForUserId) {
          useSyncReadyStore.getState().markSyncRestored(restoreForUserId);
          useSyncReadyStore.getState().markProfileConfirmed(restoreForUserId);
        }
        mealDataSafety.reset();
        scheduleCloudRestoreRetry("exception");
        // Orchestration-level failure during login restore/push.
        // restoreFromSupabase / pushAllToSupabase already report their own
        // canonical failures, so this catch only fires for unexpected throws
        // (e.g. challenge sync, fetchStreak setup) that escape inner handlers.
        reportError(err, {
          area: "sync",
          action: "useProgressSync_loginRestore",
          userId: restoreForUserId,
        });
      } finally {
        if (restoreInFlightForUserRef.current === restoreForUserId) {
          restoreInFlightForUserRef.current = null;
        }
      }
    })();
  }, [userId, authLoading, cloudRestoreRetryNonce]);

  // If cloud restore never reached `hasRestoredRef` (exhausted retries, flaky
  // network, or auth race), try again when the app becomes active — throttled
  // so a misconfigured backend cannot tight-loop.
  useEffect(() => {
    if (FOOD_LOG_SAFE_MODE) return;
    if (!userId || authLoading) return;

    const lastKickAtRef = { current: 0 };
    const KICK_THROTTLE_MS = 5 * 60 * 1000;

    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next !== "active") return;
      if (latestSignedInUserIdRef.current !== userId) return;
      if (hasRestoredRef.current === userId) return;
      if (restoreInFlightForUserRef.current === userId) return;

      const now = Date.now();
      if (now - lastKickAtRef.current < KICK_THROTTLE_MS) return;
      lastKickAtRef.current = now;

      cloudRestoreFailureStreakRef.current = 0;
      setCloudRestoreRetryNonce((n) => n + 1);
    });

    return () => sub.remove();
  }, [userId, authLoading]);

  // ── Subscribe to meal changes → push to Supabase ──
  useEffect(() => {
    if (FOOD_LOG_SAFE_MODE) return;
    if (!userId) return;

    let prevMeals = useNutritionStore.getState().meals;
    let prevDeletedMealIds = useNutritionStore.getState().deletedMealIds;

    const unsub = useNutritionStore.subscribe((state) => {
      const nextMeals = state.meals;
      if (nextMeals === prevMeals) return;

      if (suppressUploadUntilHydratedRef.current) {
        if (__DEV__) {
          console.log("[DataLossAudit] upload-suppressed", {
            userId,
            reason: isHydratingFromRemoteRef.current
              ? "remote_hydration_in_progress"
              : "upload_gate_enabled",
            localMealsCount: nextMeals.length,
            deletedMealIdsCount: state.deletedMealIds.length,
            pushAllToSupabaseCalled: false,
          });
        }
        const prevIdsSuppressed = new Set(prevMeals.map((m) => m.id));
        const addedDuringSuppress = nextMeals.filter(
          (m) => !prevIdsSuppressed.has(m.id)
        );
        if (!DISABLE_POST_SAVE_CLOUD_SYNC) {
          for (const meal of addedDuringSuppress) {
            deferredMealUploads.push({ meal, userId });
            if (__DEV__) {
              console.log(
                "[Sync] pushMeal deferred (upload suppressed during hydration)",
                { meal_id: meal.id }
              );
            }
          }
        }
        if (!DISABLE_POST_SAVE_STREAK_RECOMPUTE) {
          recomputeStreakAfterMealListChange(
            "meal_list_changed_while_upload_suppressed"
          );
        }
        prevMeals = nextMeals;
        prevDeletedMealIds = state.deletedMealIds;
        return;
      }

      // Detect added meals
      const prevIds = new Set(prevMeals.map((m) => m.id));
      const added = nextMeals.filter((m) => !prevIds.has(m.id));
      if (!DISABLE_POST_SAVE_CLOUD_SYNC) {
        for (const meal of added) {
          addFoodLoggingBreadcrumb("food_logging.remote_sync_started", {
            meal_id: meal.id,
          });
          if (isPostFoodLogSettling()) {
            deferredMealUploads.push({ meal, userId });
            if (__DEV__) {
              console.log("[Sync] pushMeal deferred (post-food-log settling)", {
                meal_id: meal.id,
              });
            }
          } else {
            pushMeal(meal, userId);
            recordMealLogged(meal.calories, new Date(meal.loggedAt)).catch(
              () => {}
            );
          }
        }
      }
      if (added.length > 0 && !DISABLE_POST_SAVE_STREAK_RECOMPUTE) {
        computeLocalStreakFromStores({ force: true });
      }

      // Detect removed meals locally for streak only. We DO NOT treat
      // disappearance from `meals` as delete intent, because account reset /
      // hydration can clear local state and that must never soft-delete cloud
      // rows. Cloud deletes are driven exclusively by explicit tombstones
      // (`deletedMealIds`) created by removeMeal/clearMealsForDate.
      const nextIds = new Set(nextMeals.map((m) => m.id));
      const removed = prevMeals.filter((m) => !nextIds.has(m.id));
      if (removed.length > 0 && !DISABLE_POST_SAVE_STREAK_RECOMPUTE) {
        computeLocalStreakFromStores({ force: true });
      }

      // Detect newly added tombstones and push only those deletions.
      const prevDeletedSet = new Set(prevDeletedMealIds);
      const tombstonesAdded = state.deletedMealIds.filter(
        (id) => !prevDeletedSet.has(id)
      );
      for (const mealId of tombstonesAdded) {
        void deletePersistedMeal(userId, mealId).catch(() => {
          // Non-fatal: tombstone still prevents resurrection in runtime merges.
        });
        if (!DISABLE_POST_SAVE_CLOUD_SYNC) {
          pushMealDelete(mealId, userId);
        }
      }

      // Detect updated meals
      const prevMap = new Map<string, MealEntry>(
        prevMeals.map((m) => [m.id, m])
      );
      if (!DISABLE_POST_SAVE_CLOUD_SYNC) {
        for (const meal of nextMeals) {
          const prev = prevMap.get(meal.id);
          if (prev && prev !== meal) {
            pushMealUpdate(meal.id, meal, userId);
          }
        }
      }

      prevMeals = nextMeals;
      prevDeletedMealIds = state.deletedMealIds;
    });

    return unsub;
  }, [userId]);

  // ── Subscribe to weight log changes → push to Supabase ──
  useEffect(() => {
    if (FOOD_LOG_SAFE_MODE) return;
    if (!userId) return;

    let prevLogs = useProgressStore.getState().weightLogs;

    const unsub = useProgressStore.subscribe((state) => {
      const nextLogs = state.weightLogs;
      if (nextLogs === prevLogs) return;

      const prevIds = new Set(prevLogs.map((l) => l.id));
      const added = nextLogs.filter((l) => !prevIds.has(l.id));
      for (const log of added) {
        pushWeightLog(log);
      }

      // Detect updated logs
      const prevMap = new Map(prevLogs.map((l) => [l.id, l]));
      for (const log of nextLogs) {
        const prev = prevMap.get(log.id);
        if (prev && prev.weightLbs !== log.weightLbs) {
          pushWeightLog(log);
        }
      }

      prevLogs = nextLogs;
    });

    return unsub;
  }, [userId]);

  // ── Subscribe to goal changes → push to Supabase ──
  useEffect(() => {
    if (FOOD_LOG_SAFE_MODE) return;
    if (!userId) return;

    let prevPlan = useGoalsStore.getState().plan;

    const unsub = useGoalsStore.subscribe((state) => {
      if (state.plan === prevPlan) return;
      prevPlan = state.plan;

      if (state.plan) {
        pushGoals(state.goalType, state.plan, state.timeframeWeeks);
      }
    });

    return unsub;
  }, [userId]);

  // ── Subscribe to profile changes → push to Supabase ──
  useEffect(() => {
    if (FOOD_LOG_SAFE_MODE) return;
    if (!userId) return;

    let prevProfile = useProfileStore.getState().profile;

    const unsub = useProfileStore.subscribe((state) => {
      if (state.profile === prevProfile) return;
      const nextProfile = state.profile;
      const previousUnit = prevProfile.weightUnit;
      const nextUnit = nextProfile.weightUnit;
      const nextUpdatedAt = nextProfile.updatedAt;
      prevProfile = nextProfile;

      // If the profile change was just applied from remote restore and carries
      // the same updatedAt, skip re-upserting to avoid a no-op loop.
      if (
        nextUpdatedAt &&
        nextUpdatedAt === lastAppliedRemoteProfileUpdatedAtRef.current
      ) {
        if (__DEV__) {
          console.log("[UnitsPersistence] remote skipped", {
            userId,
            previousUnit,
            nextUnit,
            source: "remote",
            reason: "already-applied-remote-version",
          });
        }
        return;
      }
      if (__DEV__ && previousUnit !== nextUnit) {
        console.log("[UnitsPersistence] remote upsert started", {
          userId,
          previousUnit,
          nextUnit,
          source: "local",
        });
      }
      pushProfile(nextProfile).then((result) => {
        if (!__DEV__ || previousUnit === nextUnit) return;
        if (result.ok) {
          console.log("[UnitsPersistence] remote upsert success", {
            userId,
            previousUnit,
            nextUnit,
            source: "local",
          });
        } else {
          console.log("[UnitsPersistence] remote skipped", {
            userId,
            previousUnit,
            nextUnit,
            source: "local",
            reason: "upsert-failed",
          });
        }
      });
    });

    return unsub;
  }, [userId]);

  // ── Subscribe to challenge changes → push to Supabase ──
  useEffect(() => {
    if (FOOD_LOG_SAFE_MODE) return;
    if (!userId) return;

    let prevChallenge = useChallengeStore.getState().challenge;

    const unsub = useChallengeStore.subscribe((state) => {
      const next = state.challenge;
      if (next === prevChallenge) return;
      prevChallenge = next;
      if (next) {
        pushChallenge(next);
      }
    });

    return unsub;
  }, [userId]);

  // ── Pending-review outbox: foreground replay ──
  // Triggers replay every time the app returns to foreground so any
  // dismiss/save/upsert that happened offline gets reconciled with the
  // server. The replay itself is idempotent and bounded (see
  // MAX_OUTBOX_ATTEMPTS in pending-review.service).
  useEffect(() => {
    if (FOOD_LOG_SAFE_MODE) return;
    if (!userId) return;

    let lastReplayAt = 0;
    const MIN_INTERVAL_MS = 30 * 1000; // throttle to ≤1 replay / 30 s

    const tryReplay = (reason: "foreground" | "auth_ready") => {
      const now = Date.now();
      if (now - lastReplayAt < MIN_INTERVAL_MS) return;
      lastReplayAt = now;
      void replayPendingReviewOutbox(userId).catch((err) => {
        // Replay logs its own failures; this catch only protects the hook.
        if (__DEV__) {
          console.warn(
            `[PendingReviewOutbox] replay error (trigger=${reason}):`,
            err
          );
        }
      });
      void reconcileDeferredPendingReviewLinks(userId).catch((err) => {
        if (__DEV__) {
          console.warn(
            `[PendingReviewSync] reconcile error (trigger=${reason}):`,
            err
          );
        }
      });
    };

    // Run once now in case there's already an outstanding mutation when
    // login completes (e.g. user dismissed offline before the app booted).
    tryReplay("auth_ready");

    const subscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          tryReplay("foreground");
        }
      }
    );

    return () => subscription.remove();
  }, [userId]);
}
