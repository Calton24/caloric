import { useMemo, useState } from "react";
import {
    formatDateHeader,
    getWeekDays,
    getWeekdayIndex,
    toISODate,
} from "../../lib/utils/date";
import { useGoalsStore } from "../goals/goals.store";
import { getDailyNutritionSummary } from "../nutrition/nutrition.selectors";
import { useNutritionStore } from "../nutrition/nutrition.store";
import { useProfileStore } from "../profile/profile.store";
import { getLatestWeight } from "../progress/progress.selectors";
import { useProgressStore } from "../progress/progress.store";

export function useHomeData() {
  const profile = useProfileStore((state) => state.profile);
  const plan = useGoalsStore((state) => state.plan);
  const meals = useNutritionStore((state) => state.meals);
  const weightLogs = useProgressStore((state) => state.weightLogs);

  const today = toISODate(new Date());
  const [selectedDate, setSelectedDate] = useState(today);

  const latestWeight =
    getLatestWeight(weightLogs) ?? profile.currentWeightLbs ?? null;

  const weekDays = useMemo(
    () => getWeekDays(new Date(selectedDate + "T12:00:00")),
    [selectedDate]
  );

  // Bridge for the index-based DaySelector component
  const selectedDayIndex = getWeekdayIndex(selectedDate);

  const handleDaySelect = (index: number) => {
    const day = weekDays[index];
    if (day) {
      setSelectedDate(day.key);
    }
  };

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

  const calorieBudget = plan?.calorieBudget ?? 0;
  const caloriesRemaining = calorieBudget - dailySummary.totalCalories;
  const calorieProgress =
    calorieBudget > 0 ? dailySummary.totalCalories / calorieBudget : 0;

  const proteinTarget = plan?.macros.protein ?? 0;
  const carbsTarget = plan?.macros.carbs ?? 0;
  const fatTarget = plan?.macros.fat ?? 0;

  // Formatted header date
  const dateHeader = formatDateHeader(new Date(selectedDate + "T12:00:00"));

  return {
    // Date selection
    selectedDate,
    setSelectedDate,
    selectedDayIndex,
    handleDaySelect,
    weekDays,
    activeDays,
    dateHeader,

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
  };
}
