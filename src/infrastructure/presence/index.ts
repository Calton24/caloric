/**
 * Presence — Public barrel export
 */

// ── Consumer API (feature code uses these) ──
export { getPresenceClient, presence, setPresenceClient } from "./presence";

// ── Bootstrap (called once in CaloricProviders) ──
export { initPresence, resetPresence } from "./factory";

// ── Types ──
export type {
    AppLifecycleState,
    PresenceChangeCallback,
    PresenceClient,
    Unsubscribe
} from "./types";

// ── Implementations (swap in factory or tests) ──
export { NoopPresenceClient } from "./NoopPresenceClient";

// Note: AppStatePresenceClient is NOT exported to avoid static imports of react-native.
// It's only used internally by the factory.
