/**
 * PostHogMaintenanceClient
 *
 * Reads maintenance state from a PostHog feature flag.
 * The flag "maintenance_mode" should return one of:
 *   "normal" | "degraded" | "read_only" | "maintenance"
 *
 * Falls back safely if PostHog SDK is not installed or not initialized.
 * Never throws.
 */

import {
    DEFAULT_MAINTENANCE_STATE,
    MAINTENANCE_CACHE_KEY,
    VALID_MODES,
    type MaintenanceClient,
    type MaintenanceMode,
    type MaintenanceState,
} from "./types";

let PostHogSDK: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  PostHogSDK = require("posthog-react-native");
} catch {
  PostHogSDK = null;
}

function getAsyncStorage(): any {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@react-native-async-storage/async-storage").default;
  } catch {
    return null;
  }
}

const FLAG_KEY = "maintenance_mode";
const MESSAGE_FLAG_KEY = "maintenance_message";

export class PostHogMaintenanceClient implements MaintenanceClient {
  private client: any | null;

  constructor(apiKey: string, host: string) {
    if (!PostHogSDK?.PostHog) {
      this.client = null;

      if (__DEV__) {
        console.warn(
          "[Maintenance] posthog-react-native not installed. PostHog provider degraded to noop."
        );
      }
      return;
    }

    this.client = new PostHogSDK.PostHog(apiKey, { host });
  }

  async getState(): Promise<MaintenanceState> {
    try {
      if (!this.client) {
        return this.getCachedOrDefault();
      }

      const flagValue = await this.client.getFeatureFlag(FLAG_KEY);

      if (
        typeof flagValue === "string" &&
        VALID_MODES.includes(flagValue as MaintenanceMode)
      ) {
        const state: MaintenanceState = {
          mode: flagValue as MaintenanceMode,
          reason: "manual_override",
          updatedAt: Date.now(),
        };

        // Optional: read message flag
        try {
          const msgValue = await this.client.getFeatureFlag(MESSAGE_FLAG_KEY);
          if (typeof msgValue === "string" && msgValue.length > 0) {
            state.message = msgValue;
          }
        } catch {
          // Message flag is non-critical
        }

        // Cache successful result
        await this.cacheState(state);
        return state;
      }

      // Flag not set or invalid value — treat as normal
      return { ...DEFAULT_MAINTENANCE_STATE, updatedAt: Date.now() };
    } catch {
      return this.getCachedOrDefault();
    }
  }

  private async cacheState(state: MaintenanceState): Promise<void> {
    try {
      const storage = getAsyncStorage();
      if (storage) {
        await storage.setItem(MAINTENANCE_CACHE_KEY, JSON.stringify(state));
      }
    } catch {
      // Cache write failure is non-critical
    }
  }

  private async getCachedOrDefault(): Promise<MaintenanceState> {
    try {
      const storage = getAsyncStorage();
      if (storage) {
        const cached = await storage.getItem(MAINTENANCE_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && VALID_MODES.includes(parsed.mode)) {
            return parsed as MaintenanceState;
          }
        }
      }
    } catch {
      // Cache read failure — fall through to default
    }

    return { ...DEFAULT_MAINTENANCE_STATE, updatedAt: Date.now() };
  }
}
