/**
 * Progress Dashboard Selectors
 *
 * Pure, memoisable functions that derive analytics-ready data structures
 * from the existing meal / weight / goal stores. Designed to be called
 * from `useMemo` in the screen layer; no I/O, no side effects.
 *
 * All inputs are passed in explicitly so we can test and reason about them
 * without touching Zustand directly.
 */

import { toLocalDate } from "../../lib/utils/date";
import type { GoalType, MacroTargets } from "../goals/goals.types";
import {
  getMealsForDate,
  getNutritionTotals,
} from "../nutrition/nutrition.selectors";
import type { MealEntry } from "../nutrition/nutrition.types";
import {
  computeCurrentStreakFromMeals,
  getMostRecentLoggedMealDate,
} from "../streak/streak-from-meals";
import type { WeightLog } from "./progress.types";

// ── Types ──────────────────────────────────────────────────────────────

export type DashboardRange = "7d" | "30d" | "90d" | "all";

export interface MacroBreakdown {
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyStackPoint {
  date: string; // YYYY-MM-DD
  label: string; // short axis label
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface WeightTrendPoint {
  date: string;
  label: string;
  weightLbs: number;
}

/** Higher-level weight trend direction. */
export type WeightTrendDirection = "down" | "up" | "flat" | "none";

export interface WeightTrend {
  points: WeightTrendPoint[];
  /** Latest minus first within range. Negative = lost weight. */
  netChangeLbs: number;
  /** Average weekly change inside range. */
  weeklyRateLbs: number;
  /** Higher-level direction signal. */
  direction: WeightTrendDirection;
}

export interface StreakWeekDay {
  /** Local YYYY-MM-DD */
  date: string;
  /** S M T W T F S (locale-agnostic single char) */
  label: string;
  /** True if at least one meal was logged that day. */
  logged: boolean;
  /** True if this is today. */
  isToday: boolean;
}

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string | null;
  /** Last 7 days oriented Monday-first by `weekStart`. */
  week: StreakWeekDay[];
  /** True if user has not logged today AND has an active streak. */
  atRisk: boolean;
}

export interface GoalProgress {
  /** 0..100 — weight progress toward goal from start weight. */
  percent: number;
  remainingLbs: number | null;
  /** True when within ~2 lbs of goal. */
  closeToGoal: boolean;
}

export interface ConsistencyScore {
  /** 0..100 */
  score: number;
  daysLogged: number;
  daysTotal: number;
  /** Compared to previous equal window. Positive = improving. */
  deltaVsPreviousWindow: number;
}

export interface BMIInfo {
  bmi: number | null;
  classification:
    | "underweight"
    | "healthy"
    | "overweight"
    | "obese"
    | "unknown";
  /** Position 0..1 across the BMI scale (15..40 clamped). */
  scalePosition: number;
}

// ── Internal helpers ───────────────────────────────────────────────────

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"] as const;
const MS_PER_DAY = 86_400_000;

function toISO(date: Date): string {
  return toLocalDate(date);
}

function startOfLocalDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function rangeToWindowDays(range: DashboardRange): number | null {
  switch (range) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    case "all":
      return null;
  }
}

function getRangeStartIso(
  range: DashboardRange,
  earliestDataIso: string | null
): string {
  const today = startOfLocalDay(new Date());
  const days = rangeToWindowDays(range);
  if (days != null) {
    const start = new Date(today.getTime() - (days - 1) * MS_PER_DAY);
    return toISO(start);
  }
  return earliestDataIso ?? toISO(today);
}

function buildDateList(startIso: string, endIso: string): string[] {
  const dates: string[] = [];
  const start = new Date(`${startIso}T12:00:00`);
  const end = new Date(`${endIso}T12:00:00`);
  while (start <= end) {
    dates.push(toISO(start));
    start.setDate(start.getDate() + 1);
  }
  return dates;
}

function shortDateLabel(iso: string, range: DashboardRange): string {
  const d = new Date(`${iso}T12:00:00`);
  if (range === "7d") return DAY_LABELS[d.getDay()];
  if (range === "30d" || range === "90d") {
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  return `${String(d.getFullYear()).slice(2)}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ── Public selectors ───────────────────────────────────────────────────

/**
 * Build day-by-day stacked macro points for the given range.
 * Empty days are kept (calories=0) so the chart visualises gaps.
 */
export function getMacroBreakdown(
  meals: MealEntry[],
  range: DashboardRange
): DailyStackPoint[] {
  const today = startOfLocalDay(new Date());
  const todayIso = toISO(today);
  const earliestIso = meals.length
    ? meals
        .map((m) => toLocalDate(new Date(m.loggedAt)))
        .reduce((min, cur) => (cur < min ? cur : min))
    : todayIso;
  const startIso = getRangeStartIso(range, earliestIso);
  const dates = buildDateList(startIso, todayIso);

  return dates.map((date) => {
    const dayMeals = getMealsForDate(meals, date);
    const totals = getNutritionTotals(dayMeals);
    return {
      date,
      label: shortDateLabel(date, range),
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein),
      carbs: Math.round(totals.carbs),
      fat: Math.round(totals.fat),
    };
  });
}

/** Average kcal across all days WITH meals in the range. */
export function getAverageCalories(
  meals: MealEntry[],
  range: DashboardRange
): { avgCalories: number; avgMacros: MacroBreakdown; daysLogged: number } {
  const points = getMacroBreakdown(meals, range);
  let cal = 0;
  let p = 0;
  let c = 0;
  let f = 0;
  let logged = 0;
  for (const pt of points) {
    if (pt.calories > 0) {
      cal += pt.calories;
      p += pt.protein;
      c += pt.carbs;
      f += pt.fat;
      logged += 1;
    }
  }
  const denom = logged || 1;
  return {
    avgCalories: Math.round(cal / denom),
    avgMacros: {
      protein: Math.round(p / denom),
      carbs: Math.round(c / denom),
      fat: Math.round(f / denom),
    },
    daysLogged: logged,
  };
}

/** Weight trend within range with weekly-rate + direction signal. */
export function getWeightTrend(
  weightLogs: WeightLog[],
  range: DashboardRange
): WeightTrend {
  if (weightLogs.length === 0) {
    return { points: [], netChangeLbs: 0, weeklyRateLbs: 0, direction: "none" };
  }

  const today = startOfLocalDay(new Date());
  const todayIso = toISO(today);
  const earliestIso = weightLogs[weightLogs.length - 1].date;
  const startIso = getRangeStartIso(range, earliestIso);

  // Keep one log per day (latest), filtered to range.
  const byDay = new Map<string, WeightLog>();
  for (const log of [...weightLogs].reverse()) {
    if (log.date >= startIso && log.date <= todayIso) {
      byDay.set(log.date, log);
    }
  }
  const points: WeightTrendPoint[] = Array.from(byDay.values())
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((log) => ({
      date: log.date,
      label: shortDateLabel(log.date, range),
      weightLbs: log.weightLbs,
    }));

  if (points.length === 0) {
    return { points, netChangeLbs: 0, weeklyRateLbs: 0, direction: "none" };
  }

  const first = points[0].weightLbs;
  const last = points[points.length - 1].weightLbs;
  const netChangeLbs = +(last - first).toFixed(1);

  const firstDate = new Date(`${points[0].date}T12:00:00`).getTime();
  const lastDate = new Date(
    `${points[points.length - 1].date}T12:00:00`
  ).getTime();
  const weeks = Math.max((lastDate - firstDate) / (7 * MS_PER_DAY), 1 / 7);
  const weeklyRateLbs = +(netChangeLbs / weeks).toFixed(2);

  let direction: WeightTrend["direction"] = "flat";
  if (Math.abs(netChangeLbs) >= 0.3) {
    direction = netChangeLbs < 0 ? "down" : "up";
  }

  return { points, netChangeLbs, weeklyRateLbs, direction };
}

/** Compute % progress and remaining toward goal weight. */
export function getGoalProgress(
  startWeightLbs: number | null,
  currentWeightLbs: number | null,
  goalWeightLbs: number | null
): GoalProgress {
  if (
    startWeightLbs == null ||
    currentWeightLbs == null ||
    goalWeightLbs == null
  ) {
    return { percent: 0, remainingLbs: null, closeToGoal: false };
  }

  const totalDelta = startWeightLbs - goalWeightLbs;
  if (Math.abs(totalDelta) < 0.01) {
    return { percent: 100, remainingLbs: 0, closeToGoal: true };
  }

  const achieved = startWeightLbs - currentWeightLbs;
  const rawPercent = (achieved / totalDelta) * 100;
  const percent = Math.max(0, Math.min(100, Math.round(rawPercent)));
  const remainingLbs = +(currentWeightLbs - goalWeightLbs).toFixed(1);
  const closeToGoal = Math.abs(remainingLbs) <= 2;

  return { percent, remainingLbs, closeToGoal };
}

/**
 * 7-day streak strip + risk flag.
 * Streak count and last-log date are derived from local meals so the headline
 * always matches the week dots (same rules as computeLocalStreak).
 */
export function getStreakData(
  meals: MealEntry[],
  longestStreak: number
): StreakSummary {
  const today = startOfLocalDay(new Date());
  const todayIso = toISO(today);
  const week: StreakWeekDay[] = [];
  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(today.getTime() - offset * MS_PER_DAY);
    const iso = toISO(d);
    const logged = getMealsForDate(meals, iso).length > 0;
    week.push({
      date: iso,
      label: DAY_LABELS[d.getDay()],
      logged,
      isToday: iso === todayIso,
    });
  }
  const currentStreak = computeCurrentStreakFromMeals(meals);
  const lastLogDate = getMostRecentLoggedMealDate(meals);
  const loggedToday = week.some((day) => day.isToday && day.logged);
  const atRisk = currentStreak > 0 && !loggedToday;
  return { currentStreak, longestStreak, lastLogDate, week, atRisk };
}

/** % of days in range where meals were logged, plus delta vs previous window. */
export function getConsistencyScore(
  meals: MealEntry[],
  range: DashboardRange
): ConsistencyScore {
  const points = getMacroBreakdown(meals, range);
  const daysLogged = points.filter((p) => p.calories > 0).length;
  const daysTotal = points.length || 1;
  const score = Math.round((daysLogged / daysTotal) * 100);

  // Previous equal window (skip for "all").
  const days = rangeToWindowDays(range);
  let deltaVsPreviousWindow = 0;
  if (days != null) {
    const today = startOfLocalDay(new Date());
    const prevEnd = new Date(today.getTime() - days * MS_PER_DAY);
    const prevStart = new Date(prevEnd.getTime() - (days - 1) * MS_PER_DAY);
    const prevDates = buildDateList(toISO(prevStart), toISO(prevEnd));
    const prevLogged = prevDates.filter(
      (d) => getMealsForDate(meals, d).length > 0
    ).length;
    const prevScore = Math.round((prevLogged / Math.max(prevDates.length, 1)) * 100);
    deltaVsPreviousWindow = score - prevScore;
  }

  return { score, daysLogged, daysTotal, deltaVsPreviousWindow };
}

// ── Dynamic-card signal selectors ─────────────────────────────────────

export type WeightConfidence =
  | "on_track"
  | "too_fast"
  | "stalling"
  | "off_pace"
  | "no_data";

/**
 * Confidence signal for the Weight card.
 *
 *   - on_track  : actual weekly rate within 30% of plan rate
 *   - too_fast  : actual rate exceeds plan magnitude by ≥50%
 *                 (e.g. losing 2.0 lbs/wk when plan is 1.0 lbs/wk)
 *   - stalling  : plan != 0 AND |actual| < 0.15 lbs/wk for ≥14 days
 *   - off_pace  : sign mismatch OR |actual| < 50% of |plan|
 *   - no_data   : insufficient signal
 */
export function getWeightConfidence(
  actualWeeklyRateLbs: number,
  targetWeeklyRateLbs: number,
  weightPointsInRange: number,
  daysOfWeightHistory: number
): WeightConfidence {
  if (weightPointsInRange < 2) return "no_data";

  const target = targetWeeklyRateLbs;
  const actual = actualWeeklyRateLbs;

  // Maintenance plans: target ≈ 0. Treat |actual| > 0.5 lbs/wk as drifting.
  if (Math.abs(target) < 0.05) {
    if (Math.abs(actual) <= 0.3) return "on_track";
    return "off_pace";
  }

  const sameSign = Math.sign(actual) === Math.sign(target);
  const absActual = Math.abs(actual);
  const absTarget = Math.abs(target);

  // Stalling: at least 2 weeks of data but barely any movement on a non-zero plan.
  if (daysOfWeightHistory >= 14 && absActual < 0.15) return "stalling";

  if (!sameSign) return "off_pace";

  if (absActual >= absTarget * 1.5) return "too_fast";
  if (absActual < absTarget * 0.5) return "off_pace";

  return "on_track";
}

/** Latest weight minus the oldest weight in the same range. */
export function getPeriodDeltaLbs(
  weightLogs: WeightLog[],
  range: DashboardRange
): number | null {
  if (weightLogs.length < 2) return null;
  const trend = getWeightTrend(weightLogs, range);
  if (trend.points.length < 2) return null;
  return +trend.netChangeLbs.toFixed(1);
}

export type StreakRisk = "safe" | "at_risk" | "critical";

/**
 * Streak risk state machine — drives banner color + pulse animation
 * on the streak card.
 *
 *   - safe     : logged today, streak intact
 *   - at_risk  : streak ≥ 1, no log today, hour < 18
 *   - critical : streak ≥ 3, no log today, hour ≥ 18
 *
 * Users with no streak fall through to "safe" — the card just shows
 * neutral state, no fake urgency.
 */
export function getStreakRisk(
  currentStreak: number,
  loggedToday: boolean,
  hour: number
): StreakRisk {
  if (loggedToday) return "safe";
  if (currentStreak < 1) return "safe";
  if (currentStreak >= 3 && hour >= 18) return "critical";
  return "at_risk";
}

export type StreakUrgency =
  | "none"
  | "log_today"
  | "log_tonight"
  | "log_before_midnight";

/**
 * Time-of-day urgency. Independent of risk so we can decide cell text
 * per-state in the UI without re-deriving from raw hour.
 */
export function getStreakUrgency(
  loggedToday: boolean,
  hour: number
): StreakUrgency {
  if (loggedToday) return "none";
  if (hour >= 22) return "log_before_midnight";
  if (hour >= 18) return "log_tonight";
  return "log_today";
}

export interface NextMilestone {
  /** Milestone value (3, 7, 14, 30, 60, 100, 365). */
  value: number;
  /** Days until the user would reach it (assumes uninterrupted streak). */
  daysAway: number;
  /** True if hitting `value` would also tie/beat their longest-ever streak. */
  beatsPersonalBest: boolean;
}

const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365] as const;

export function getNextMilestone(
  currentStreak: number,
  longestStreak: number
): NextMilestone | null {
  if (currentStreak < 0) return null;

  // Personal-best chase takes precedence — it's the most motivating target.
  if (longestStreak > currentStreak && longestStreak > 0) {
    const daysAway = longestStreak + 1 - currentStreak;
    if (daysAway <= 30) {
      return {
        value: longestStreak + 1,
        daysAway,
        beatsPersonalBest: true,
      };
    }
  }

  const next = STREAK_MILESTONES.find((m) => m > currentStreak);
  if (next == null) return null;
  return {
    value: next,
    daysAway: next - currentStreak,
    beatsPersonalBest: next > longestStreak,
  };
}

export type TrendLabel =
  | "perfect_pace"
  | "losing_too_fast"
  | "gaining_too_fast"
  | "plateau"
  | "drifting_up"
  | "drifting_down"
  | "holding_steady"
  | "no_data";

/**
 * Goal-aware trend interpretation. Used as the GoalChartCard subtitle.
 */
export function getTrendLabel(
  weeklyRateLbs: number,
  targetWeeklyRateLbs: number,
  goalType: GoalType | null,
  pointsInRange: number,
  daysOfHistory: number
): TrendLabel {
  if (pointsInRange < 2) return "no_data";

  // Maintenance: small drifts get explicit feedback.
  if (goalType === "maintain" || Math.abs(targetWeeklyRateLbs) < 0.05) {
    if (Math.abs(weeklyRateLbs) <= 0.3) return "holding_steady";
    return weeklyRateLbs > 0 ? "drifting_up" : "drifting_down";
  }

  // Plateau: ≥2 weeks of data but movement is essentially flat.
  if (daysOfHistory >= 14 && Math.abs(weeklyRateLbs) < 0.15) return "plateau";

  const confidence = getWeightConfidence(
    weeklyRateLbs,
    targetWeeklyRateLbs,
    pointsInRange,
    daysOfHistory
  );

  if (confidence === "on_track") return "perfect_pace";
  if (confidence === "stalling") return "plateau";

  // Direction-specific labels.
  if (goalType === "lose") {
    if (weeklyRateLbs < 0 && Math.abs(weeklyRateLbs) >= Math.abs(targetWeeklyRateLbs) * 1.5) {
      return "losing_too_fast";
    }
    if (weeklyRateLbs >= 0) return "drifting_up";
    return "drifting_down";
  }

  if (goalType === "gain") {
    if (weeklyRateLbs > 0 && weeklyRateLbs >= Math.abs(targetWeeklyRateLbs) * 1.5) {
      return "gaining_too_fast";
    }
    if (weeklyRateLbs <= 0) return "drifting_down";
    return "drifting_up";
  }

  return "holding_steady";
}

export interface MacroBalanceFeedback {
  /** Worst-offender macro signal — drives the headline copy. */
  primary:
    | "balanced"
    | "protein_low"
    | "protein_high"
    | "fat_high"
    | "fat_low"
    | "carbs_high"
    | "carbs_low"
    | "no_data";
  /** Estimated daily gap in grams toward the target (always non-negative). */
  proteinGapG: number;
  /** Optional secondary note (e.g. fat high while protein low). */
  secondary?:
    | "fat_high"
    | "carbs_high"
    | "fat_low"
    | "carbs_low";
}

/**
 * Compares 7d (or current-window) macro averages to plan targets.
 *
 * Severity precedence (high → low):
 *   protein_low (most behavior-changing) →
 *   fat_high → carbs_high → other deviations.
 */
export function getMacroBalanceFeedback(
  avgMacros: MacroBreakdown,
  targets: MacroTargets | null,
  hasLoggedDays: boolean
): MacroBalanceFeedback {
  if (!hasLoggedDays || !targets) {
    return { primary: "no_data", proteinGapG: 0 };
  }

  const proteinPct =
    targets.protein > 0 ? avgMacros.protein / targets.protein : 1;
  const carbsPct = targets.carbs > 0 ? avgMacros.carbs / targets.carbs : 1;
  const fatPct = targets.fat > 0 ? avgMacros.fat / targets.fat : 1;

  const proteinGap = Math.max(
    0,
    Math.round((targets.protein || 0) - (avgMacros.protein || 0))
  );

  // Primary issue — protein is the most behaviorally impactful macro.
  let primary: MacroBalanceFeedback["primary"] = "balanced";
  if (proteinPct < 0.8) primary = "protein_low";
  else if (fatPct > 1.3) primary = "fat_high";
  else if (carbsPct > 1.3) primary = "carbs_high";
  else if (proteinPct > 1.4) primary = "protein_high";
  else if (fatPct < 0.6) primary = "fat_low";
  else if (carbsPct < 0.6) primary = "carbs_low";

  // Secondary context.
  let secondary: MacroBalanceFeedback["secondary"];
  if (primary === "protein_low") {
    if (fatPct > 1.3) secondary = "fat_high";
    else if (carbsPct > 1.3) secondary = "carbs_high";
  }

  return { primary, proteinGapG: proteinGap, secondary };
}

export interface BestWorstDay {
  date: string;
  label: string;
  calories: number;
}

/**
 * Best day = closest to budget AND ≥0.9× protein target.
 * Worst day = furthest from budget (over OR under) among logged days.
 */
export function getBestWorstDay(
  points: DailyStackPoint[],
  budget: number,
  proteinTarget: number
): { best: BestWorstDay | null; worst: BestWorstDay | null } {
  const logged = points.filter((p) => p.calories > 0);
  if (logged.length === 0 || budget <= 0) {
    return { best: null, worst: null };
  }

  let best: DailyStackPoint | null = null;
  let bestScore = Infinity;
  let worst: DailyStackPoint | null = null;
  let worstScore = -Infinity;

  for (const p of logged) {
    const calDeviation = Math.abs(p.calories - budget) / budget;
    const proteinPenalty =
      proteinTarget > 0
        ? Math.max(0, 1 - p.protein / proteinTarget) // 0 = on/over target, 1 = nothing
        : 0;
    const bestScoreForDay = calDeviation + proteinPenalty * 0.4;
    const worstScoreForDay = calDeviation;

    if (bestScoreForDay < bestScore) {
      bestScore = bestScoreForDay;
      best = p;
    }
    if (worstScoreForDay > worstScore) {
      worstScore = worstScoreForDay;
      worst = p;
    }
  }

  return {
    best: best
      ? { date: best.date, label: best.label, calories: best.calories }
      : null,
    worst: worst
      ? { date: worst.date, label: worst.label, calories: worst.calories }
      : null,
  };
}

export type WeeklyScoreLabel =
  | "excellent"
  | "good"
  | "fair"
  | "needs_work"
  | "no_data";

export interface WeeklyPerformance {
  /** 0..100 composite score. */
  score: number;
  label: WeeklyScoreLabel;
  /** Per-pillar 0..100 breakdown. */
  breakdown: {
    calories: number;
    protein: number;
    consistency: number;
  };
}

/**
 * Composite weekly performance score:
 *
 *   50% calorie adherence (% logged days within ±10% of budget)
 *   30% protein adherence (% logged days hitting ≥80% of protein target)
 *   20% logging consistency (logged days / 7)
 *
 * If protein target is 0 (no plan), reweight calories=70 / consistency=30.
 * If budget is 0, fall back to consistency=100% weight (never crashes).
 */
export function getWeeklyPerformance(
  meals: MealEntry[],
  budget: number,
  proteinTarget: number
): WeeklyPerformance {
  const points = getMacroBreakdown(meals, "7d");
  const total = points.length || 7;
  const logged = points.filter((p) => p.calories > 0);

  if (logged.length === 0) {
    return {
      score: 0,
      label: "no_data",
      breakdown: { calories: 0, protein: 0, consistency: 0 },
    };
  }

  const calorieScore =
    budget > 0
      ? Math.round(
          (logged.filter((p) => {
            const r = p.calories / budget;
            return r >= 0.9 && r <= 1.1;
          }).length /
            logged.length) *
            100
        )
      : 0;

  const proteinScore =
    proteinTarget > 0
      ? Math.round(
          (logged.filter((p) => p.protein >= proteinTarget * 0.8).length /
            logged.length) *
            100
        )
      : 0;

  const consistencyScore = Math.round((logged.length / total) * 100);

  let composite: number;
  if (budget <= 0 && proteinTarget <= 0) {
    composite = consistencyScore;
  } else if (proteinTarget <= 0) {
    composite = Math.round(calorieScore * 0.7 + consistencyScore * 0.3);
  } else if (budget <= 0) {
    composite = Math.round(proteinScore * 0.7 + consistencyScore * 0.3);
  } else {
    composite = Math.round(
      calorieScore * 0.5 + proteinScore * 0.3 + consistencyScore * 0.2
    );
  }
  composite = Math.max(0, Math.min(100, composite));

  let label: WeeklyScoreLabel;
  if (composite >= 90) label = "excellent";
  else if (composite >= 70) label = "good";
  else if (composite >= 50) label = "fair";
  else label = "needs_work";

  return {
    score: composite,
    label,
    breakdown: {
      calories: calorieScore,
      protein: proteinScore,
      consistency: consistencyScore,
    },
  };
}

/** BMI info from height + current weight. */
export function getBMI(
  heightCm: number | null,
  currentWeightLbs: number | null
): BMIInfo {
  if (!heightCm || !currentWeightLbs) {
    return { bmi: null, classification: "unknown", scalePosition: 0 };
  }
  const kg = currentWeightLbs * 0.453592;
  const m = heightCm / 100;
  const bmi = +(kg / (m * m)).toFixed(1);

  let classification: BMIInfo["classification"] = "healthy";
  if (bmi < 18.5) classification = "underweight";
  else if (bmi >= 25 && bmi < 30) classification = "overweight";
  else if (bmi >= 30) classification = "obese";

  const clamped = Math.max(15, Math.min(40, bmi));
  const scalePosition = (clamped - 15) / (40 - 15);
  return { bmi, classification, scalePosition };
}
