/**
 * Post-save / home isolation flags.
 * When FOOD_LOG_SAFE_MODE is true, all strips default on (local save + nav only).
 */

import { FOOD_LOG_SAFE_MODE } from "../debug/safe-mode-flags";

export const DISABLE_POST_SAVE_STREAK_RECOMPUTE = FOOD_LOG_SAFE_MODE;
export const DISABLE_POST_SAVE_CLOUD_SYNC = FOOD_LOG_SAFE_MODE;
export const DISABLE_POST_SAVE_COACH_INSIGHT_RECOMPUTE = FOOD_LOG_SAFE_MODE;
export const DISABLE_POST_SAVE_HOME_MEAL_DERIVED_EFFECTS = FOOD_LOG_SAFE_MODE;
export const DISABLE_POST_SAVE_HAPTICS = FOOD_LOG_SAFE_MODE;
export const DISABLE_POST_SAVE_ANALYTICS = FOOD_LOG_SAFE_MODE;
export const DISABLE_POST_SAVE_LIVE_ACTIVITY = FOOD_LOG_SAFE_MODE;

/** When true: save + clear draft only; no `router.replace` home (isolate nav vs store). */
export const DISABLE_TRACK_NAVIGATION_AFTER_SAVE = false;
