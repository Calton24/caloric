/**
 * Notifications — Public barrel export
 */

// ── Consumer API (feature code uses these) ──
export {
    getNotificationsClient,
    notifications,
    setNotificationsClient
} from "./notifications";

// ── Bootstrap (called once in CaloricProviders) ──
export { initNotifications, resetNotifications } from "./factory";

// ── Types ──
export type {
    NotificationsClient,
    PermissionStatus,
    ScheduleLocalOpts,
    SendTestRemoteOpts
} from "./types";

// ── Implementations (swap in factory or tests) ──
export { NoopNotificationsClient } from "./NoopNotificationsClient";

// Note: ExpoNotificationsClient is NOT exported to avoid static imports of expo-notifications.
// It's only used internally by the factory.
