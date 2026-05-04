import { useCallback } from "react";
import { useAuth } from "../src/features/auth/useAuth";
import { useProfileStore } from "../src/features/profile/profile.store";
import type { WeightUnit } from "../src/features/profile/profile.types";
import { pushUnitPreference } from "../src/features/sync/sync.service";
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
  const { user } = useAuth();
  const weightUnit = useProfileStore((s) => s.profile.weightUnit);
  const heightUnit = useProfileStore((s) => s.profile.heightUnit);
  const updateProfile = useProfileStore((s) => s.updateProfile);

  const setWeightUnit = useCallback(
    (unit: WeightUnit) => {
      const nextHeightUnit: "cm" | "ft_in" = unit === "kg" ? "cm" : "ft_in";
      const userId = user?.id ?? null;

      // Log #1 — fires before ANY conditions, even if unauthenticated
      console.log("[UnitsPersistence] toggle triggered", {
        userId,
        nextWeightUnit: unit,
        nextHeightUnit,
      });

      const now = new Date().toISOString();
      updateProfile({ weightUnit: unit, heightUnit: nextHeightUnit, updatedAt: now });

      // Log #2 — confirm local store updated
      const updated = useProfileStore.getState().profile;
      console.log("[UnitsPersistence] local updated", {
        weightUnit: updated.weightUnit,
        heightUnit: updated.heightUnit,
        updatedAt: updated.updatedAt,
      });

      if (!userId) {
        console.log("[UnitsPersistence] remote write SKIPPED — unauthenticated");
        return;
      }

      // Log #3 — fires immediately before the network call
      console.log("[UnitsPersistence] remote write START", {
        userId,
        weightUnit: updated.weightUnit,
        heightUnit: updated.heightUnit,
        updatedAt: updated.updatedAt,
      });

      void pushUnitPreference(
        userId,
        updated.weightUnit,
        updated.heightUnit,
        updated.updatedAt ?? now
      ).then((result) => {
        // Log #4 — always fires with the exact result from Supabase
        console.log("[UnitsPersistence] remote write RESULT", result);
      });
    },
    [updateProfile, user?.id]
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
