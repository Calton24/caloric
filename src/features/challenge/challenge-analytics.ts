/**
 * Challenge Analytics — typed event helpers for the monetisation system.
 *
 * Uses the global analytics singleton. Safe to call from anywhere.
 */

import { analytics } from "../../infrastructure/analytics";
import type {
    ChallengePhase,
    PaywallVariant,
} from "./challenge-monetisation.types";

export function trackChallengePhaseEntered(props: {
  phase: ChallengePhase;
  challengeDay: number;
  scanCount: number;
}) {
  analytics.track("challenge_phase_entered", props);
}

export function trackChallengePaywallShown(props: {
  variant: PaywallVariant;
  challengeDay: number;
}) {
  analytics.track("challenge_paywall_shown", props);
}

export function trackChallengePaywallDismissed(props: {
  variant: PaywallVariant;
  challengeDay: number;
}) {
  analytics.track("challenge_paywall_dismissed", props);
}

export function trackChallengePurchaseCompleted(props: {
  challengeDay: number;
  phase: ChallengePhase;
}) {
  analytics.track("challenge_purchase_completed", props);
}

export function trackChallengeCompleted(props: {
  totalDays: number;
  totalScans: number;
}) {
  analytics.track("challenge_completed", props);
}

export function trackChallengeStatShared(props: { medium: string }) {
  analytics.track("challenge_stat_shared", props);
}
