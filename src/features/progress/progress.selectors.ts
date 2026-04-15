import { WeightLog } from "./progress.types";

export function getLatestWeight(weightLogs: WeightLog[]): number | null {
  if (!weightLogs.length) return null;
  return weightLogs[0].weightLbs;
}

export function getWeightTrendPercentage(weightLogs: WeightLog[]): number | null {
  if (weightLogs.length < 2) return null;

  const latest = weightLogs[0].weightLbs;
  const previous = weightLogs[1].weightLbs;

  if (previous === 0) return null;

  return Number((((latest - previous) / previous) * 100).toFixed(1));
}
