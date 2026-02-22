/**
 * Analytics — Public barrel export
 */

// ── Consumer API (feature code uses these) ──
export { analytics, getAnalyticsClient, setAnalyticsClient } from "./analytics";

// ── Bootstrap (called once in MobileCoreProviders) ──
export { initAnalytics, resetAnalytics } from "./factory";

// ── Hooks ──
export { normalisePathname, shouldTrackScreen } from "./screenTrackingUtils";
export { useScreenTracking } from "./useScreenTracking";

// ── Types ──
export type { AnalyticsClient } from "./types";

// ── Implementations (swap in factory or tests) ──
export { NoopAnalyticsClient } from "./NoopAnalyticsClient";
export { PostHogAnalyticsClient } from "./PostHogAnalyticsClient";

