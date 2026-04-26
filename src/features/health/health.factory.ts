/**
 * Apple Health — Factory
 *
 * Resolves to AppleHealthService on iOS, NoopHealthService everywhere else.
 * Never throws — always returns a safe implementation.
 */

import { Platform } from "react-native";

import type { HealthService } from "./health.types";
import { NoopHealthService } from "./noop-health.service";

let instance: HealthService | null = null;

export function getHealthService(): HealthService {
  if (instance) return instance;

  if (Platform.OS === "ios") {
    try {
      // Dynamic require so Android bundler never touches Apple-only code
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { AppleHealthService } = require("./apple-health.service");
      instance = new AppleHealthService();
    } catch (e) {
      console.warn("[HealthKit] Failed to load AppleHealthService:", e);
      instance = new NoopHealthService();
    }
  } else {
    instance = new NoopHealthService();
  }

  return instance!;
}

/** Reset singleton (for testing) */
export function resetHealthService(): void {
  instance = null;
}
