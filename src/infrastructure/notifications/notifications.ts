/**
 * Notifications — Singleton proxy
 *
 * Every notification call in the app goes through this module.
 * The backing client is swapped via setNotificationsClient() at bootstrap;
 * until then all calls silently no-op.
 *
 * Every method wraps in try/catch — notifications must NEVER crash the app.
 */

import { NoopNotificationsClient } from "./NoopNotificationsClient";
import type {
    NotificationsClient,
    PermissionStatus,
    ScheduleDailyOpts,
    ScheduleLocalOpts,
    SendTestRemoteOpts,
} from "./types";

let client: NotificationsClient = new NoopNotificationsClient();

/** Replace the backing notifications implementation (call once at startup). */
export function setNotificationsClient(newClient: NotificationsClient): void {
  client = newClient;
}

/** Retrieve the current client (testing). */
export function getNotificationsClient(): NotificationsClient {
  return client;
}

/**
 * Public notifications API — import this from feature code.
 *
 * @example
 * ```ts
 * import { notifications } from "@/infrastructure/notifications";
 * const status = await notifications.requestPermissions();
 * ```
 */
export const notifications = {
  async getPermissions(): Promise<PermissionStatus> {
    try {
      return await client.getPermissions();
    } catch (error) {
      console.warn("[Notifications] getPermissions failed:", error);
      return "denied";
    }
  },

  async requestPermissions(): Promise<PermissionStatus> {
    try {
      return await client.requestPermissions();
    } catch (error) {
      console.warn("[Notifications] requestPermissions failed:", error);
      return "denied";
    }
  },

  async getPushToken(): Promise<string | null> {
    try {
      return await client.getPushToken();
    } catch (error) {
      console.warn("[Notifications] getPushToken failed:", error);
      return null;
    }
  },

  async scheduleLocal(opts: ScheduleLocalOpts): Promise<void> {
    try {
      await client.scheduleLocal(opts);
    } catch (error) {
      console.warn("[Notifications] scheduleLocal failed:", error);
    }
  },

  async clearBadge(): Promise<void> {
    try {
      await client.clearBadge();
    } catch (error) {
      console.warn("[Notifications] clearBadge failed:", error);
    }
  },

  async sendTestRemote(opts: SendTestRemoteOpts): Promise<void> {
    try {
      if (client.sendTestRemote) {
        await client.sendTestRemote(opts);
      } else if (__DEV__) {
        console.warn(
          "[Notifications] sendTestRemote not implemented by current client"
        );
      }
    } catch (error) {
      console.warn("[Notifications] sendTestRemote failed:", error);
    }
  },

  async scheduleDailyRepeat(opts: ScheduleDailyOpts): Promise<void> {
    try {
      await client.scheduleDailyRepeat(opts);
    } catch (error) {
      console.warn("[Notifications] scheduleDailyRepeat failed:", error);
    }
  },

  async cancelScheduled(identifier: string): Promise<void> {
    try {
      await client.cancelScheduled(identifier);
    } catch (error) {
      console.warn("[Notifications] cancelScheduled failed:", error);
    }
  },

  async cancelAllScheduled(): Promise<void> {
    try {
      await client.cancelAllScheduled();
    } catch (error) {
      console.warn("[Notifications] cancelAllScheduled failed:", error);
    }
  },
};
