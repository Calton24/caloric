/**
 * NoopMaintenanceClient
 * Safe default — always returns { mode: "normal" }.
 * Used when maintenance checking is disabled or not configured.
 */

import {
    DEFAULT_MAINTENANCE_STATE,
    type MaintenanceClient,
    type MaintenanceState,
} from "./types";

export class NoopMaintenanceClient implements MaintenanceClient {
  async getState(): Promise<MaintenanceState> {
    return { ...DEFAULT_MAINTENANCE_STATE, updatedAt: Date.now() };
  }
}
