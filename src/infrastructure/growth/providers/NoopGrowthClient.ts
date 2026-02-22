/**
 * NoopGrowthClient
 * Safe default - discards all calls.
 */

import type {
    FeatureRequestInput,
    GrowthClient,
    GrowthMilestoneType,
} from "../types";

export class NoopGrowthClient implements GrowthClient {
  readonly kind = "noop" as const;

  setUser(_user: { userId: string } | null): void {
    // No-op
  }

  track(_event: string, _props?: Record<string, unknown>): void {
    // No-op
  }

  milestone(
    _type: GrowthMilestoneType,
    _props?: Record<string, unknown>
  ): void {
    // No-op
  }

  async requestFeature(_input: FeatureRequestInput): Promise<void> {
    // No-op
  }
}
