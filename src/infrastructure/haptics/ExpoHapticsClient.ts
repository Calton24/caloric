/**
 * Haptics - Expo Implementation
 * Uses dynamic require to avoid bundler crashes when expo-haptics is not installed
 */

import type { HapticsClient, ImpactStyle, NotificationStyle } from "./types";

/**
 * Dynamically load expo-haptics
 * Returns null if package is not installed
 */
let Haptics: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Haptics = require("expo-haptics");
} catch {
  // Package not installed - this is fine, we'll behave like Noop
  Haptics = null;
}

/**
 * Expo-based haptics client
 * Gracefully degrades to noop if expo-haptics is not installed
 */
export class ExpoHapticsClient implements HapticsClient {
  readonly kind = "expo" as const;
  private supported = false;

  constructor() {
    this.supported = Haptics !== null;
  }

  async impact(style: ImpactStyle = "medium"): Promise<void> {
    if (!this.supported || !Haptics) return;

    try {
      await Haptics.impactAsync(
        Haptics.ImpactFeedbackStyle[this.mapImpactStyle(style)]
      );
    } catch (error) {
      // Silently fail - haptics are not critical
      if (__DEV__) {
        console.warn("[ExpoHapticsClient] Impact feedback failed:", error);
      }
    }
  }

  async notification(type: NotificationStyle): Promise<void> {
    if (!this.supported || !Haptics) return;

    try {
      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType[this.mapNotificationType(type)]
      );
    } catch (error) {
      if (__DEV__) {
        console.warn(
          "[ExpoHapticsClient] Notification feedback failed:",
          error
        );
      }
    }
  }

  async selection(): Promise<void> {
    if (!this.supported || !Haptics) return;

    try {
      await Haptics.selectionAsync();
    } catch (error) {
      if (__DEV__) {
        console.warn("[ExpoHapticsClient] Selection feedback failed:", error);
      }
    }
  }

  isSupported(): boolean {
    return this.supported;
  }

  /**
   * Map our style enum to Expo's enum
   */
  private mapImpactStyle(style: ImpactStyle): string {
    const map: Record<ImpactStyle, string> = {
      light: "Light",
      medium: "Medium",
      heavy: "Heavy",
      soft: "Soft",
      rigid: "Rigid",
    };
    return map[style];
  }

  /**
   * Map our notification type to Expo's enum
   */
  private mapNotificationType(type: NotificationStyle): string {
    const map: Record<NotificationStyle, string> = {
      success: "Success",
      warning: "Warning",
      error: "Error",
    };
    return map[type];
  }

  /**
   * Check if expo-haptics SDK is available
   * @returns true if expo-haptics is installed
   */
  static isSdkAvailable(): boolean {
    return Haptics !== null;
  }
}
