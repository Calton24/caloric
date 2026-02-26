/**
 * Haptics - Public API
 * Use this barrel export throughout the app
 */

// Factory
export { getHaptics, initHaptics, resetHaptics } from "./factory";

// Singleton proxy (primary API)
export { haptics } from "./haptics";

// Hooks
export { useHapticSelection, useHapticTabPress } from "./hooks";

// Types
export type { HapticsClient, ImpactStyle, NotificationStyle } from "./types";

// Noop implementation (safe for testing/mocking)
export { NoopHapticsClient } from "./NoopHapticsClient";

// Note: ExpoHapticsClient is NOT exported to avoid static imports of expo-haptics
// It's only used internally by the factory
