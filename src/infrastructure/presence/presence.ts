/**
 * Presence — Singleton proxy
 *
 * Every presence call in the app goes through this module.
 * The backing client is swapped via setPresenceClient() at bootstrap;
 * until then all calls silently no-op.
 *
 * Every method wraps in try/catch — presence must NEVER crash the app.
 */

import { NoopPresenceClient } from "./NoopPresenceClient";
import type {
    AppLifecycleState,
    PresenceChangeCallback,
    PresenceClient,
    Unsubscribe,
} from "./types";

let client: PresenceClient = new NoopPresenceClient();

/** Replace the backing presence implementation (call once at startup). */
export function setPresenceClient(newClient: PresenceClient): void {
  client = newClient;
}

/** Retrieve the current client (testing). */
export function getPresenceClient(): PresenceClient {
  return client;
}

/**
 * Public presence API — import this from feature code.
 *
 * @example
 * ```ts
 * import { presence } from "@/infrastructure/presence";
 * presence.start();
 * const state = presence.getState(); // "active" | "background" | "inactive"
 * const unsub = presence.onChange(s => console.log(s));
 * ```
 */
export const presence = {
  start(): void {
    try {
      client.start();
    } catch (error) {
      console.warn("[Presence] start failed:", error);
    }
  },

  stop(): void {
    try {
      client.stop();
    } catch (error) {
      console.warn("[Presence] stop failed:", error);
    }
  },

  getState(): AppLifecycleState {
    try {
      return client.getState();
    } catch (error) {
      console.warn("[Presence] getState failed:", error);
      return "active";
    }
  },

  onChange(cb: PresenceChangeCallback): Unsubscribe {
    try {
      return client.onChange(cb);
    } catch (error) {
      console.warn("[Presence] onChange failed:", error);
      return () => {};
    }
  },
};
