import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    formatDateHeader,
    getMonthDays,
    getWeekDays,
    getWeekdayIndex,
    toISODate,
} from "../../lib/utils/date";
import { buildGoalPlan } from "../goals/goal-calculation.service";
import { useGoalsStore } from "../goals/goals.store";
import { getDailyNutritionSummary } from "../nutrition/nutrition.selectors";
import { useNutritionStore } from "../nutrition/nutrition.store";
import { useProfileStore } from "../profile/profile.store";
import { getLatestWeight } from "../progress/progress.selectors";
import { useProgressStore } from "../progress/progress.store";

/** Shift a date by N days */
function shiftDate(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function useHomeData() {
  const profile = useProfileStore((state) => state.profile);
  const plan = useGoalsStore((state) => state.plan);
  const goalType = useGoalsStore((state) => state.goalType);
  const timeframeWeeks = useGoalsStore((state) => state.timeframeWeeks);
  const setPlan = useGoalsStore((state) => state.setPlan);
  const meals = useNutritionStore((state) => state.meals);
  const weightLogs = useProgressStore((state) => state.weightLogs);

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
    if (day) {
      setSelectedDate(day.key);
    }
  };

  /** Navigate to next week */
  const goToNextWeek = useCallback(() => {
    setSelectedDate((prev) => shiftDate(prev, 7));
  }, []);

  /** Navigate to previous week */
  const goToPrevWeek = useCallback(() => {
    setSelectedDate((prev) => shiftDate(prev, -7));
  }, []);

  // Which days in this week have meal data
  const activeDays = useMemo(() => {
    const indices: number[] = [];
    for (let i = 0; i < weekDays.length; i++) {
      const dayMeals = meals.filter((m) =>
        m.loggedAt.startsWith(weekDays[i].key)
      );
      if (dayMeals.length > 0) {
        indices.push(i);
      }
    }
    return indices;
  }, [meals, weekDays]);

  const dailySummary = useMemo(() => {
    return getDailyNutritionSummary(meals, selectedDate);
  }, [meals, selectedDate]);

  // Calorie progress per day (0–1) for each page in the 3-week window
  const weekPagesProgress = useMemo(() => {
    const budget = plan?.calorieBudget ?? 0;
    if (budget <= 0) return weekPages.map((page) => page.map(() => 0));
    return weekPages.map((page) =>
      page.map((day) => {
        const s = getDailyNutritionSummary(meals, day.key);
        return Math.min(s.totalCalories / budget, 1);
      })
    );
  }, [meals, weekPages, plan?.calorieBudget]);

  const dayProgress = weekPagesProgress[1]; // current week

  // Uncapped calorie ratios (can exceed 1.0) for over-limit color mapping
  const dayProgressRaw = useMemo(() => {
    const budget = plan?.calorieBudget ?? 0;
    return weekPages[1].map((day) => {
      const s = getDailyNutritionSummary(meals, day.key);
      if (budget <= 0) return 0;
      return s.totalCalories / budget;
    });
  }, [meals, weekPages, plan?.calorieBudget]);

  const calorieBudget = plan?.calorieBudget ?? 0;
  const caloriesRemaining = calorieBudget - dailySummary.totalCalories;
  const calorieProgress =
    calorieBudget > 0 ? dailySummary.totalCalories / calorieBudget : 0;

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
      const s = getDailyNutritionSummary(meals, day.key);
      if (s.totalCalories > 0) {
        progressMap.set(day.key, Math.min(s.totalCalories / budget, 1));
      }
    }
    return progressMap;
  }, [meals, monthGrid, plan?.calorieBudget]);

  // Uncapped monthly ratios for over-limit color mapping
  const monthProgressRaw = useMemo(() => {
    const budget = plan?.calorieBudget ?? 0;
    if (budget <= 0) return new Map<string, number>();
    const rawMap = new Map<string, number>();
    for (const day of monthGrid.days) {
      if (!day) continue;
      const s = getDailyNutritionSummary(meals, day.key);
      if (s.totalCalories > 0) {
        rawMap.set(day.key, s.totalCalories / budget);
      }
    }
    return rawMap;
  }, [meals, monthGrid, plan?.calorieBudget]);

  // Weekly summary totals
  const weekSummary = useMemo(() => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;
    let daysWithData = 0;
    for (const day of weekDays) {
      const s = getDailyNutritionSummary(meals, day.key);
      if (s.totalCalories > 0) {
        calories += s.totalCalories;
        protein += s.totalProtein;
        carbs += s.totalCarbs;
        fat += s.totalFat;
        daysWithData++;
      }
    }
    return { calories, protein, carbs, fat, daysWithData };
  }, [meals, weekDays]);

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

    // Weight
    latestWeight,
    goalWeight: profile.goalWeightLbs,

    // Calories
    calorieBudget,
    dailySummary,
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
