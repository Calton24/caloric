/**
 * Growth Layer - Singleton proxy
 */

import { NoopGrowthClient } from "./providers/NoopGrowthClient";
import type {
    FeatureRequestInput,
    GrowthClient,
    GrowthMilestoneType,
} from "./types";

let client: GrowthClient = new NoopGrowthClient();

export function setGrowthClient(newClient: GrowthClient): void {
  client = newClient;
}

export function getGrowthClient(): GrowthClient {
  return client;
}

export const growth = {
  setUser(user: { userId: string } | null): void {
    try {
      client.setUser(user);
    } catch (error) {
      console.warn("[Growth] setUser failed:", error);
    }
  },

  track(event: string, props?: Record<string, unknown>): void {
    try {
      client.track(event, props);
    } catch (error) {
      console.warn("[Growth] track failed:", error);
    }
  },

  milestone(type: GrowthMilestoneType, props?: Record<string, unknown>): void {
    try {
      client.milestone(type, props);
    } catch (error) {
      console.warn("[Growth] milestone failed:", error);
    }
  },

  async requestFeature(input: FeatureRequestInput): Promise<void> {
    try {
      await client.requestFeature(input);
    } catch (error) {
      console.warn("[Growth] requestFeature failed:", error);
      throw error;
    }
  },
};
