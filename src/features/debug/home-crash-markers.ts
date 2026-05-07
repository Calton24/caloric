/**
 * AsyncStorage markers for native crashes that happen after JS logs flush.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const HOME_KEY = "last_home_phase";
const TRACK_KEY = "last_track_calories_phase";

export type HomeCrashPhase =
  | "home_component_enter"
  | "home_render_before_return"
  | "home_first_effect_start"
  | "home_mount"
  | "home_render_start"
  | "home_render_success"
  | "home_effect_meals_skip"
  | "home_effect_meals_done"
  | "home_effect_retention_skip"
  | "home_effect_health_skip";

export async function persistHomePhase(
  phase: HomeCrashPhase | string,
  extra?: Record<string, unknown>
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      HOME_KEY,
      JSON.stringify({
        phase,
        at: new Date().toISOString(),
        ...extra,
      })
    );
  } catch {
    /* ignore */
  }
}

/** Boot: last Track Calories phase + last Home phase (dev console). */
export async function logLastCrashMarkersOnBoot(): Promise<void> {
  try {
    const [trackRaw, homeRaw] = await Promise.all([
      AsyncStorage.getItem(TRACK_KEY),
      AsyncStorage.getItem(HOME_KEY),
    ]);
    if (__DEV__) {
      console.log("[LastCrashMarker]", {
        last_track_calories_phase: trackRaw,
        last_home_phase: homeRaw,
      });
    }
  } catch {
    /* ignore */
  }
}
