/**
 * Live Activity Feature — Sync Hook
 *
 * Subscribes to goals, nutrition, and permissions stores.
 * Automatically starts / updates / ends the CalorieBudget Live Activity
 * whenever relevant state changes.
 *
 * Mount in app/(main)/_layout.tsx so it stays alive across all main screens.
 */

import { useEffect, useMemo } from "react";
import { toISODate } from "../../lib/utils/date";
import { useGoalsStore } from "../goals/goals.store";
import { getDailyNutritionSummary } from "../nutrition/nutrition.selectors";
import { useNutritionStore } from "../nutrition/nutrition.store";
import { usePermissionsStore } from "../permissions/permissions.store";
import { mapToLiveActivityPayload } from "./live-activity.mapper";
import {
  areLiveActivitiesAvailable,
  endLiveActivity,
  updateLiveActivity,
} from "./live-activity.service";

export function useLiveActivitySync() {
  const plan = useGoalsStore((s) => s.plan);
  const meals = useNutritionStore((s) => s.meals);
  const liveActivitiesEnabled = usePermissionsStore(
    (s) => s.permissions.liveActivitiesEnabled
  );

  const today = toISODate(new Date());

  const dailySummary = useMemo(
    () => getDailyNutritionSummary(meals, today),
    [meals, today]
  );

  const payload = useMemo(
    () => mapToLiveActivityPayload({ plan, dailySummary }),
    [plan, dailySummary]
  );

  // On mount, sync the store flag with native availability.
  // If the user disabled LA in iOS Settings, we turn off the flag.
  useEffect(() => {
    if (liveActivitiesEnabled && !areLiveActivitiesAvailable()) {
      usePermissionsStore.getState().setLiveActivitiesEnabled(false);
    }
  }, [liveActivitiesEnabled]);

  useEffect(() => {
    if (!liveActivitiesEnabled) {
      endLiveActivity();
      return;
    }

    updateLiveActivity(payload);
  }, [liveActivitiesEnabled, payload]);
}
