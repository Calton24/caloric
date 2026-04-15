/**
 * App Tracking Transparency (ATT) Service
 *
 * iOS 14.5+ requires explicit user permission to track users across apps and websites.
 * This service handles the ATT prompt and status checking.
 *
 * @see https://developer.apple.com/documentation/apptrackingtransparency
 * @see https://developer.apple.com/app-store/user-privacy-and-data-use/
 *
 * IMPORTANT:
 * - Must include NSUserTrackingUsageDescription in Info.plist (done in app.json)
 * - Should request AFTER user sees value (e.g., after onboarding)
 * - Cannot prompt again if user denies (system-level restriction)
 */

import { Platform } from "react-native";

// Type definitions for expo-tracking-transparency
export type TrackingPermissionStatus =
  | "denied"
  | "granted"
  | "not-determined"
  | "restricted"
  | "unavailable";

/**
 * Request tracking permission from the user.
 * Returns the permission status.
 *
 * On iOS 14.5+: Shows system ATT prompt
 * On older iOS: Returns "unavailable"
 * On Android: Returns "unavailable" (ATT is iOS-only)
 */
export async function requestTrackingPermission(): Promise<TrackingPermissionStatus> {
  if (Platform.OS !== "ios") {
    return "unavailable";
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ExpoTrackingTransparency = require("expo-tracking-transparency");

    const { status } =
      await ExpoTrackingTransparency.requestTrackingPermissionsAsync();
    return status as TrackingPermissionStatus;
  } catch (error) {
    console.warn("[ATT] Failed to request tracking permission:", error);
    return "unavailable";
  }
}

/**
 * Get current tracking permission status without requesting.
 * Useful for initial UI state.
 */
export async function getTrackingPermissionStatus(): Promise<TrackingPermissionStatus> {
  if (Platform.OS !== "ios") {
    return "unavailable";
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ExpoTrackingTransparency = require("expo-tracking-transparency");

    const { status } =
      await ExpoTrackingTransparency.getTrackingPermissionsAsync();
    return status as TrackingPermissionStatus;
  } catch (error) {
    console.warn("[ATT] Failed to get tracking permission status:", error);
    return "unavailable";
  }
}

/**
 * Check if we should request tracking permission.
 * Returns true if:
 * - Platform is iOS
 * - Status is "not-determined" (user hasn't been asked yet)
 */
export async function shouldRequestTrackingPermission(): Promise<boolean> {
  const status = await getTrackingPermissionStatus();
  return status === "not-determined";
}

/**
 * Check if tracking is enabled (granted permission).
 */
export async function isTrackingEnabled(): Promise<boolean> {
  const status = await getTrackingPermissionStatus();
  return status === "granted";
}
