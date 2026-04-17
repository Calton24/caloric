/**
 * A/B Experiment Configuration
 *
 * Defines active experiments and their variants.
 * Keep this minimal — only add experiments you're actively running.
 */

export const EXPERIMENTS = {
  welcome_cta_v1: ["A", "B"],
  paywall_cta_default_v1: ["A", "B"],
} as const;

export type ExperimentKey = keyof typeof EXPERIMENTS;
export type Variant = "A" | "B";

export type ExperimentAssignments = {
  [K in ExperimentKey]?: Variant;
};

/**
 * Experiment metadata for analytics/debugging
 */
export const EXPERIMENT_META: Record<
  ExperimentKey,
  { description: string; hypothesis: string }
> = {
  welcome_cta_v1: {
    description: "Welcome CTA: ownership vs action phrasing",
    hypothesis: "Action-driven 'Start' may outperform 'Create' in onboarding",
  },
  paywall_cta_default_v1: {
    description: "Paywall CTA: access clarity vs unlock framing",
    hypothesis: "Stronger 'Unlock Everything' may drive higher conversion",
  },
};
