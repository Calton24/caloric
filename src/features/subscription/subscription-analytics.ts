/**
 * Lightweight monetization funnel analytics (trial + paywall + IAP outcomes).
 */

import { analytics } from "../../infrastructure/analytics/analytics";

export const SUBSCRIPTION_ANALYTICS_EVENTS = {
  TRIAL_STARTED: "trial_started",
  TRIAL_EXPIRED: "trial_expired",
  PAYWALL_GATE_SHOWN: "paywall_gate_shown",
  UPGRADE_PAYWALL_OPENED: "upgrade_paywall_opened",
  SUBSCRIPTION_PURCHASE_STARTED: "subscription_purchase_started",
  SUBSCRIPTION_PURCHASE_COMPLETED: "subscription_purchase_completed",
  SUBSCRIPTION_RESTORE_COMPLETED: "subscription_restore_completed",
} as const;

export function trackTrialStarted(props?: Record<string, unknown>): void {
  analytics.track(SUBSCRIPTION_ANALYTICS_EVENTS.TRIAL_STARTED, props);
}

export function trackTrialExpired(props?: Record<string, unknown>): void {
  analytics.track(SUBSCRIPTION_ANALYTICS_EVENTS.TRIAL_EXPIRED, props);
}

export function trackPaywallGateShown(props?: Record<string, unknown>): void {
  analytics.track(SUBSCRIPTION_ANALYTICS_EVENTS.PAYWALL_GATE_SHOWN, props);
}

export function trackUpgradePaywallOpened(
  props?: Record<string, unknown>
): void {
  analytics.track(SUBSCRIPTION_ANALYTICS_EVENTS.UPGRADE_PAYWALL_OPENED, props);
}

export function trackSubscriptionPurchaseStarted(
  props?: Record<string, unknown>
): void {
  analytics.track(
    SUBSCRIPTION_ANALYTICS_EVENTS.SUBSCRIPTION_PURCHASE_STARTED,
    props
  );
}

export function trackSubscriptionPurchaseCompleted(
  props?: Record<string, unknown>
): void {
  analytics.track(
    SUBSCRIPTION_ANALYTICS_EVENTS.SUBSCRIPTION_PURCHASE_COMPLETED,
    props
  );
}

export function trackSubscriptionRestoreCompleted(
  props?: Record<string, unknown>
): void {
  analytics.track(
    SUBSCRIPTION_ANALYTICS_EVENTS.SUBSCRIPTION_RESTORE_COMPLETED,
    props
  );
}
