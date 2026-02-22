/**
 * Growth Layer - Types
 */

export type GrowthMilestoneType = "activation" | "retention" | "revenue";

export type GrowthContract = {
  activationEvent: string;
  retentionEvent: string;
  revenueEvent: string;
};

export type FeatureRequestInput = {
  title: string;
  description?: string;
  category?: "bug" | "feature" | "improvement";
  severity?: "low" | "med" | "high";
};

export type FeatureRequestContext = {
  screen?: string;
  appProfile: string;
  anonId: string;
  userId?: string;
  build: {
    version: string;
    buildNumber: string;
    platform: "ios" | "android";
  };
};

export interface GrowthClient {
  setUser(user: { userId: string } | null): void;
  track(event: string, props?: Record<string, unknown>): void;
  milestone(type: GrowthMilestoneType, props?: Record<string, unknown>): void;
  requestFeature(input: FeatureRequestInput): Promise<void>;
}
