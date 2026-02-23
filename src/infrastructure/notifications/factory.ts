/**
 * Notifications — Factory
 *
 * Gating:
 *   getAppConfig().features.notifications must be true, otherwise noop.
 *   expo-notifications must be installed, otherwise noop.
 *
 * Important: Push registration does NOT happen automatically on boot.
 * Permissions must be explicitly requested (onboarding flow or dev panel).
 * Apple rejects apps that auto-prompt on launch.
 */

import { getAppConfig } from "../../config";
import { ExpoNotificationsClient } from "./ExpoNotificationsClient";
import { NoopNotificationsClient } from "./NoopNotificationsClient";
import { setNotificationsClient } from "./notifications";
import type { NotificationsClient } from "./types";

let initialized = false;
let resolvedClient: NotificationsClient = new NoopNotificationsClient();

type NotificationsMode =
  | "disabled_by_config"
  | "sdk_missing_fallback_noop"
  | "expo_initialized";

function logMode(mode: NotificationsMode): void {
  console.log(`[Notifications] mode=${mode}`);
}

export function initNotifications(): NotificationsClient {
  if (initialized) return resolvedClient;

  const config = getAppConfig();
  const enabled = !!config.features.notifications;

  if (!enabled) {
    resolvedClient = new NoopNotificationsClient();
    setNotificationsClient(resolvedClient);
    initialized = true;
    logMode("disabled_by_config");
    return resolvedClient;
  }

  const expo = new ExpoNotificationsClient();

  if (!expo.sdkAvailable) {
    resolvedClient = new NoopNotificationsClient();
    setNotificationsClient(resolvedClient);
    initialized = true;
    logMode("sdk_missing_fallback_noop");
    return resolvedClient;
  }

  resolvedClient = expo;
  setNotificationsClient(resolvedClient);
  initialized = true;
  logMode("expo_initialized");
  return resolvedClient;
}

/** Testing only */
export function resetNotifications(): void {
  resolvedClient = new NoopNotificationsClient();
  setNotificationsClient(resolvedClient);
  initialized = false;
}
