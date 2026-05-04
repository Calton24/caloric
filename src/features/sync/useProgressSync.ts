/**
 * useProgressSync
 *
 * React hook that:
 *   1. On auth login → restores data from Supabase into local stores
 *   2. On auth login → pushes any local-only data to Supabase
 *   3. Subscribes to store mutations → pushes changes to Supabase in background
 *   4. Records streak on every meal log
 *
 * Mount once in the app root (CaloricProviders or _layout).
 */

import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { reportError } from "../../infrastructure/errorReporting";
import { addFoodLoggingBreadcrumb } from "../../infrastructure/errorReporting/foodLoggingErrors";
import { logColdStartStep } from "../../infrastructure/tracing/coldStartTrace";
import { useAuth } from "../auth/useAuth";
import { replayPendingReviewOutbox } from "../food-logging/pending-review.service";
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
import {
  computeCurrentStreakFromMeals,
  getLoggedMealDates,
  getMostRecentLoggedMealDate,
  getStreakStartDateForCurrentStreak,
} from "../streak/streak-from-meals";
import { fetchStreak, recordMealLogged } from "../streak/streak.service";
import { useStreakStore } from "../streak/streak.store";
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

/**
 * Returns YYYY-MM-DD in the device's local timezone.
 * Duplicated here to avoid circular imports with date.ts.
 */
function toLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Extract date from a meal's loggedAt ISO string.
 * On the local device, new meals are stamped with new Date().toISOString()
 * which uses UTC. Meals pulled from Supabase (TIMESTAMPTZ) are also returned
 * as UTC ISO strings. The rest of the app (getMealsForDate, calendar grid)
 * matches meals via `meal.loggedAt.startsWith(date)` where `date` comes from
 * toLocalDate(). In most timezones during the day these agree, but near
 * midnight they can diverge. We use toLocalDate(new Date(iso)) so that the
 * streak date always reflects the user's wall-clock date, matching how
 * toLocalDate() computes "today" in the walk-back.
 */

/**
 * Compute streak from local meal data (no network needed).
 * Always writes the computed value — local meals are the source of truth.
 */
function computeLocalStreak(): void {
  const meals = useNutritionStore.getState().meals;
  const currentInfo = useStreakStore.getState();

  if (meals.length === 0) {
    useStreakStore.getState().setStreak({
      currentStreak: 0,
      longestStreak: currentInfo.longestStreak,
      lastLogDate: null,
      streakStartDate: null,
    });
    return;
  }

  const loggedDates = getLoggedMealDates(meals);
  const streak = computeCurrentStreakFromMeals(meals);
  const lastLoggedDay = getMostRecentLoggedMealDate(meals);
  const streakStart =
    streak > 0 ? getStreakStartDateForCurrentStreak(meals, streak) : null;

  if (__DEV__) {
    const today = toLocalDate();
    const sortedDates = [...loggedDates].sort();
    console.warn(
      `[Streak] computeLocalStreak: today=${today}, totalMeals=${meals.length}, loggedDates=[${sortedDates.join(", ")}], streak=${streak}, lastLog=${lastLoggedDay}`
    );
    const samples = meals
      .slice(0, 8)
      .map((m) => `${m.loggedAt} → ${toLocalDate(new Date(m.loggedAt))}`);
    console.warn(`[Streak] meal samples: ${samples.join(" | ")}`);
  }

  useStreakStore.getState().setStreak({
    currentStreak: streak,
    longestStreak: Math.max(streak, currentInfo.longestStreak),
    lastLogDate: lastLoggedDay,
    streakStartDate: streakStart,
  });
}

export function useProgressSync(): void {
  const { user } = useAuth();
  const userId = user?.id;
  const hasRestoredRef = useRef<string | null>(null);
  const isHydratingFromRemoteRef = useRef(false);
  const suppressUploadUntilHydratedRef = useRef(true);
  const lastAppliedRemoteProfileUpdatedAtRef = useRef<string | null>(null);

  // ── Compute streak from local meals ──
  // Wait for BOTH nutrition and streak stores to finish hydrating from
  // AsyncStorage before computing. Then subscribe to meal changes so the
  // streak stays in sync when meals are added, removed, or restored from
  // Supabase.
  useEffect(() => {
    let cancelled = false;

    const recompute = () => {
      if (cancelled) return;
      const meals = useNutritionStore.getState().meals;
      if (meals.length > 0) {
        computeLocalStreak();
      }
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
        recompute();
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

    // Recompute whenever meals change (restore, add, delete)
    const unsub = useNutritionStore.subscribe(recompute);

    // Safety-net: recompute after a short delay to catch any
    // edge case where hydration or merge overwrites the streak.
    const safetyTimer = setTimeout(recompute, 2000);

    return () => {
      cancelled = true;
      unsub();
      clearTimeout(safetyTimer);
    };
  }, []);

  // ── On login: restore from Supabase + push local data ──
  useEffect(() => {
    if (!userId) {
      hasRestoredRef.current = null;
      isHydratingFromRemoteRef.current = false;
      suppressUploadUntilHydratedRef.current = true;
      mealDataSafety.reset();
      useSyncReadyStore.getState().resetSyncReady();
      if (__DEV__) {
        console.log("[DataLossAudit] auth-cleared", {
          userId: "anonymous",
          pushAllToSupabaseCalled: false,
        });
      }
      return;
    }

    // Only restore once per user session
    if (hasRestoredRef.current === userId) return;
    hasRestoredRef.current = userId;
    isHydratingFromRemoteRef.current = true;
    suppressUploadUntilHydratedRef.current = true;

    (async () => {
      try {
        if (__DEV__) {
          console.log("[CloudHydration] auth-context", {
            userIdFromAuthContext: userId,
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

        if (__DEV__) {
          console.log("[DataLossAudit] hydration:start", {
            userId,
            trigger: "user-change",
            localMealsBeforeResetAware: useNutritionStore.getState().meals.length,
            deletedMealIdsCount: useNutritionStore.getState().deletedMealIds.length,
            isHydratingFromRemote: true,
            suppressUploadUntilHydrated: true,
          });
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
        mealDataSafety.beginCloudRestore(userId);
        const profileBeforeRestore = useProfileStore.getState().profile;
        logColdStartStep("profile_store_before_restore", {
          userId,
          localProfileId: profileBeforeRestore.id,
          localOnboardingCompleted: profileBeforeRestore.onboardingCompleted,
          localUpdatedAt: profileBeforeRestore.updatedAt,
        });
        const hydrationResult = await restoreFromSupabase(userId, "login");
        if (!hydrationResult.ok) {
          if (__DEV__) {
            console.warn("[CloudHydration] restore failed; checking local profile ownership", {
              userId,
              reason: hydrationResult.reason,
            });
          }
          // Restore failed (no user / unexpected exception) — but if the
          // locally persisted profile already belongs to this user, we can
          // trust it for routing. This prevents the user being stuck on a
          // loading screen while offline.
          const localProfileId = useProfileStore.getState().profile.id;
          const localProfile = useProfileStore.getState().profile;
          if (localProfileId === userId) {
            if (__DEV__) {
              console.log("[ProfileHydration] restore failed but local profile matches user — allowing routing", {
                userId,
                onboardingCompleted: localProfile.onboardingCompleted,
              });
            }
            useSyncReadyStore.getState().markSyncRestored(userId);
            useSyncReadyStore.getState().markProfileConfirmed(userId);
          }
          logColdStartStep("profile_store_after_restore", {
            userId,
            localProfileId: localProfile.id,
            localOnboardingCompleted: localProfile.onboardingCompleted,
            localUpdatedAt: localProfile.updatedAt,
            profileConfirmedFor: useSyncReadyStore.getState().profileConfirmedFor,
            syncRestoredFor: useSyncReadyStore.getState().syncRestoredFor,
            hydrationReason: hydrationResult.reason,
            hydrationOk: false,
          });
          // Deletes remain blocked until next successful restore.
          return;
        }

        if (__DEV__) {
          console.log("[DataLossAudit] hydration:restore-complete", {
            userId,
            remoteRowsFetchedCount: useNutritionStore.getState().meals.length,
            deletedMealIdsCount: useNutritionStore.getState().deletedMealIds.length,
          });
        }

        // Signal that the initial server restore is done for this user.
        // app/index.tsx waits for this before routing authenticated users,
        // preventing the onboardingCompleted default (false) from causing
        // a redirect to /(onboarding)/goal before the real profile loads.
        useSyncReadyStore.getState().markSyncRestored(userId);

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
        const profileBelongsToUser = localProfileIdAfterRestore === userId;
        if (hydrationResult.profileResolved || profileBelongsToUser) {
          useSyncReadyStore.getState().markProfileConfirmed(userId);
        } else if (__DEV__) {
          console.warn(
            "[ProfileHydration] profile NOT confirmed — fetch errored and local profile.id mismatches",
            {
              userId,
              localProfileId: localProfileIdAfterRestore,
              hydrationResult,
            }
          );
        }
        const profileAfterRestore = useProfileStore.getState().profile;
        logColdStartStep("profile_store_after_restore", {
          userId,
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
          knownUserId: userId,
          suppressMealUpserts: true,
          suppressTombstoneReplay: true,
          reason: "initial_hydration",
        });
        // Cloud restore + idempotent push completed for this user. Only NOW
        // are explicit user deletes allowed to flow back to Supabase.
        mealDataSafety.markCloudRestoreComplete(userId);
        lastAppliedRemoteProfileUpdatedAtRef.current =
          useProfileStore.getState().profile.updatedAt;
        isHydratingFromRemoteRef.current = false;
        suppressUploadUntilHydratedRef.current = false;
        // Re-derive streak from the now-merged local+remote meals.
        // Local meals are the authoritative source after restore.
        computeLocalStreak();
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
              userId,
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
        isHydratingFromRemoteRef.current = false;
        // Keep upload suppression enabled if hydration failed. This prevents
        // accidental cloud writes from a partially reset local state.
        suppressUploadUntilHydratedRef.current = true;
        // If the profile already belongs to this user, unblock routing
        // so the user isn't stuck on the loading screen during network errors.
        const localProfileId = useProfileStore.getState().profile.id;
        if (localProfileId === userId) {
          useSyncReadyStore.getState().markSyncRestored(userId);
          useSyncReadyStore.getState().markProfileConfirmed(userId);
        }
        // Orchestration-level failure during login restore/push.
        // restoreFromSupabase / pushAllToSupabase already report their own
        // canonical failures, so this catch only fires for unexpected throws
        // (e.g. challenge sync, fetchStreak setup) that escape inner handlers.
        reportError(err, {
          area: "sync",
          action: "useProgressSync_loginRestore",
          userId,
        });
      }
    })();
  }, [userId]);

  // ── Subscribe to meal changes → push to Supabase ──
  useEffect(() => {
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
        prevMeals = nextMeals;
        prevDeletedMealIds = state.deletedMealIds;
        return;
      }

      // Detect added meals
      const prevIds = new Set(prevMeals.map((m) => m.id));
      const added = nextMeals.filter((m) => !prevIds.has(m.id));
      for (const meal of added) {
        addFoodLoggingBreadcrumb("food_logging.remote_sync_started", {
          meal_id: meal.id,
        });
        pushMeal(meal, userId);
        // Record streak in daily_log_dates (fire-and-forget)
        recordMealLogged(meal.calories, new Date(meal.loggedAt)).catch(
          () => {}
        );
      }
      // Recompute streak from all local meals for accuracy
      if (added.length > 0) {
        computeLocalStreak();
      }

      // Detect removed meals locally for streak only. We DO NOT treat
      // disappearance from `meals` as delete intent, because account reset /
      // hydration can clear local state and that must never soft-delete cloud
      // rows. Cloud deletes are driven exclusively by explicit tombstones
      // (`deletedMealIds`) created by removeMeal/clearMealsForDate.
      const nextIds = new Set(nextMeals.map((m) => m.id));
      const removed = prevMeals.filter((m) => !nextIds.has(m.id));
      if (removed.length > 0) {
        computeLocalStreak();
      }

      // Detect newly added tombstones and push only those deletions.
      const prevDeletedSet = new Set(prevDeletedMealIds);
      const tombstonesAdded = state.deletedMealIds.filter(
        (id) => !prevDeletedSet.has(id)
      );
      for (const mealId of tombstonesAdded) {
        pushMealDelete(mealId, userId);
      }

      // Detect updated meals
      const prevMap = new Map<string, MealEntry>(
        prevMeals.map((m) => [m.id, m])
      );
      for (const meal of nextMeals) {
        const prev = prevMap.get(meal.id);
        if (prev && prev !== meal) {
          pushMealUpdate(meal.id, meal, userId);
        }
      }

      prevMeals = nextMeals;
      prevDeletedMealIds = state.deletedMealIds;
    });

    return unsub;
  }, [userId]);

  // ── Subscribe to weight log changes → push to Supabase ──
  useEffect(() => {
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
