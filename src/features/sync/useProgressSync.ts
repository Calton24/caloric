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
import { useAuth } from "../auth/useAuth";
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
function mealDate(loggedAt: string): string {
  return toLocalDate(new Date(loggedAt));
}

/**
 * Compute streak from local meal data (no network needed).
 * Always writes the computed value — local meals are the source of truth.
 */
function computeLocalStreak(): void {
  const meals = useNutritionStore.getState().meals;
  if (meals.length === 0) return;

  // Collect unique local-timezone dates that have at least one meal
  const loggedDates = new Set<string>();
  for (const meal of meals) {
    loggedDates.add(mealDate(meal.loggedAt));
  }

  // Walk backwards from today counting consecutive days
  const today = toLocalDate();
  let streak = 0;
  const check = new Date();
  while (true) {
    const dateStr = toLocalDate(check);
    if (!loggedDates.has(dateStr)) break;
    streak++;
    check.setDate(check.getDate() - 1);
  }

  // If today has no meals yet, check if yesterday starts a streak
  // (the streak is still alive until end of today)
  if (streak === 0) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const check2 = new Date(yesterday);
    while (true) {
      const dateStr = toLocalDate(check2);
      if (!loggedDates.has(dateStr)) break;
      streak++;
      check2.setDate(check2.getDate() - 1);
    }
  }

  if (__DEV__) {
    const sortedDates = [...loggedDates].sort();
    console.warn(
      `[Streak] computeLocalStreak: today=${today}, totalMeals=${meals.length}, loggedDates=[${sortedDates.join(", ")}], streak=${streak}`
    );
    // Also dump a few sample loggedAt values to verify date extraction
    const samples = meals
      .slice(0, 8)
      .map((m) => `${m.loggedAt} → ${mealDate(m.loggedAt)}`);
    console.warn(`[Streak] meal samples: ${samples.join(" | ")}`);
  }

  const currentInfo = useStreakStore.getState();

  // Determine the most recent logged day and compute streak start
  const startedFromYesterday = streak > 0 && !loggedDates.has(today);
  const mostRecentLogDay = startedFromYesterday
    ? new Date(new Date().setDate(new Date().getDate() - 1))
    : new Date();
  const lastLoggedDay = toLocalDate(mostRecentLogDay);

  const startDate = new Date(mostRecentLogDay);
  startDate.setDate(startDate.getDate() - (streak - 1));

  useStreakStore.getState().setStreak({
    currentStreak: streak,
    longestStreak: Math.max(streak, currentInfo.longestStreak),
    lastLogDate: lastLoggedDay,
    streakStartDate: streak > 0 ? toLocalDate(startDate) : null,
  });
}

export function useProgressSync(): void {
  const { user } = useAuth();
  const userId = user?.id;
  const hasRestoredRef = useRef<string | null>(null);

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
      return;
    }

    // Only restore once per user session
    if (hasRestoredRef.current === userId) return;
    hasRestoredRef.current = userId;

    (async () => {
      // First push any local data that was created while offline/logged out
      await pushAllToSupabase();
      // Then restore anything from remote we don't have locally
      await restoreFromSupabase();
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
        .catch(() => {});

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
    })();
  }, [userId]);

  // ── Subscribe to meal changes → push to Supabase ──
  useEffect(() => {
    if (!userId) return;

    let prevMeals = useNutritionStore.getState().meals;

    const unsub = useNutritionStore.subscribe((state) => {
      const nextMeals = state.meals;
      if (nextMeals === prevMeals) return;

      // Detect added meals
      const prevIds = new Set(prevMeals.map((m) => m.id));
      const added = nextMeals.filter((m) => !prevIds.has(m.id));
      for (const meal of added) {
        pushMeal(meal);
        // Record streak in daily_log_dates (fire-and-forget)
        recordMealLogged(meal.calories, new Date(meal.loggedAt)).catch(
          () => {}
        );
      }
      // Recompute streak from all local meals for accuracy
      if (added.length > 0) {
        computeLocalStreak();
      }

      // Detect removed meals — recompute streak since a day may now be empty
      const nextIds = new Set(nextMeals.map((m) => m.id));
      const removed = prevMeals.filter((m) => !nextIds.has(m.id));
      for (const meal of removed) {
        pushMealDelete(meal.id);
      }
      if (removed.length > 0) {
        computeLocalStreak();
      }

      // Detect updated meals
      const prevMap = new Map<string, MealEntry>(
        prevMeals.map((m) => [m.id, m])
      );
      for (const meal of nextMeals) {
        const prev = prevMap.get(meal.id);
        if (prev && prev !== meal) {
          pushMealUpdate(meal.id, meal);
        }
      }

      prevMeals = nextMeals;
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
      prevProfile = state.profile;
      pushProfile(state.profile);
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
}
