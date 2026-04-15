/**
 * Notifications — Contract
 *
 * The ONLY interface feature code may depend on.
 * Implementations live in this directory as provider files.
 *
 * No Expo types. No Supabase types. No React types.
 * Pure contract.
 */

export type PermissionStatus = "undetermined" | "denied" | "granted";

export interface ScheduleLocalOpts {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  /** Delay in seconds before delivery (default: 0 = immediate) */
  delaySeconds?: number;
}

export interface ScheduleDailyOpts {
  /** Unique identifier for this notification (used for cancellation) */
  identifier: string;
  title: string;
  body: string;
  /** Hour (0-23) to fire each day */
  hour: number;
  /** Minute (0-59) to fire each day */
  minute: number;
  data?: Record<string, unknown>;
}

export interface SendTestRemoteOpts {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

export interface NotificationsClient {
  /** Check current permission status without prompting */
  getPermissions(): Promise<PermissionStatus>;

  /** Request push notification permissions from the OS */
  requestPermissions(): Promise<PermissionStatus>;

  /** Get the push token for this device (null if unavailable) */
  getPushToken(): Promise<string | null>;

  /** Schedule a local notification */
  scheduleLocal(opts: ScheduleLocalOpts): Promise<void>;

  /** Schedule a daily repeating notification at a specific time */
  scheduleDailyRepeat(opts: ScheduleDailyOpts): Promise<void>;

  /** Cancel a previously scheduled notification by identifier */
  cancelScheduled(identifier: string): Promise<void>;

  /** Cancel all scheduled notifications */
  cancelAllScheduled(): Promise<void>;

  /** Clear the app badge count */
  clearBadge(): Promise<void>;

  /** Optional: send a test remote push via backend (dev panel only) */
  sendTestRemote?(opts: SendTestRemoteOpts): Promise<void>;
}
