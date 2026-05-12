/**
 * Food log crash isolation — master switch.
 *
 * Bisect complete: post-Track-Calories crash was in post-save navigation.
 * FOOD_LOG_POST_SAVE_NAV_MODE is now "dismissAll" (canonical behavior).
 *
 * Safe mode must NEVER gate cloud restore, profile restore, goals, or weight
 * logs. Doing so causes a false `syncRestoredFor` marker while local state
 * is empty — users see 0 meals and wrong weight even though the backend is fine.
 *
 * Safe to gate: Apple Health writes, Live Activities, Analytics, Growth,
 * Haptics, Notifications, Activity Monitor, Presence.
 *
 * See src/features/debug/safe-mode-policy.ts for the policy object.
 */
export const FOOD_LOG_SAFE_MODE = false;

/**
 * Logs an unmissable line proving that the importing site sees the flag.
 * If a runtime subsystem doesn't print this on boot, it's not gated.
 */
export function assertFoodLogSafeModeImport(site: string): void {
  if (__DEV__) {
    // Use string concat to keep the line greppable even if the formatter
    // collapses arguments.
    console.log(
      `[FoodLogSafeModeImport] site="${site}" FOOD_LOG_SAFE_MODE=${FOOD_LOG_SAFE_MODE}`
    );
  }
}

/**
 * Panic test — render a stripped-down home that cannot crash from store/hook
 * usage. Toggle to `true` to repro: tabs index renders only a static
 * "Fake Home Safe Mode" view (no hooks, stores, charts, gradients, sheets).
 *
 * If Track Calories still crashes with this on, the culprit lives in
 * navigation / native screens / root providers, not in HomeScreen's tree.
 */
export const FOOD_LOG_RENDER_FAKE_HOME = false;

/**
 * Panic test — control how the confirm-meal modal returns to home after save.
 * Run in this order to bisect:
 *   "none"        → no nav at all (verify save+store are stable)
 *   "replaceTabs" → router.replace("/(tabs)") (canonical post-save behavior)
 *   "dismissAll"  → router.dismissAll()  ← Run D vs Run B to isolate modal stack
 *   "back"        → router.back()
 */
export type PostSaveNavMode = "dismissAll" | "replaceTabs" | "back" | "none";
export const FOOD_LOG_POST_SAVE_NAV_MODE: PostSaveNavMode = "dismissAll";

/**
 * Real Home bisect — strip sections while FOOD_LOG_SAFE_MODE && !FAKE_HOME.
 * When all are true, `isRealHomeMinimalBisectShell()` mounts only
 * RealHomeMinimalBisectShell (plain Text + camera CTA). Flip flags false
 * one at a time to re-enable layers on RealHomeScreenFull.
 */
export const HOME_SAFE_DISABLE_CHARTS = true;
/** Bisect Run 1: meal surface on; keep other HOME_SAFE_* disables true. */
export const HOME_SAFE_DISABLE_MEAL_LIST = false;
export const HOME_SAFE_DISABLE_PROGRESS_CARD = true;
export const HOME_SAFE_DISABLE_COACH = true;
export const HOME_SAFE_DISABLE_BOTTOM_SHEETS = true;
export const HOME_SAFE_DISABLE_ANIMATIONS = true;
export const HOME_SAFE_DISABLE_FLOATING_ACTIONS = true;

/** All sections off → mount minimal real-home shell (no heavy home hooks). */
export function isRealHomeMinimalBisectShell(): boolean {
  return (
    FOOD_LOG_SAFE_MODE &&
    !FOOD_LOG_RENDER_FAKE_HOME &&
    HOME_SAFE_DISABLE_CHARTS &&
    HOME_SAFE_DISABLE_MEAL_LIST &&
    HOME_SAFE_DISABLE_PROGRESS_CARD &&
    HOME_SAFE_DISABLE_COACH &&
    HOME_SAFE_DISABLE_BOTTOM_SHEETS &&
    HOME_SAFE_DISABLE_ANIMATIONS &&
    HOME_SAFE_DISABLE_FLOATING_ACTIONS
  );
}

/**
 * When true, home renders meals as plain Text rows (no MealCard, swipe, sheets, Reanimated).
 * Auto-off when bottom sheets or animations are re-enabled for bisect Runs 6–7.
 */
export function homeBisectUseSimpleMealRows(): boolean {
  return (
    FOOD_LOG_SAFE_MODE &&
    !FOOD_LOG_RENDER_FAKE_HOME &&
    !HOME_SAFE_DISABLE_MEAL_LIST &&
    HOME_SAFE_DISABLE_BOTTOM_SHEETS &&
    HOME_SAFE_DISABLE_ANIMATIONS
  );
}
