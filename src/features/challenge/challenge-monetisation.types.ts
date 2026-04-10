// ── Challenge Monetisation Types ──────────────────────────────────────────

/**
 * Behavioural phase the user is currently in.
 * Resolved by `resolvePhase()` — never stored, always derived.
 */
export type ChallengePhase =
  | "hook"
  | "first_paywall"
  | "value_buffer"
  | "structured_push"
  | "identity";

/** Paywall presentation variant. */
export type PaywallVariant = "intro" | "milestone" | "buffer";

/** Milestone days where structured push paywalls fire. */
export type MilestoneDay = 7 | 14 | 21;

/** Tracks which milestone paywalls have been displayed (set on display). */
export interface MilestonesSeen {
  day7: boolean;
  day14: boolean;
  day21: boolean;
}

/** Output of resolvePhase(). */
export interface PhaseResult {
  phase: ChallengePhase;
  milestoneDay?: MilestoneDay;
}

/** Input for shouldTriggerPaywall(). */
export interface TriggerContext {
  phase: ChallengePhase;
  lastPhase?: ChallengePhase;
  lastShownAt?: number; // epoch ms
  currentTime: number; // epoch ms
  isInCriticalFlow: boolean;
}

/** Input for resolvePhase(). */
export interface PhaseInput {
  challengeDay: number;
  insightTriggered: boolean;
  introUsed: boolean;
  hasPurchased: boolean;
  milestonesSeen: MilestonesSeen;
}

/** Paywall display context passed to UI. */
export interface PaywallContext {
  variant: PaywallVariant;
  headline: string;
  body: string;
  cta: string;
  /** The specific insight that triggered this paywall (intro variant only). */
  insightMessage?: string;
  milestoneDay?: MilestoneDay;
  showIntroPricing: boolean;
  showAnnualDiscount: boolean;
}

/** Input for isInsightMoment(). */
export interface InsightInput {
  scanCount: number;
  calorieDeviation: number;
  proteinRatio: number;
  dailyIntakePercent: number;
  timeOfDay: number; // hour 0-23
}
