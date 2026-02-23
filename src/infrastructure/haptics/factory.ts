/**
 * Haptics - Factory
 * Creates the appropriate haptics client based on configuration
 */

import { getAppConfig } from "../../config";
import { ExpoHapticsClient } from "./ExpoHapticsClient";
import { NoopHapticsClient } from "./NoopHapticsClient";
import type { HapticsClient } from "./types";

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

  // Get configuration
  const config = getAppConfig();

  // Check if haptics are enabled in config
  if (!config.features.haptics) {
    console.log("[Haptics] mode=disabled_by_config");
    hapticsInstance = new NoopHapticsClient();
    return hapticsInstance;
  }

  // Check if expo-haptics SDK is available
  if (!ExpoHapticsClient.isSdkAvailable()) {
    console.log("[Haptics] mode=sdk_missing_fallback_noop");
    hapticsInstance = new NoopHapticsClient();
    return hapticsInstance;
  }

  // Initialize Expo Haptics
  hapticsInstance = new ExpoHapticsClient();
  console.log("[Haptics] mode=expo_initialized");

  return hapticsInstance;
}

/**
 * Get the current haptics client instance
 * Must call initHaptics() first
 */
export function getHaptics(): HapticsClient {
  if (!hapticsInstance) {
    console.warn(
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
