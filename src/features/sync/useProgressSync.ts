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
 * Compute streak from local meal data (no network needed).
 * Used as a fallback when offline or to reconcile after sync.
 * When `force` is true, always writes the computed value (remote sync just finished).
 * Otherwise only bumps the streak upward (offline-first pre-login path).
 */
function computeLocalStreak(force = false): void {
  const meals = useNutritionStore.getState().meals;
  if (meals.length === 0) return;

  // Collect unique local dates that have at least one meal
  const loggedDates = new Set<string>();
  for (const meal of meals) {
    loggedDates.add(toLocalDate(new Date(meal.loggedAt)));
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

  const currentInfo = useStreakStore.getState();

  if (force || streak > currentInfo.currentStreak) {
    // Compute streakStartDate by walking back `streak` days from today
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (streak - 1));

    useStreakStore.getState().setStreak({
      currentStreak: streak,
      longestStreak: Math.max(streak, currentInfo.longestStreak),
      lastLogDate: today,
      streakStartDate: streak > 0 ? toLocalDate(startDate) : null,
    });
  }
}

export function useProgressSync(): void {
  const { user } = useAuth();
  const userId = user?.id;
  const hasRestoredRef = useRef<string | null>(null);

  // ── Compute streak from local meals (wait for store hydration) ──
  useEffect(() => {
    // Meals may not be hydrated yet when the component mounts.
    // Try immediately, then subscribe so we catch post-hydration.
    let done = false;
    const tryCompute = () => {
      if (done) return;
      const meals = useNutritionStore.getState().meals;
      if (meals.length > 0) {
        done = true;
        computeLocalStreak();
      }
    };
    tryCompute();
    const unsub = useNutritionStore.subscribe(tryCompute);
    return unsub;
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
      // Fetch authoritative streak from the server
      const remoteStreak = await fetchStreak();
      useStreakStore.getState().setStreak(remoteStreak);
      // Re-derive streak from the now-merged local+remote meals
      // so the result is accurate even if the server RPC is stale.
      // force=true so local computation can correct downward too.
      computeLocalStreak(true);
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
        // Record streak for each new meal
        recordMealLogged(meal.calories, new Date(meal.loggedAt)).then((info) =>
          useStreakStore.getState().setStreak(info)
        );
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
}
