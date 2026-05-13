import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InteractionManager } from "react-native";
import { useAuth } from "../auth/useAuth";
import { peekFoodLogStoreApply } from "../food-logging/food-log-apply-queue";
import { runPendingFoodLogApplyFromQueue } from "../food-logging/services/food-log-transaction.service";
import {
    formatDateHeader,
    getMonthDays,
    getWeekDays,
    getWeekdayIndex,
    toISODate,
} from "../../lib/utils/date";
import { buildGoalPlan } from "../goals/goal-calculation.service";
import { useGoalsStore } from "../goals/goals.store";
import {
    getDailyNutritionSummary,
    getDailyNutritionTotalsMap,
} from "../nutrition/nutrition.selectors";
import { useNutritionStore } from "../nutrition/nutrition.store";
import { useProfileStore } from "../profile/profile.store";
import { subscribeFoodLogCommitted } from "../food-logging/events/food-log-events";
import { listMeals } from "../food-logging/repositories/meal.repository";
import { FOOD_LOG_DISABLE_POST_SAVE_HOME_REFRESH } from "../food-logging/post-save-debug-flags";
import { recomputeStreakAfterMealListChange } from "../streak/recompute-streak-after-meal-list-change";
import { getLoggedMealDates } from "../streak/streak-from-meals";
import { createHomeNutritionSummary } from "./selectors/create-home-nutrition-summary";
import { getLatestWeight } from "../progress/progress.selectors";
import { useProgressStore } from "../progress/progress.store";

/** Shift a date by N days */
function shiftDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function useHomeData() {
  const { user } = useAuth();
  /** Meals in AsyncStorage are keyed by Supabase auth id (see persistMeal), not profile.id. */
  const authUserIdRef = useRef<string | null>(null);
  authUserIdRef.current = user?.id ?? null;
  const [foodLogSettling, setFoodLogSettling] = useState(false);

  /**
   * confirm-meal commits to AsyncStorage then queues store apply. The apply
   * must run after navigation (dismissAll / replaceTabs) so the home tab is
   * stable — it was only wired for FOOD_LOG_POST_SAVE_NAV_MODE === "none",
   * which left the queue unconsumed for the default dismissAll path.
   */
  useFocusEffect(
    useCallback(() => {
      if (!peekFoodLogStoreApply()) return undefined;
      const task = InteractionManager.runAfterInteractions(() => {
        void runPendingFoodLogApplyFromQueue(user?.id ?? null);
      });
      return () => {
        task.cancel?.();
      };
    }, [user?.id]),
  );

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const unsub = subscribeFoodLogCommitted((payload) => {
      if (__DEV__) {
        console.log("[HomeRefresh] food_log_committed_received", payload);
      }
      if (FOOD_LOG_DISABLE_POST_SAVE_HOME_REFRESH) {
        return;
      }
      setFoodLogSettling(true);
      if (timeout) clearTimeout(timeout);
      InteractionManager.runAfterInteractions(async () => {
        if (__DEV__) {
          console.log("[HomeRefresh] applying_after_interactions", payload);
        }
        // Delay a bit more so modal transitions and JS runtime settle first.
        await new Promise<void>((resolve) => setTimeout(resolve, 500));
        const authId = authUserIdRef.current;
        const profileId = useProfileStore.getState().profile.id;
        const userIdForRepo =
          authId ??
          (profileId && profileId !== "local-user" ? profileId : null);
        if (!userIdForRepo) return;
        try {
          const repoMeals = await listMeals(userIdForRepo);
          const deleted = new Set(useNutritionStore.getState().deletedMealIds);
          const visibleRepoMeals = repoMeals.filter((m) => !deleted.has(m.id));
          useNutritionStore
            .getState()
            .mergeMealsFromRepositorySnapshot(visibleRepoMeals);
          recomputeStreakAfterMealListChange("repository_snapshot_merged");
        } catch {
          // non-fatal; keep current in-memory view
        }
      });
      timeout = setTimeout(() => setFoodLogSettling(false), 1200);
    });
    return () => {
      unsub();
      if (timeout) clearTimeout(timeout);
    };
  }, []);
  const profile = useProfileStore((state) => state.profile);
  const plan = useGoalsStore((state) => state.plan);
  const goalType = useGoalsStore((state) => state.goalType);
  const timeframeWeeks = useGoalsStore((state) => state.timeframeWeeks);
  const setPlan = useGoalsStore((state) => state.setPlan);
  const meals = useNutritionStore((state) => state.meals);
  const weightLogs = useProgressStore((state) => state.weightLogs);

  /** One pass per meals change — avoids O(days × meals) on Home D/W/M. */
  const mealDayTotals = useMemo(
    () => getDailyNutritionTotalsMap(meals),
    [meals]
  );

  // Auto-recover: if onboarding completed but plan is missing, recalculate
  const recovered = useRef(false);
  useEffect(() => {
    if (plan || recovered.current) return;
    if (
      !profile.onboardingCompleted ||
      !profile.activityLevel ||
      !profile.currentWeightLbs ||
      !profile.goalWeightLbs ||
      !profile.birthYear ||
      !profile.heightCm ||
      !profile.gender ||
      !timeframeWeeks
    )
      return;

    try {
      const newPlan = buildGoalPlan({ profile, goalType, timeframeWeeks });
      setPlan(newPlan);
      recovered.current = true;
    } catch {
      // Profile data incomplete — user can fix in Goals tab
    }
  }, [plan, profile, goalType, timeframeWeeks, setPlan]);

  const today = toISODate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);

  const latestWeight =
    getLatestWeight(weightLogs) ?? profile.currentWeightLbs ?? null;

  // 3-week window: previous, current, next
  const weekPages = useMemo(() => {
    const anchor = new Date(selectedDate + "T12:00:00");
    const prev = new Date(anchor);
    prev.setDate(prev.getDate() - 7);
    const next = new Date(anchor);
    next.setDate(next.getDate() + 7);
    return [getWeekDays(prev), getWeekDays(anchor), getWeekDays(next)];
  }, [selectedDate]);

  const weekDays = weekPages[1]; // current week

  // Bridge for the index-based DaySelector component
  const selectedDayIndex = getWeekdayIndex(selectedDate);

  const handleDaySelect = (index: number) => {
    const day = weekDays[index];
    if (day && day.key <= today) {
      setSelectedDate(day.key);
    }
  };

  /** Navigate to next week (capped at today) */
  const goToNextWeek = useCallback(() => {
    setSelectedDate((prev) => {
      const next = shiftDate(prev, 7);
      return next > today ? today : next;
    });
  }, [today]);

  /** Navigate to previous week */
  const goToPrevWeek = useCallback(() => {
    setSelectedDate((prev) => shiftDate(prev, -7));
  }, []);

  /** Navigate to next month (capped at today) */
  const goToNextMonth = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev + "T12:00:00");
      d.setMonth(d.getMonth() + 1);
      const next = toISODate(d);
      return next > today ? today : next;
    });
  }, [today]);

  /** Navigate to previous month */
  const goToPrevMonth = useCallback(() => {
    setSelectedDate((prev) => {
      const d = new Date(prev + "T12:00:00");
      d.setMonth(d.getMonth() - 1);
      return toISODate(d);
    });
  }, []);

  /** Jump back to today */
  const goToToday = useCallback(() => {
    setSelectedDate(today);
  }, [today]);

  // Which days in this week have meal data (O(meals) via logged-date set).
  const activeDays = useMemo(() => {
    const logged = getLoggedMealDates(meals);
    const indices: number[] = [];
    for (let i = 0; i < weekDays.length; i++) {
      if (logged.has(weekDays[i].key)) indices.push(i);
    }
    return indices;
  }, [meals, weekDays]);

  const calorieBudget = plan?.calorieBudget ?? 0;

  const homeNutritionSummary = useMemo(
    () =>
      createHomeNutritionSummary(meals, selectedDate, calorieBudget),
    [meals, selectedDate, calorieBudget]
  );

  const dailySummary = useMemo(() => {
    return getDailyNutritionSummary(meals, selectedDate);
  }, [meals, selectedDate]);

  useEffect(() => {
    if (!__DEV__) return;
    const first3 = meals.slice(0, 3).map((m) => ({
      id: m.id,
      loggedAt: m.loggedAt,
      localDate: toISODate(new Date(m.loggedAt)),
    }));
    console.log("[HomeMeals]", {
      selectedDate,
      totalMealsInStore: meals.length,
      mealsForSelectedDate: dailySummary.meals.length,
      first3StoreMealDates: first3,
    });
  }, [selectedDate, meals, dailySummary.meals.length]);

  // Calorie progress per day (0–1) for each page in the 3-week window
  const weekPagesProgress = useMemo(() => {
    const budget = plan?.calorieBudget ?? 0;
    if (budget <= 0) return weekPages.map((page) => page.map(() => 0));
    return weekPages.map((page) =>
      page.map((day) => {
        const cals = mealDayTotals.get(day.key)?.calories ?? 0;
        return Math.min(cals / budget, 1);
      })
    );
  }, [mealDayTotals, weekPages, plan?.calorieBudget]);

  const dayProgress = weekPagesProgress[1]; // current week

  // Uncapped calorie ratios (can exceed 1.0) for over-limit color mapping
  const dayProgressRaw = useMemo(() => {
    const budget = plan?.calorieBudget ?? 0;
    return weekPages[1].map((day) => {
      const cals = mealDayTotals.get(day.key)?.calories ?? 0;
      if (budget <= 0) return 0;
      return cals / budget;
    });
  }, [mealDayTotals, weekPages, plan?.calorieBudget]);

  const caloriesRemaining = calorieBudget - homeNutritionSummary.totalCalories;
  const calorieProgress =
    calorieBudget > 0
      ? homeNutritionSummary.totalCalories / calorieBudget
      : 0;

  const proteinTarget = plan?.macros.protein ?? 0;
  const carbsTarget = plan?.macros.carbs ?? 0;
  const fatTarget = plan?.macros.fat ?? 0;

  // Is the selected date today?
  const isToday = selectedDate === today;

  // Formatted header date
  const dateHeader = formatDateHeader(new Date(selectedDate + "T12:00:00"));

  // ── Monthly data ──
  const monthGrid = useMemo(() => {
    return getMonthDays(new Date(selectedDate + "T12:00:00"));
  }, [selectedDate]);

  const monthProgress = useMemo(() => {
    const budget = plan?.calorieBudget ?? 0;
    if (budget <= 0) return new Map<string, number>();
    const progressMap = new Map<string, number>();
    for (const day of monthGrid.days) {
      if (!day) continue;
      const cals = mealDayTotals.get(day.key)?.calories ?? 0;
      if (cals > 0) {
        progressMap.set(day.key, Math.min(cals / budget, 1));
      }
    }
    return progressMap;
  }, [mealDayTotals, monthGrid, plan?.calorieBudget]);

  // Uncapped monthly ratios for over-limit color mapping
  const monthProgressRaw = useMemo(() => {
    const budget = plan?.calorieBudget ?? 0;
    if (budget <= 0) return new Map<string, number>();
    const rawMap = new Map<string, number>();
    for (const day of monthGrid.days) {
      if (!day) continue;
      const cals = mealDayTotals.get(day.key)?.calories ?? 0;
      if (cals > 0) {
        rawMap.set(day.key, cals / budget);
      }
    }
    return rawMap;
  }, [mealDayTotals, monthGrid, plan?.calorieBudget]);

  // Weekly summary totals
  const weekSummary = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let daysWithData = 0;
    for (const day of weekDays) {
      const t = mealDayTotals.get(day.key);
      if (!t || t.calories <= 0) continue;
      calories += t.calories;
      protein += t.protein;
      carbs += t.carbs;
      fat += t.fat;
      daysWithData++;
    }
    return { calories, protein, carbs, fat, daysWithData };
  }, [mealDayTotals, weekDays]);

  return {
    // Date selection
    selectedDate,
    setSelectedDate,
    selectedDayIndex,
    handleDaySelect,
    weekDays,
    weekPages,
    weekPagesProgress,
    activeDays,
    dayProgress,
    dayProgressRaw,
    dateHeader,
    isToday,
    goToNextWeek,
    goToPrevWeek,
    goToNextMonth,
    goToPrevMonth,
    goToToday,

    // Weight
    latestWeight,
    goalWeight: profile.goalWeightLbs,

    // Calories
    calorieBudget,
    dailySummary,
    homeNutritionSummary,
    foodLogAnimationsEnabled: !foodLogSettling,
    caloriesRemaining,
    calorieProgress,

    // Macros
    proteinTarget,
    carbsTarget,
    fatTarget,

    // Monthly
    monthGrid,
    monthProgress,
    monthProgressRaw,

    // Weekly summary
    weekSummary,
  };
}
