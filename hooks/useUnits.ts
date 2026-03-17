import { useCallback } from "react";
import { useProfileStore } from "../src/features/profile/profile.store";
import type { WeightUnit } from "../src/features/profile/profile.types";
import {
    convertWeight,
    formatWeight,
    toLbs,
    unitLabel,
    weightLargeStep,
    weightStep,
} from "../src/lib/utils/units";

/**
 * useUnits — global unit preference hook
 *
 * Reads `profile.weightUnit` from the profile store and provides
 * helpers for display + conversion. Changing the unit here updates
 * the profile globally (persisted).
 */
export function useUnits() {
  const weightUnit = useProfileStore((s) => s.profile.weightUnit);
  const updateProfile = useProfileStore((s) => s.updateProfile);

  const setWeightUnit = useCallback(
    (unit: WeightUnit) => {
      updateProfile({ weightUnit: unit });
    },
    [updateProfile]
  );

  const toggleWeightUnit = useCallback(() => {
    setWeightUnit(weightUnit === "lbs" ? "kg" : "lbs");
  }, [weightUnit, setWeightUnit]);

  return {
    weightUnit,
    setWeightUnit,
    toggleWeightUnit,
    /** Convert stored lbs to display value */
    display: (lbs: number, decimals?: number) =>
      convertWeight(lbs, weightUnit).toFixed(decimals ?? 1),
    /** Format with unit label: "182.0 lbs" or "82.6 kg" */
    format: (lbs: number, decimals?: number) =>
      formatWeight(lbs, weightUnit, decimals),
    /** Convert display value back to lbs for storage */
    toLbs: (value: number) => toLbs(value, weightUnit),
    /** Unit label: "lbs" or "kg" */
    label: unitLabel(weightUnit),
    /** Small step for steppers */
    step: weightStep(weightUnit),
    /** Large step for steppers */
    largeStep: weightLargeStep(weightUnit),
    /** Is metric? */
    isMetric: weightUnit === "kg",
  };
}
