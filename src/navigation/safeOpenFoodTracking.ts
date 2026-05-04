/**
 * Safe navigation into the food tracking launcher modal.
 * Prevents double-taps, captures failures, and surfaces a fallback alert.
 */

import { router } from "expo-router";
import { Alert } from "react-native";
import {
  addFoodLoggingBreadcrumb,
  captureFoodLoggingError,
} from "../infrastructure/errorReporting/foodLoggingErrors";
import { haptics } from "../infrastructure/haptics";

const TRACKING_HREF = "/(modals)/tracking" as const;

let lastOpenAt = 0;
const DEBOUNCE_MS = 700;

export type FoodTrackingSource =
  | "home_fab"
  | "tabs_log_sheet"
  | "coach_insight"
  | "milestone"
  | "quick_action"
  | "insight_engine"
  | "other";

export interface SafeOpenFoodTrackingOptions {
  /** Where the user initiated open (for breadcrumbs). */
  source: FoodTrackingSource;
  /** Current pathname from usePathname() when available. */
  currentRoute?: string;
  userIdPresent?: boolean;
  /** Optional subscription flag for observability (boolean only). */
  isSubscriber?: boolean;
}

/**
 * Opens `/(modals)/tracking` with debounce, haptics, breadcrumbs, and error capture.
 */
export function safeOpenFoodTracking(options: SafeOpenFoodTrackingOptions): void {
  const now = Date.now();
  if (now - lastOpenAt < DEBOUNCE_MS) {
    addFoodLoggingBreadcrumb("food_logging.track_cta_debounced", {
      source: options.source,
      route: options.currentRoute,
      user_present: options.userIdPresent,
      subscriber: options.isSubscriber,
    });
    return;
  }
  lastOpenAt = now;

  addFoodLoggingBreadcrumb("food_logging.track_cta_pressed", {
    source: options.source,
    route: options.currentRoute,
    user_present: options.userIdPresent,
    subscriber: options.isSubscriber,
  });

  try {
    haptics.impact("light");
  } catch {
    // haptics must never block navigation
  }

  try {
    router.push(TRACKING_HREF as never);
  } catch (error) {
    captureFoodLoggingError(error, {
      flow: "unknown",
      step: "open_tracking_modal",
      route: options.currentRoute,
    });
    if (typeof Alert !== "undefined" && typeof Alert.alert === "function") {
      Alert.alert(
        "Couldn't open food tracking",
        "Please try again.",
        [{ text: "OK" }]
      );
    }
  }
}

/** @internal Test helper — resets debounce gate between Jest cases. */
export function __resetFoodTrackingDebounceForTests(): void {
  lastOpenAt = 0;
}
