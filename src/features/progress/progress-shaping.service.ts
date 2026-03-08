import { WeightLog } from "./progress.types";

export type ProgressPeriod = "week" | "month" | "year";

export interface ChartPoint {
  label: string;
  value: number;
}

/**
 * Filter weight logs to only those within a given period.
 */
function filterLogsByPeriod(
  weightLogs: WeightLog[],
  period: ProgressPeriod
): WeightLog[] {
  if (weightLogs.length === 0) return [];

  const now = new Date();
  let cutoff: Date;

  switch (period) {
    case "week":
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 7);
      break;
    case "month":
      cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - 30);
      break;
    case "year":
      cutoff = new Date(now);
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      break;
  }

  const cutoffStr = cutoff.toISOString().split("T")[0];
  return weightLogs.filter((log) => log.date >= cutoffStr);
}

/**
 * Get chart-ready data points for the weekly view.
 * Groups by day-of-week label, takes latest per day.
 */
export function getWeeklyChartPoints(weightLogs: WeightLog[]): ChartPoint[] {
  const filtered = filterLogsByPeriod(weightLogs, "week");
  if (filtered.length === 0) return [];

  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];
  const byDay = new Map<string, WeightLog>();

  // weightLogs are sorted newest-first, so iterate reversed to keep latest
  for (const log of [...filtered].reverse()) {
    byDay.set(log.date, log);
  }

  return Array.from(byDay.values())
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((log) => ({
      label: dayLabels[new Date(log.date + "T12:00:00").getDay()],
      value: log.weightLbs,
    }));
}

/**
 * Get chart-ready data points for the monthly view.
 * Groups by date label (M/D), takes latest per day.
 */
export function getMonthlyChartPoints(weightLogs: WeightLog[]): ChartPoint[] {
  const filtered = filterLogsByPeriod(weightLogs, "month");
  if (filtered.length === 0) return [];

  const byDay = new Map<string, WeightLog>();

  for (const log of [...filtered].reverse()) {
    byDay.set(log.date, log);
  }

  return Array.from(byDay.values())
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((log) => {
      const d = new Date(log.date + "T12:00:00");
      return {
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        value: log.weightLbs,
      };
    });
}

/**
 * Get chart-ready data points for the yearly view.
 * Groups by month, averages within each month.
 */
export function getYearlyChartPoints(weightLogs: WeightLog[]): ChartPoint[] {
  const filtered = filterLogsByPeriod(weightLogs, "year");
  if (filtered.length === 0) return [];

  const monthNames = [
    "J",
    "F",
    "M",
    "A",
    "M",
    "J",
    "J",
    "A",
    "S",
    "O",
    "N",
    "D",
  ];

  const byMonth = new Map<number, number[]>();

  for (const log of filtered) {
    const month = new Date(log.date + "T12:00:00").getMonth();
    const existing = byMonth.get(month) ?? [];
    existing.push(log.weightLbs);
    byMonth.set(month, existing);
  }

  return Array.from(byMonth.entries())
    .sort(([a], [b]) => a - b)
    .map(([month, weights]) => ({
      label: monthNames[month],
      value:
        Math.round((weights.reduce((s, w) => s + w, 0) / weights.length) * 10) /
        10,
    }));
}

/**
 * Get chart points for a given segment index (0=week, 1=month, 2=year).
 */
export function getChartPointsForSegment(
  weightLogs: WeightLog[],
  segmentIndex: number
): ChartPoint[] {
  switch (segmentIndex) {
    case 0:
      return getWeeklyChartPoints(weightLogs);
    case 1:
      return getMonthlyChartPoints(weightLogs);
    case 2:
      return getYearlyChartPoints(weightLogs);
    default:
      return getWeeklyChartPoints(weightLogs);
  }
}

/**
 * Calculate weight stats for the summary card.
 */
export function getWeightStats(
  weightLogs: WeightLog[],
  goalWeightLbs: number | null
) {
  if (weightLogs.length === 0) {
    return {
      currentWeight: null,
      startWeight: null,
      totalChange: 0,
      remaining: goalWeightLbs ? null : null,
      averageWeight: null,
    };
  }

  const currentWeight = weightLogs[0].weightLbs;
  const startWeight = weightLogs[weightLogs.length - 1].weightLbs;
  const totalChange = currentWeight - startWeight;
  const remaining =
    goalWeightLbs != null ? currentWeight - goalWeightLbs : null;
  const averageWeight =
    Math.round(
      (weightLogs.reduce((s, l) => s + l.weightLbs, 0) / weightLogs.length) * 10
    ) / 10;

  return {
    currentWeight,
    startWeight,
    totalChange,
    remaining,
    averageWeight,
  };
}
