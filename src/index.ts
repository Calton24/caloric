/**
 * Mobile Core UI - Main Entry Point
 * Export all components, hooks, and utilities
 */

// === PROVIDERS ===
export { AuthProvider } from "./features/auth/AuthProvider";
export { MobileCoreProviders } from "./MobileCoreProviders";
export { ThemeProvider } from "./theme/ThemeProvider";
export { BottomSheetProvider } from "./ui/sheets/BottomSheetProvider";

// === HOOKS ===
export { useAuth } from "./features/auth/useAuth";
export { useTheme } from "./theme/useTheme";
export { useSubmitLock } from "./ui/forms/useSubmitLock";
export { useBottomSheet } from "./ui/sheets/useBottomSheet";

// === THEME ===
export { generatePalette } from "./theme/colors";
export type { ColorMode } from "./theme/colors";
export type { Theme, ThemeContextValue } from "./theme/ThemeProvider";
export { radius, shadows, spacing, typography } from "./theme/tokens";
export type {
    RadiusTokens,
    SpacingTokens,
    ThemeTokens,
    TypographyTokens
} from "./theme/tokens";

// === GLASS COMPONENTS ===
export { GlassCard } from "./ui/glass/GlassCard";
export { GlassSurface } from "./ui/glass/GlassSurface";

// === TAB COMPONENTS ===
export { GlassTabBar } from "./ui/tabs/GlassTabBar";

// === PRIMITIVES ===
export { ColorPickerSheet } from "./ui/primitives/ColorPickerSheet";
export { HueSlider } from "./ui/primitives/HueSlider";
export { TButton } from "./ui/primitives/TButton";
export type { TButtonProps } from "./ui/primitives/TButton";
export { TDivider } from "./ui/primitives/TDivider";
export type { TDividerProps } from "./ui/primitives/TDivider";
export { TInput } from "./ui/primitives/TInput";
export type { TInputProps } from "./ui/primitives/TInput";
export { TSpacer } from "./ui/primitives/TSpacer";
export type { TSpacerProps } from "./ui/primitives/TSpacer";
export { TText } from "./ui/primitives/TText";
export type { TTextProps } from "./ui/primitives/TText";

// === LAYOUT ===
export { Screen } from "./ui/layout/Screen";
export type { ScreenProps } from "./ui/layout/Screen";

// === FORMS ===
export { FormField } from "./ui/forms/FormField";
export type { FormFieldProps } from "./ui/forms/FormField";

// === AUTH ===
export { authClient, createAuthClient } from "./features/auth/authClient";
export type {
    AuthClient,
    AuthProviderType,
    OAuthProvider,
    OAuthResponse,
    Session,
    User
} from "./features/auth/authClient";

// === NOTIFICATIONS ===
export {
    NoopNotificationsClient,
    initNotifications,
    notifications,
    resetNotifications
} from "./infrastructure/notifications";
export type {
    NotificationsClient,
    PermissionStatus,
    ScheduleLocalOpts,
    SendTestRemoteOpts
} from "./infrastructure/notifications";

// === I18N ===
export {
    LANGUAGE_LABELS,
    SUPPORTED_LANGUAGES,
    clearPersistedLanguage,
    formatCurrency,
    formatDate,
    formatNumber,
    initI18n,
    useAppTranslation
} from "./infrastructure/i18n";
export type { SupportedLanguage } from "./infrastructure/i18n";

// === PRESENCE ===
export {
    NoopPresenceClient,
    initPresence,
    presence,
    resetPresence
} from "./infrastructure/presence";
export type {
    AppLifecycleState,
    PresenceChangeCallback,
    PresenceClient,
    Unsubscribe as PresenceUnsubscribe
} from "./infrastructure/presence";

// === ACTIVITY MONITOR ===
export {
    InAppActivityMonitorClient,
    NoopActivityMonitorClient,
    activityMonitor,
    activityStore,
    initActivityMonitor,
    resetActivityMonitor
} from "./infrastructure/activityMonitor";
export type {
    EndResult as ActivityEndResult,
    ActivityMonitorClient,
    ActivityPayload,
    StartResult as ActivityStartResult,
    ActivityState,
    UpdateResult as ActivityUpdateResult,
    EtaPayload,
    ProgressPayload,
    StepsPayload,
    TimerPayload
} from "./infrastructure/activityMonitor";

// === LIVE ACTIVITY (Native ActivityKit + expo-widgets fallback) ===
export {
    ExpoWidgetsLiveActivityClient,
    NativeLiveActivityClient,
    NoopLiveActivityClient,
    initLiveActivity,
    liveActivity,
    resetLiveActivity
} from "./infrastructure/liveActivity";
export type {
    LAEndResult,
    LAStartResult,
    LAUpdateResult,
    LiveActivityClient,
    LiveActivityProps
} from "./infrastructure/liveActivity";

// === MAINTENANCE / DEGRADED-MODE ===
export {
    DEFAULT_MAINTENANCE_STATE,
    IMPLICIT_SUPABASE_BLOCKS,
    MAINTENANCE_CACHE_KEY,
    MAINTENANCE_OVERRIDE_KEY,
    MaintenanceGate,
    NoopMaintenanceClient,
    PostHogMaintenanceClient,
    RemoteJsonMaintenanceClient,
    SupabaseHealthMonitor,
    VALID_MODES,
    VALID_REASONS,
    getHealthMonitor,
    initMaintenance,
    maintenance,
    resetMaintenance,
    useMaintenanceState
} from "./infrastructure/maintenance";
export type {
    MaintenanceClient,
    MaintenanceMode,
    MaintenanceReason,
    MaintenanceState
} from "./infrastructure/maintenance";

// === SECURITY TELEMETRY ===
export {
    isServiceRoleJWT,
    recordAdminBypassAttempt,
    recordAuthFailure,
    recordEventSpam,
    recordRateLimitHit,
    recordSecurityEvent,
    reportServiceRoleAttempt
} from "./infrastructure/security";
export type {
    SecurityEvent,
    SecurityEventType
} from "./infrastructure/security";

// === DEV UTILITIES ===
export { ActivityDebugPanel } from "./ui/dev/ActivityDebugPanel";
export { DevOnly } from "./ui/dev/DevOnly";
export { LiveActivityDebugPanel } from "./ui/dev/LiveActivityDebugPanel";
export { MaintenanceDebugPanel } from "./ui/dev/MaintenanceDebugPanel";
export { PresenceDebugPanel } from "./ui/dev/PresenceDebugPanel";
export { PushDebugPanel } from "./ui/dev/PushDebugPanel";

