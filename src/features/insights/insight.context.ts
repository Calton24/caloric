/**
 * Insight Context Builder
 *
 * Pure function: raw stores → InsightContext. Computed once per
 * evaluation pass. All rules read the resulting snapshot synchronously,
 * never recompute.
 *
 * This is the single source of truth for behavioral signals. If a new
 * rule needs a new signal, ADD IT HERE — never recompute inside a rule.
 */

import { toLocalDate } from "../../lib/utils/date";
import type { GoalPlan, GoalType } from "../goals/goals.types";
import {
  getMealsForDate,
  getNutritionTotals,
} from "../nutrition/nutrition.selectors";
import type { MealEntry } from "../nutrition/nutrition.types";
import type { UserProfile } from "../profile/profile.types";
import type { WeightLog } from "../progress/progress.types";
import { derivePersona, deriveToneVariant } from "./insight.persona";
import type { InsightContext } from "./insight.types";

const MS_PER_DAY = 86_400_000;
const MILESTONE_VALUES = [3, 7, 14, 30, 60, 100, 365];

interface BuildContextInputs {
  meals: MealEntry[];
  weightLogs: WeightLog[];
  profile: UserProfile;
  plan: GoalPlan | null;
  goalType: GoalType | null;
  streak: {
    current: number;
    longest: number;
    lastLogDate: string | null;
  };
  /**
   * Best 7-day adherence ever observed across the user's history. Tracked
   * by the insight store so we can surface "best week ever" insights
   * without re-scanning the entire meal history every render.
   */
  bestPctEver: number;
  /** Override "now" — primarily for tests. Defaults to wall clock. */
  now?: Date;
}

function startOfLocalDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function isoDaysAgo(days: number, base: Date): string {
  const d = new Date(base.getTime() - days * MS_PER_DAY);
  return toLocalDate(d);
}

function dateListEndingToday(days: number, today: Date): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(isoDaysAgo(i, today));
  }
  return out;
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function avgPositive(arr: number[]): number {
  const positives = arr.filter((v) => v > 0);
  return positives.length === 0 ? 0 : avg(positives);
}

function adherencePct(
  dailyCalories: number[],
  budget: number
): { logged: number; onTarget: number; pct: number } {
  if (!budget || budget <= 0) return { logged: 0, onTarget: 0, pct: 0 };
  let logged = 0;
  let onTarget = 0;
  for (const c of dailyCalories) {
    if (c > 0) {
      logged += 1;
      const ratio = c / budget;
      if (ratio >= 0.9 && ratio <= 1.1) onTarget += 1;
    }
  }
  const pct = logged === 0 ? 0 : Math.round((onTarget / logged) * 100);
  return { logged, onTarget, pct };
}

export function buildInsightContext(i: BuildContextInputs): InsightContext {
  const now = i.now ?? new Date();
  const todayStart = startOfLocalDay(now);
  const todayIso = toLocalDate(todayStart);

  // ── Meals & engagement ──
  const sortedByLogged = [...i.meals].sort(
    (a, b) =>
      new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
  );
  const lastMealAtIso = sortedByLogged[0]?.loggedAt ?? null;
  const lastMealDate = lastMealAtIso ? new Date(lastMealAtIso) : null;
  const hoursSinceLastMeal = lastMealDate
    ? (now.getTime() - lastMealDate.getTime()) / (1000 * 60 * 60)
    : null;

  // First-meal date (earliest loggedAt) → days active
  const firstMeal = sortedByLogged[sortedByLogged.length - 1];
  const daysActive = firstMeal
    ? Math.max(
        1,
        Math.floor(
          (todayStart.getTime() -
            startOfLocalDay(new Date(firstMeal.loggedAt)).getTime()) /
            MS_PER_DAY
        ) + 1
      )
    : 0;

  const todayMeals = getMealsForDate(i.meals, todayIso);
  const loggedToday = todayMeals.length > 0;

  // ── Calorie windows ──
  const last7Dates = dateListEndingToday(7, todayStart);
  const last30Dates = dateListEndingToday(30, todayStart);

  const last7Daily = last7Dates.map(
    (d) => getNutritionTotals(getMealsForDate(i.meals, d)).calories
  );
  const last30Daily = last30Dates.map(
    (d) => getNutritionTotals(getMealsForDate(i.meals, d)).calories
  );

  const todayCals = last7Daily[last7Daily.length - 1] ?? 0;

  // Last-3-days streaks operate only on *logged* days. Walk backward.
  const last3Logged: number[] = [];
  for (let idx = last7Daily.length - 1; idx >= 0 && last3Logged.length < 3; idx--) {
    if (last7Daily[idx] > 0) last3Logged.push(last7Daily[idx]);
  }
  const budget = i.plan?.calorieBudget ?? 0;
  const surplus3DaysStreak =
    last3Logged.length === 3 &&
    budget > 0 &&
    last3Logged.every((c) => c > budget * 1.1);
  const aggressiveDeficit3DaysStreak =
    last3Logged.length === 3 &&
    budget > 0 &&
    last3Logged.every((c) => c < budget * 0.7);

  // Weekend drift: avg calories on Sat+Sun vs Mon-Fri across last 14 days.
  const weekendDriftRatio = (() => {
    const last14 = dateListEndingToday(14, todayStart);
    const weekend: number[] = [];
    const weekday: number[] = [];
    for (const iso of last14) {
      const d = new Date(`${iso}T12:00:00`);
      const cals = getNutritionTotals(getMealsForDate(i.meals, iso)).calories;
      if (cals === 0) continue;
      const dow = d.getDay();
      if (dow === 0 || dow === 6) weekend.push(cals);
      else weekday.push(cals);
    }
    if (weekend.length < 2 || weekday.length < 3) return null;
    const wkAvg = avg(weekday);
    if (wkAvg <= 0) return null;
    return +(avg(weekend) / wkAvg).toFixed(2);
  })();

  // ── Adherence ──
  const adh7 = adherencePct(last7Daily, budget);
  const prev7Dates = dateListEndingToday(14, todayStart).slice(0, 7);
  const prev7Daily = prev7Dates.map(
    (d) => getNutritionTotals(getMealsForDate(i.meals, d)).calories
  );
  const adhPrev7 = adherencePct(prev7Daily, budget);

  const isBestWeekEver =
    adh7.pct > 0 && adh7.pct >= Math.max(i.bestPctEver, 1);

  // ── Macros ──
  const proteinTarget = i.plan?.macros.protein ?? null;
  const last7DailyProtein = last7Dates.map(
    (d) => getNutritionTotals(getMealsForDate(i.meals, d)).protein
  );
  const last5DailyProtein = last7DailyProtein.slice(-5);
  const proteinAvg7 = avgPositive(last7DailyProtein);
  const proteinAvg5 = avgPositive(last5DailyProtein);
  const proteinPctOfTarget7d =
    proteinTarget != null && proteinTarget > 0
      ? Math.round((proteinAvg7 / proteinTarget) * 100)
      : null;
  const chronicallyLow =
    proteinTarget != null &&
    proteinTarget > 0 &&
    last7DailyProtein.filter((p, idx) => last7Daily[idx] > 0 && p < proteinTarget * 0.8)
      .length >= 5;
  const inOptimizationRange =
    proteinPctOfTarget7d != null &&
    proteinPctOfTarget7d >= 70 &&
    proteinPctOfTarget7d <= 89;

  // ── Weight ──
  const sortedWeightDesc = [...i.weightLogs].sort((a, b) =>
    a.date < b.date ? 1 : -1
  );
  const currentLbs =
    sortedWeightDesc[0]?.weightLbs ?? i.profile.currentWeightLbs ?? null;
  const startLbs =
    sortedWeightDesc[sortedWeightDesc.length - 1]?.weightLbs ??
    i.profile.currentWeightLbs ??
    null;
  const goalLbs = i.profile.goalWeightLbs ?? null;
  const remainingLbs =
    currentLbs != null && goalLbs != null
      ? +(currentLbs - goalLbs).toFixed(1)
      : null;
  const daysSinceLastWeightLog = (() => {
    if (sortedWeightDesc.length === 0) return null;
    const last = new Date(`${sortedWeightDesc[0].date}T12:00:00`).getTime();
    return Math.max(
      0,
      Math.floor((todayStart.getTime() - last) / MS_PER_DAY)
    );
  })();

  // Weekly rate from last 30d weight points.
  const weeklyRateLbs = (() => {
    const cutoff = isoDaysAgo(30, todayStart);
    const pts = sortedWeightDesc
      .filter((w) => w.date >= cutoff)
      .sort((a, b) => (a.date < b.date ? -1 : 1));
    if (pts.length < 2) return 0;
    const a = pts[0];
    const b = pts[pts.length - 1];
    const days =
      (new Date(`${b.date}T12:00:00`).getTime() -
        new Date(`${a.date}T12:00:00`).getTime()) /
      MS_PER_DAY;
    if (days < 1) return 0;
    return +((b.weightLbs - a.weightLbs) / (days / 7)).toFixed(2);
  })();

  const weeklyRateTargetLbs = i.plan?.weeklyRateLbs ?? 0;
  const onPaceForGoal =
    weeklyRateTargetLbs !== 0 &&
    Math.sign(weeklyRateTargetLbs) === Math.sign(weeklyRateLbs) &&
    Math.abs(weeklyRateLbs - weeklyRateTargetLbs) <=
      Math.abs(weeklyRateTargetLbs) * 0.3;

  // ── Streak ──
  const atRiskToday =
    i.streak.current >= 1 && i.streak.lastLogDate !== todayIso;
  const oneFromPersonalBest =
    i.streak.longest >= 3 && i.streak.current === i.streak.longest - 1;
  const milestoneValue = MILESTONE_VALUES.includes(i.streak.current)
    ? i.streak.current
    : null;
  const isMilestoneToday =
    milestoneValue != null && i.streak.lastLogDate === todayIso;

  // Restart opportunity: a meaningful recent streak that just broke.
  const isRestartOpportunity = (() => {
    if (i.streak.current !== 0) return false;
    if (!i.streak.lastLogDate) return false;
    const lastDays = Math.floor(
      (todayStart.getTime() -
        startOfLocalDay(new Date(`${i.streak.lastLogDate}T12:00:00`)).getTime()) /
        MS_PER_DAY
    );
    return lastDays >= 1 && lastDays <= 3 && i.streak.longest >= 3;
  })();

  // ── Goal direction ──
  const goalDirection: "lose" | "gain" | "maintain" | "unknown" =
    i.goalType === "lose"
      ? "lose"
      : i.goalType === "gain"
        ? "gain"
        : i.goalType === "maintain"
          ? "maintain"
          : "unknown";

  // ── Behavior ──
  const lateLogPattern = (() => {
    if (sortedByLogged.length < 5) return false;
    const recent = sortedByLogged.slice(0, 8);
    const lateCount = recent.filter((m) => {
      const d = new Date(m.loggedAt);
      return d.getHours() >= 20;
    }).length;
    return lateCount >= 4;
  })();

  // ── Persona ──
  const daysSinceLastMeal =
    hoursSinceLastMeal != null
      ? Math.floor(hoursSinceLastMeal / 24)
      : null;
  const persona = derivePersona({
    daysActive,
    totalMeals: i.meals.length,
    currentStreak: i.streak.current,
    daysSinceLastMeal,
  });
  const toneVariant = deriveToneVariant(persona);

  return {
    now,
    todayIso,
    hour: now.getHours(),
    weekday: now.getDay(),

    daysActive,
    totalMeals: i.meals.length,
    loggedToday,
    hoursSinceLastMeal,
    lastMealAtIso,

    cals: {
      today: Math.round(todayCals),
      avg7d: Math.round(avgPositive(last7Daily)),
      avg30d: Math.round(avgPositive(last30Daily)),
      last7Daily: last7Daily.map((c) => Math.round(c)),
      surplus3DaysStreak,
      aggressiveDeficit3DaysStreak,
      weekendDriftRatio,
    },

    adherence: {
      pct7d: adh7.pct,
      pctPrev7d: adhPrev7.pct,
      bestPctEver: i.bestPctEver,
      isBestWeekEver,
    },

    protein: {
      target: proteinTarget,
      avg5d: Math.round(proteinAvg5),
      avg7d: Math.round(proteinAvg7),
      pctOfTarget7d: proteinPctOfTarget7d,
      chronicallyLow,
      inOptimizationRange,
    },

    weight: {
      currentLbs,
      goalLbs,
      startLbs,
      remainingLbs,
      daysSinceLastLog: daysSinceLastWeightLog,
      weeklyRateLbs,
      onPaceForGoal,
    },

    streak: {
      current: i.streak.current,
      longest: i.streak.longest,
      lastLogDateIso: i.streak.lastLogDate,
      atRiskToday,
      oneFromPersonalBest,
      isMilestoneToday,
      milestoneValue,
      isRestartOpportunity,
      priorBestStreakBeforeBreak: isRestartOpportunity ? i.streak.longest : 0,
    },

    plan: {
      calorieBudget: budget,
      weeklyRateTargetLbs,
      goalDirection,
      proteinTarget: i.plan?.macros.protein ?? 0,
      carbsTarget: i.plan?.macros.carbs ?? 0,
      fatTarget: i.plan?.macros.fat ?? 0,
    },

    behavior: {
      lateLogPattern,
    },

    persona,
    toneVariant,
  };
}
