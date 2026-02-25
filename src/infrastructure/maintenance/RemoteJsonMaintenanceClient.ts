/**
 * RemoteJsonMaintenanceClient
 *
 * Fetches maintenance state from a plain JSON endpoint.
 * Environment variable: EXPO_PUBLIC_MAINTENANCE_URL
 *
 * Expected JSON shape:
 * {
 *   "mode": "normal" | "degraded" | "read_only" | "maintenance",
 *   "message": "Optional message to display",
 *   "blockedFeatures": ["growth", "realtime"],
 *   "until": "2026-02-25T06:00:00Z"
 * }
 *
 * Resilience:
 *   - Validates payload shape before accepting
 *   - Caches successful result in AsyncStorage
 *   - Falls back to cached state if fetch fails
 *   - Falls back to { mode: "normal" } if no cache
 *   - Never throws
 */

import {
    DEFAULT_MAINTENANCE_STATE,
    MAINTENANCE_CACHE_KEY,
    VALID_MODES,
    VALID_REASONS,
    type MaintenanceClient,
    type MaintenanceMode,
    type MaintenanceReason,
    type MaintenanceState,
} from "./types";

function getAsyncStorage(): any {
  try {
    return require("@react-native-async-storage/async-storage").default;
  } catch {
    return null;
  }
}

/** Timeout for remote fetch (ms) — fail fast, never block boot */
const FETCH_TIMEOUT_MS = 5_000;

export class RemoteJsonMaintenanceClient implements MaintenanceClient {
  private readonly url: string;

  constructor(url: string) {
    this.url = url;
  }

  async getState(): Promise<MaintenanceState> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(this.url, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(
          `[Maintenance] Remote fetch failed: HTTP ${response.status}`
        );
        return this.getCachedOrDefault();
      }

      const json = await response.json();
      const validated = this.validate(json);

      if (!validated) {
        console.warn("[Maintenance] Remote payload failed validation");
        return this.getCachedOrDefault();
      }

      // Cache successful result
      await this.cacheState(validated);
      return validated;
    } catch (error: any) {
      if (__DEV__) {
        console.warn(
          `[Maintenance] Remote fetch error: ${error?.message ?? error}`
        );
      }
      return this.getCachedOrDefault();
    }
  }

  /**
   * Validate the raw JSON payload against MaintenanceState shape.
   * Returns null if invalid.
   */
  private validate(json: unknown): MaintenanceState | null {
    if (typeof json !== "object" || json === null) return null;

    const obj = json as Record<string, unknown>;

    // mode is required and must be a valid value
    if (
      typeof obj.mode !== "string" ||
      !VALID_MODES.includes(obj.mode as MaintenanceMode)
    ) {
      return null;
    }

    const state: MaintenanceState = {
      mode: obj.mode as MaintenanceMode,
      updatedAt: Date.now(),
    };

    // Optional fields — only include if valid type
    if (typeof obj.message === "string") {
      state.message = obj.message;
    }

    if (typeof obj.until === "string") {
      state.until = obj.until;
    }

    if (
      typeof obj.reason === "string" &&
      VALID_REASONS.includes(obj.reason as MaintenanceReason)
    ) {
      state.reason = obj.reason as MaintenanceReason;
    }

    if (Array.isArray(obj.blockedFeatures)) {
      state.blockedFeatures = obj.blockedFeatures.filter(
        (f: unknown) => typeof f === "string"
      );
    }

    return state;
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
