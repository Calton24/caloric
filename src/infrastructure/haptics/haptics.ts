/**
 * Haptics - Singleton Proxy
 * Provides a global haptics instance that safely delegates to the initialized client
 */

import { getHaptics } from "./factory";
import type { HapticsClient, ImpactStyle, NotificationStyle } from "./types";

/**
 * Singleton haptics proxy
 * Safe to use throughout the app - will not crash if not initialized
 */
class HapticsProxy implements HapticsClient {
  get kind(): "expo" | "noop" {
    return getHaptics().kind;
  }

  async impact(style?: ImpactStyle): Promise<void> {
    try {
      await getHaptics().impact(style);
    } catch (error) {
      if (__DEV__) {
        console.error("[Haptics] impact() error:", error);
      }
    }
  }

  async notification(type: NotificationStyle): Promise<void> {
    try {
      await getHaptics().notification(type);
    } catch (error) {
      if (__DEV__) {
        console.error("[Haptics] notification() error:", error);
      }
    }
  }

  async selection(): Promise<void> {
    try {
      await getHaptics().selection();
    } catch (error) {
      if (__DEV__) {
        console.error("[Haptics] selection() error:", error);
      }
    }
  }

  isSupported(): boolean {
    try {
      return getHaptics().isSupported();
    } catch (error) {
      if (__DEV__) {
        console.error("[Haptics] isSupported() error:", error);
      }
      return false;
    }
  }
}

/**
 * Global haptics instance
 * Import and use this throughout your app
 */
export const haptics = new HapticsProxy();
