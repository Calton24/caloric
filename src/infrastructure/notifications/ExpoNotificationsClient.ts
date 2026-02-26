/**
 * ExpoNotificationsClient
 * Adapter that implements NotificationsClient using expo-notifications.
 *
 * The SDK is loaded via dynamic require so the package is truly optional:
 * if `expo-notifications` is not installed the constructor gracefully
 * falls back — factory will detect and use Noop instead.
 *
 * Do NOT statically import expo-notifications anywhere.
 */

import { Platform } from "react-native";
import type {
    NotificationsClient,
    PermissionStatus,
    ScheduleLocalOpts,
} from "./types";

// ---------- Dynamic require (optional dependency) ----------

let Notifications: any = null;
let Device: any = null;
let Constants: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Notifications = require("expo-notifications");
} catch {
  Notifications = null;
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Device = require("expo-device");
} catch {
  Device = null;
}

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Constants = require("expo-constants");
} catch {
  Constants = null;
}

// ---------- Helpers ----------

function mapStatus(raw: string | undefined): PermissionStatus {
  if (raw === "granted") return "granted";
  if (raw === "undetermined") return "undetermined";
  return "denied";
}

// ---------- Client ----------

export class ExpoNotificationsClient implements NotificationsClient {
  /** True when the dynamic require succeeded */
  readonly sdkAvailable: boolean;

  constructor() {
    this.sdkAvailable = Notifications !== null;

    if (!this.sdkAvailable && __DEV__) {
      console.warn(
        "[Notifications] expo-notifications not installed. Client will no-op."
      );
    }

    // Configure default Android channel
    if (this.sdkAvailable && Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance?.MAX ?? 4,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      }).catch(() => {
        // Swallow — non-fatal
      });
    }
  }

  async getPermissions(): Promise<PermissionStatus> {
    if (!this.sdkAvailable) return "denied";

    try {
      const { status } = await Notifications.getPermissionsAsync();
      return mapStatus(status);
    } catch {
      return "denied";
    }
  }

  async requestPermissions(): Promise<PermissionStatus> {
    if (!this.sdkAvailable) return "denied";

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return mapStatus(status);
    } catch {
      return "denied";
    }
  }

  async getPushToken(): Promise<string | null> {
    if (!this.sdkAvailable) return null;

    // Physical device check
    if (Device && !Device.isDevice) {
      if (__DEV__) {
        console.warn("[Notifications] Push tokens require a physical device.");
      }
      return null;
    }

    try {
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ??
        Constants?.easConfig?.projectId;

      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      return tokenData?.data ?? null;
    } catch (error) {
      if (__DEV__) {
        console.warn("[Notifications] getPushToken failed:", error);
      }
      return null;
    }
  }

  async scheduleLocal(opts: ScheduleLocalOpts): Promise<void> {
    if (!this.sdkAvailable) return;

    try {
      const trigger =
        opts.delaySeconds && opts.delaySeconds > 0
          ? { seconds: opts.delaySeconds, type: "timeInterval" as const }
          : null;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: opts.title,
          body: opts.body,
          data: opts.data ?? {},
        },
        trigger,
      });
    } catch (error) {
      if (__DEV__) {
        console.warn("[Notifications] scheduleLocal failed:", error);
      }
    }
  }

  async clearBadge(): Promise<void> {
    if (!this.sdkAvailable) return;

    try {
      await Notifications.setBadgeCountAsync(0);
    } catch {
      // Swallow — non-fatal
    }
  }
}
