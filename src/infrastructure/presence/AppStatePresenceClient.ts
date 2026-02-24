/**
 * AppStatePresenceClient
 *
 * Real implementation using React Native's AppState API.
 * Wraps all calls in try/catch — must NEVER crash the app.
 *
 * This is the ONLY file in the presence module that imports RN directly.
 */

import type {
    AppLifecycleState,
    PresenceChangeCallback,
    PresenceClient,
    Unsubscribe,
} from "./types";

// Dynamic require — AppState is optional (tests / SSR)
let RNAppState: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rn = require("react-native");
  RNAppState = rn.AppState;
} catch {
  RNAppState = null;
}

function toLifecycleState(rnState: string | null): AppLifecycleState {
  if (rnState === "active") return "active";
  if (rnState === "background") return "background";
  return "inactive";
}

export class AppStatePresenceClient implements PresenceClient {
  private listeners = new Set<PresenceChangeCallback>();
  private currentState: AppLifecycleState = "active";
  private subscription: any = null;
  private started = false;

  /** Whether AppState is available at runtime */
  readonly sdkAvailable: boolean;

  constructor() {
    this.sdkAvailable = RNAppState != null;
    try {
      this.currentState = toLifecycleState(RNAppState?.currentState ?? null);
    } catch {
      this.currentState = "active";
    }
  }

  start(): void {
    if (this.started || !this.sdkAvailable) return;
    try {
      this.subscription = RNAppState.addEventListener(
        "change",
        this.handleChange
      );
      this.started = true;
    } catch (err) {
      console.warn("[Presence] AppState.addEventListener failed:", err);
    }
  }

  stop(): void {
    if (!this.started) return;
    try {
      this.subscription?.remove?.();
    } catch {
      // Swallow
    }
    this.subscription = null;
    this.started = false;
  }

  getState(): AppLifecycleState {
    return this.currentState;
  }

  onChange(cb: PresenceChangeCallback): Unsubscribe {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private handleChange = (nextState: string) => {
    try {
      const resolved = toLifecycleState(nextState);
      if (resolved === this.currentState) return;
      this.currentState = resolved;
      for (const cb of this.listeners) {
        try {
          cb(resolved);
        } catch (err) {
          console.warn("[Presence] onChange callback error:", err);
        }
      }
    } catch (err) {
      console.warn("[Presence] handleChange error:", err);
    }
  };
}
