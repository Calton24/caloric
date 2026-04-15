import type { WeightUnit } from "../../features/profile/profile.types";

const LBS_PER_KG = 2.20462;

/** Convert lbs to the target unit */
export function convertWeight(lbs: number, unit: WeightUnit): number {
  if (unit === "kg") return lbs / LBS_PER_KG;
  return lbs;
}

/** Convert from the given unit back to lbs (for storage) */
export function toLbs(value: number, unit: WeightUnit): number {
  if (unit === "kg") return value * LBS_PER_KG;
  return value;
}

/** Format a weight value with its unit label */
export function formatWeight(
  lbs: number,
  unit: WeightUnit,
  decimals = 1
): string {
  const val = convertWeight(lbs, unit);
  const label = unit === "kg" ? "kg" : "lbs";
  return `${val.toFixed(decimals)} ${label}`;
}

/** Get the unit label string */
export function unitLabel(unit: WeightUnit): string {
  return unit === "kg" ? "kg" : "lbs";
}

/** Appropriate step increment for the unit */
export function weightStep(unit: WeightUnit): number {
  return unit === "kg" ? 0.1 : 0.1;
}

/** Appropriate large step increment */
export function weightLargeStep(unit: WeightUnit): number {
  return unit === "kg" ? 0.5 : 1.0;
}
