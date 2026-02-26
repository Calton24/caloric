/**
 * NoopPresenceClient
 * Safe default — reports "active" and ignores lifecycle events.
 * Used when presence is disabled by config.
 */

import type {
    AppLifecycleState,
    PresenceChangeCallback,
    PresenceClient,
    Unsubscribe,
} from "./types";

export class NoopPresenceClient implements PresenceClient {
  start(): void {
    // No-op
  }

  stop(): void {
    // No-op
  }

  getState(): AppLifecycleState {
    return "active";
  }

  onChange(_cb: PresenceChangeCallback): Unsubscribe {
    return () => {};
  }
}
