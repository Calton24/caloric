/**
 * Haptics - No-op Implementation
 * Used when haptics are disabled or not supported
 */

import type { HapticsClient, ImpactStyle, NotificationStyle } from "./types";

/**
 * No-op haptics client (does nothing)
 * Used when haptics are disabled
 */
export class NoopHapticsClient implements HapticsClient {
  readonly kind = "noop" as const;

  async impact(_style?: ImpactStyle): Promise<void> {
    // No-op
  }

  async notification(_type: NotificationStyle): Promise<void> {
    // No-op
  }

  async selection(): Promise<void> {
    // No-op
  }

  isSupported(): boolean {
    return false;
  }
}
