import type { Router } from "expo-router";
import { addFoodLoggingBreadcrumb } from "../../infrastructure/errorReporting/foodLoggingErrors";
import { FOOD_LOG_POST_SAVE_NAV_MODE } from "../debug/safe-mode-flags";
import { DISABLE_TRACK_NAVIGATION_AFTER_SAVE } from "./post-save-debug-flags";
import { TRACK_CALORIES_HOME_HREF } from "./track-calories.constants";
import { logTrackCaloriesFlow } from "./track-calories-flow-log";

export type MealLogNavigationMethod =
  | "replace_home"
  | "dismiss_all"
  | "back"
  | "none";

let lastNavigationMethod: MealLogNavigationMethod = "none";

/** Exposed for tests — which navigation branch ran last. */
export function getLastMealLogNavigationMethod(): MealLogNavigationMethod {
  return lastNavigationMethod;
}

export function resetLastMealLogNavigationMethodForTests(): void {
  lastNavigationMethod = "none";
}

/**
 * Post-save navigation. Behavior is bisectable via FOOD_LOG_POST_SAVE_NAV_MODE.
 *
 *   "none"        → don't navigate at all
 *   "replaceTabs" → router.replace("/(tabs)") (default)
 *   "dismissAll"  → router.dismissAll()
 *   "back"        → router.back()
 *
 * Run them in this order to isolate the crash:
 *   1. none        — proves save+store is stable
 *   2. replaceTabs — current behavior
 *   3. dismissAll  — modal dismissal stack
 *   4. back        — single back step
 */
export function replaceHomeAfterMealLog(
  router: Router,
  meta: { pathname: string; segments: readonly string[] }
): void {
  if (DISABLE_TRACK_NAVIGATION_AFTER_SAVE) {
    lastNavigationMethod = "none";
    addFoodLoggingBreadcrumb("food_logging.TrackCaloriesNavigation", {
      action: "debug_skip_nav",
      target: TRACK_CALORIES_HOME_HREF,
      routeBefore: meta.pathname,
      segmentsBefore: meta.segments.join("/"),
    });
    return;
  }

  if (__DEV__) {
    console.log("[PostSaveNav]", {
      mode: FOOD_LOG_POST_SAVE_NAV_MODE,
      from: meta.pathname,
      segments: meta.segments.join("/"),
    });
  }

  switch (FOOD_LOG_POST_SAVE_NAV_MODE) {
    case "none": {
      lastNavigationMethod = "none";
      addFoodLoggingBreadcrumb("food_logging.TrackCaloriesNavigation", {
        action: "post_save_nav_mode_none",
        target: "stay",
        routeBefore: meta.pathname,
        segmentsBefore: meta.segments.join("/"),
      });
      // Persistent crash marker so we can prove we returned from the helper
      // without touching the navigator. Distinct flowId per call so it never
      // overwrites a real Track Calories breadcrumb.
      logTrackCaloriesFlow({
        phase: "post_save_nav_none_returned",
        flowId: `nav_none_${Date.now().toString(36)}`,
      });
      return;
    }

    case "dismissAll": {
      lastNavigationMethod = "dismiss_all";
      addFoodLoggingBreadcrumb("food_logging.TrackCaloriesNavigation", {
        action: "dismiss_all",
        target: "tabs_via_dismiss",
        routeBefore: meta.pathname,
        segmentsBefore: meta.segments.join("/"),
      });
      try {
        // dismissAll is a modal-stack op; some Expo Router versions throw if
        // nothing is on the stack. Catch and fall back to replace so we never
        // leave the user stuck on the confirm screen.
        (router as unknown as { dismissAll?: () => void }).dismissAll?.();
      } catch (err) {
        if (__DEV__) {
          console.warn("[PostSaveNav] dismissAll threw, falling back", err);
        }
        router.replace(TRACK_CALORIES_HOME_HREF as never);
      }
      return;
    }

    case "back": {
      lastNavigationMethod = "back";
      addFoodLoggingBreadcrumb("food_logging.TrackCaloriesNavigation", {
        action: "back",
        target: "previous_route",
        routeBefore: meta.pathname,
        segmentsBefore: meta.segments.join("/"),
      });
      try {
        router.back();
      } catch (err) {
        if (__DEV__) {
          console.warn("[PostSaveNav] back threw, falling back", err);
        }
        router.replace(TRACK_CALORIES_HOME_HREF as never);
      }
      return;
    }

    case "replaceTabs":
    default: {
      lastNavigationMethod = "replace_home";
      addFoodLoggingBreadcrumb("food_logging.TrackCaloriesNavigation", {
        action: "replace_home",
        target: TRACK_CALORIES_HOME_HREF,
        routeBefore: meta.pathname,
        segmentsBefore: meta.segments.join("/"),
      });
      router.replace(TRACK_CALORIES_HOME_HREF as never);
      return;
    }
  }
}

/**
 * @deprecated alias — same as {@link replaceHomeAfterMealLog}.
 */
export function safeReturnToHomeAfterMealLog(
  router: Router,
  meta?: { pathname: string; segments: readonly string[] }
): void {
  replaceHomeAfterMealLog(router, meta ?? { pathname: "", segments: [] });
}
