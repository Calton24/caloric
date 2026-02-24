/**
 * Live Activity — Factory
 *
 * Gating (ALL must be true):
 *   1. getAppConfig().features.liveActivity === true
 *   2. Platform.OS === "ios"
 *   3. Native module available (our LiveActivityModule OR expo-widgets)
 *
 * Resolution order:
 *   a. NativeLiveActivityClient (local module → ActivityKit → Dynamic Island)
 *   b. ExpoWidgetsLiveActivityClient (expo-widgets fallback)
 *   c. NoopLiveActivityClient (safe default)
 *
 * If any gate fails → Noop (silent, never crash).
 */

import { getAppConfig } from "../../config";
import { ExpoWidgetsLiveActivityClient } from "./ExpoWidgetsLiveActivityClient";
import { NativeLiveActivityClient } from "./NativeLiveActivityClient";
import { NoopLiveActivityClient } from "./NoopLiveActivityClient";
import { setLiveActivityClient } from "./liveActivity";
import type { LiveActivityClient } from "./types";

let initialized = false;
let resolvedClient: LiveActivityClient = new NoopLiveActivityClient();

type LiveActivityMode =
  | "disabled_by_config"
  | "disabled_not_ios"
  | "disabled_no_native_module"
  | "enabled_native_activitykit"
  | "enabled_expo_widgets";

function logMode(mode: LiveActivityMode): void {
  console.log(`[LiveActivity] mode=${mode}`);
}

function isIOS(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Platform } = require("react-native");
    return Platform.OS === "ios";
  } catch {
    return false;
  }
}

export function initLiveActivity(): LiveActivityClient {
  if (initialized) return resolvedClient;

  const config = getAppConfig();
  const enabled = !!config.features.liveActivity;

  if (!enabled) {
    resolvedClient = new NoopLiveActivityClient();
    setLiveActivityClient(resolvedClient);
    initialized = true;
    logMode("disabled_by_config");
    return resolvedClient;
  }

  if (!isIOS()) {
    resolvedClient = new NoopLiveActivityClient();
    setLiveActivityClient(resolvedClient);
    initialized = true;
    logMode("disabled_not_ios");
    return resolvedClient;
  }

  // 1st: Try our native ActivityKit module (Dynamic Island support)
  try {
    const nativeClient = new NativeLiveActivityClient();
    if (nativeClient.isSupported()) {
      resolvedClient = nativeClient;
      setLiveActivityClient(resolvedClient);
      initialized = true;
      logMode("enabled_native_activitykit");
      return resolvedClient;
    }
  } catch {
    // NativeLiveActivityClient not available — continue to fallback
  }

  // 2nd: Try expo-widgets provider
  try {
    const expoClient = new ExpoWidgetsLiveActivityClient();
    if (expoClient.isSupported()) {
      resolvedClient = expoClient;
      setLiveActivityClient(resolvedClient);
      initialized = true;
      logMode("enabled_expo_widgets");
      return resolvedClient;
    }
  } catch {
    // expo-widgets not available — continue to noop
  }

  // 3rd: Noop fallback
  resolvedClient = new NoopLiveActivityClient();
  setLiveActivityClient(resolvedClient);
  initialized = true;
  logMode("disabled_no_native_module");
  return resolvedClient;
}

/** Testing only */
export function resetLiveActivity(): void {
  resolvedClient = new NoopLiveActivityClient();
  setLiveActivityClient(resolvedClient);
  initialized = false;
}
