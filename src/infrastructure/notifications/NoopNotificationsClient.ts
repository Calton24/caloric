/**
 * NoopNotificationsClient
 * Safe default — silently discards every call.
 * Used when notifications are not configured, disabled, or SDK is missing.
 */

import type { NotificationsClient, PermissionStatus } from "./types";

export class NoopNotificationsClient implements NotificationsClient {
  async getPermissions(): Promise<PermissionStatus> {
    return "denied";
  }

  async requestPermissions(): Promise<PermissionStatus> {
    return "denied";
  }

  async getPushToken(): Promise<string | null> {
    return null;
  }

  async scheduleLocal(): Promise<void> {
    // No-op
  }

  async clearBadge(): Promise<void> {
    // No-op
  }
}
