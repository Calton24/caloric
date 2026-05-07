/**
 * Track Calories flow — console + breadcrumbs + AsyncStorage crash marker.
 * Survives native crashes better than Sentry email alone.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { addFoodLoggingBreadcrumb } from "../../infrastructure/errorReporting/foodLoggingErrors";
const STORAGE_KEY = "last_track_calories_phase";

export type TrackCaloriesFlowPhase =
  | "press"
  | "validate_start"
  | "validate_success"
  | "save_start"
  | "save_success"
  | "draft_clear_start"
  | "draft_clear_success"
  | "post_save_before_navigation_decision"
  | "post_save_exit_start"
  | "post_save_exit_success"
  | "post_save_nav_none_returned"
  | "navigate_home_skipped"
  | "finally_start"
  | "finally_success";

export type TrackCaloriesFlowPayload = {
  phase: TrackCaloriesFlowPhase;
  flowId: string;
  source?: string;
  title?: string;
  calories?: number;
  mealId?: string;
};

function persistPhase(payload: TrackCaloriesFlowPayload): void {
  void AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      ...payload,
      at: new Date().toISOString(),
    }),
  ).catch(() => {});
}

/** Read on boot; logs [LastCrashMarker] in dev. */
export async function logLastTrackCaloriesPhaseMarker(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (__DEV__ && raw) {
      console.log("[LastCrashMarker]", { last_track_calories_phase: raw });
    }
  } catch {
    /* ignore */
  }
}

/**
 * Console + Sentry breadcrumb + optional AsyncStorage (last substantive phase).
 */
export function logTrackCaloriesFlow(
  payload: TrackCaloriesFlowPayload,
  opts?: { persist?: boolean }
): void {
  const persist = opts?.persist !== false;
  if (__DEV__) {
    console.log(`[TrackCaloriesFlow] ${payload.phase}`, {
      flowId: payload.flowId,
      source: payload.source,
      title: payload.title,
      calories: payload.calories,
      mealId: payload.mealId,
    });
  }
  addFoodLoggingBreadcrumb(`food_logging.TrackCaloriesFlow.${payload.phase}`, {
    flowId: payload.flowId,
    source: payload.source,
    title:
      payload.title && payload.title.length > 80
        ? `${payload.title.slice(0, 80)}…`
        : payload.title,
    calories: payload.calories,
    mealId: payload.mealId,
  });
  if (persist) {
    persistPhase(payload);
  }
}
