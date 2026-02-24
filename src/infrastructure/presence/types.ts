/**
 * Presence — Contract
 *
 * The ONLY interface feature code may depend on.
 * No React Native types. No Expo types. Pure contract.
 */

export type AppLifecycleState = "active" | "background" | "inactive";

export type PresenceChangeCallback = (state: AppLifecycleState) => void;

export type Unsubscribe = () => void;

export interface PresenceClient {
  /** Start listening to app lifecycle changes */
  start(): void;

  /** Stop listening (cleanup) */
  stop(): void;

  /** Current app state */
  getState(): AppLifecycleState;

  /** Subscribe to state changes. Returns unsubscribe function. */
  onChange(cb: PresenceChangeCallback): Unsubscribe;
}
