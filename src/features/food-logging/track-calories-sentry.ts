/**
 * Sentry scope + breadcrumbs for confirm-meal Track calories.
 * Uses the native SDK directly so tags/context attach even if the reporter
 * singleton is not wired yet in edge cases.
 */

import * as Sentry from "@sentry/react-native";
import { scrubExtra } from "../../infrastructure/errorReporting/reportError";
import type { TrackCaloriesSourceFlow } from "./track-calories-utils";

export type { TrackCaloriesSourceFlow };

export function trackCaloriesSentryPreamble(params: {
  flowId: string;
  sourceFlow: TrackCaloriesSourceFlow;
  mealName: string;
  itemCount: number;
  totalCalories: number;
  route: string;
  draftId: string;
  hasImage: boolean;
  hasBarcode: boolean;
  userId: string;
  timestamp: string;
}): void {
  try {
    Sentry.addBreadcrumb({
      category: "food_logging",
      message: "track_calories_pressed",
      level: "info",
      data: scrubExtra({
        flowId: params.flowId,
        sourceFlow: params.sourceFlow,
        mealName:
          params.mealName.length > 80
            ? `${params.mealName.slice(0, 80)}…`
            : params.mealName,
        itemCount: params.itemCount,
        totalCalories: params.totalCalories,
        route: params.route,
        draftId: params.draftId,
        hasImage: params.hasImage,
        hasBarcode: params.hasBarcode,
        userId: params.userId ? "[present]" : "[absent]",
        timestamp: params.timestamp,
      }),
    });

    Sentry.setContext(
      "confirm_meal",
      scrubExtra({
        flowId: params.flowId,
        mealName:
          params.mealName.length > 80
            ? `${params.mealName.slice(0, 80)}…`
            : params.mealName,
        itemCount: params.itemCount,
        totalCalories: params.totalCalories,
        route: params.route,
        draftId: params.draftId,
        hasImage: params.hasImage,
        hasBarcode: params.hasBarcode,
      })
    );

    Sentry.setTag("food_logging.entry_flow", params.sourceFlow);
    Sentry.setTag("food_logging.confirm_source", params.sourceFlow);
    Sentry.setTag("food_logging.track_pressed", "true");
  } catch {
    /* ignore */
  }
}

export function trackCaloriesPhase(
  message:
    | "track_calories_validate_start"
    | "track_calories_validate_success"
    | "track_calories_validate_failed"
    | "track_calories_save_start"
    | "track_calories_save_success"
    | "track_calories_save_aborted"
    | "track_calories_animation_start"
    | "track_calories_animation_success"
    | "track_calories_animation_skipped"
    | "track_calories_navigation_start"
    | "track_calories_navigation_success"
    | "track_calories_error",
  data?: Record<string, unknown>
): void {
  try {
    Sentry.addBreadcrumb({
      category: "food_logging",
      message,
      level: message.endsWith("_error") ? "error" : "info",
      data: data ? scrubExtra(data) : undefined,
    });
  } catch {
    /* ignore */
  }
}
