/**
 * Confirm-meal Track Calories — boring path flags (isolate crashes).
 * Re-enable growth/extras only after save + home is stable.
 */

/** Journey paywall, share milestone, celebration modals, delayed exit. */
export const ENABLE_POST_SAVE_EXTRAS = false;

/** `recordFirstMeal` / retention streak bookkeeping after save. */
export const ENABLE_TRACK_STREAK_RECOMPUTE = false;

/** Challenge insight updates after save. */
export const ENABLE_TRACK_INSIGHT_AND_CHALLENGE = false;

/** Fire-and-forget pending-review server mark (not local linking). */
export const ENABLE_TRACK_CLOUD_PENDING_SYNC = false;

/** App Store review prompt after enough meals (`trackMealAndMaybePromptReview`). */
export const ENABLE_TRACK_APP_STORE_REVIEW_PROMPT = false;

/**
 * Single deterministic route after Track Calories.
 * Project root stack uses `/(tabs)`; index is the home tab screen.
 */
export const TRACK_CALORIES_HOME_HREF = "/(tabs)" as const;

/** Dev-only: force throw in Track Calories handler to verify Sentry. */
export const FORCE_TRACK_CALORIES_TEST_ERROR = false;
