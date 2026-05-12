/**
 * Haptics - Factory
 * Creates the appropriate haptics client based on configuration
 */

import { getAppConfig } from "../../config";
import {
  FOOD_LOG_SAFE_MODE,
  assertFoodLogSafeModeImport,
} from "../../features/debug/safe-mode-flags";
import { DISABLE_POST_SAVE_HAPTICS } from "../../features/food-logging/post-save-debug-flags";
import { logger } from "../../logging/logger";
import { ExpoHapticsClient } from "./ExpoHapticsClient";
import { NoopHapticsClient } from "./NoopHapticsClient";
import type { HapticsClient } from "./types";

assertFoodLogSafeModeImport("haptics");

// Singleton instance
let hapticsInstance: HapticsClient | null = null;

/**
 * Initialize haptics system
 * Call this once at app startup
 */
export function initHaptics(): HapticsClient {
  if (hapticsInstance) {
    return hapticsInstance;
  }

  if (FOOD_LOG_SAFE_MODE || DISABLE_POST_SAVE_HAPTICS) {
    logger.log(
      FOOD_LOG_SAFE_MODE
        ? "[Haptics] mode=disabled_food_log_safe_mode"
        : "[Haptics] mode=disabled_post_save_debug"
    );
    hapticsInstance = new NoopHapticsClient();
    return hapticsInstance;
  }

  // Get configuration
  const config = getAppConfig();

  // Check if haptics are enabled in config
  if (!config.features.haptics) {
    logger.log("[Haptics] mode=disabled_by_config");
    hapticsInstance = new NoopHapticsClient();
    return hapticsInstance;
  }

  // Check if expo-haptics SDK is available
  if (!ExpoHapticsClient.isSdkAvailable()) {
    logger.log("[Haptics] mode=sdk_missing_fallback_noop");
    hapticsInstance = new NoopHapticsClient();
    return hapticsInstance;
  }

  // Initialize Expo Haptics
  hapticsInstance = new ExpoHapticsClient();
  logger.log("[Haptics] mode=expo_initialized");

  return hapticsInstance;
}

/**
 * Get the current haptics client instance
 * Must call initHaptics() first
 */
export function getHaptics(): HapticsClient {
  if (!hapticsInstance) {
    logger.warn(
      "[Haptics] Not initialized, returning no-op client. Call initHaptics() first."
    );
    return new NoopHapticsClient();
  }

  return hapticsInstance;
}

/**
 * Reset haptics (useful for testing)
 */
export function resetHaptics(): void {
  hapticsInstance = null;
}
