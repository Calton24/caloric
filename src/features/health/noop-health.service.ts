/**
 * Apple Health — Noop Implementation
 *
 * Used on Android or when HealthKit is unavailable.
 * All methods are safe no-ops that never throw.
 */

import type { HealthService } from "./health.types";

export class NoopHealthService implements HealthService {
  async isAvailable(): Promise<boolean> {
    return false;
  }

  async requestPermissions(): Promise<boolean> {
    return false;
  }

  async readWeightSamples(): Promise<[]> {
    return [];
  }

  async writeWeight(): Promise<void> {}

  async readCalorieSamples(): Promise<[]> {
    return [];
  }

  async writeCalories(): Promise<void> {}
}
