/**
 * Experiment Analytics — Exposure & Conversion Tracking
 *
 * Log these events to measure experiment impact:
 * - exposure: when user sees experimental copy
 * - click: when user taps the CTA
 * - conversion: when the goal action completes
 *
 * All events include `is_forced` flag to filter debug data.
 *
 * ⚠️ REVENUE NOTE: The `revenue` field is the catalog/display price from
 * the App Store product, NOT the actual transaction amount. For accurate
 * revenue data (intro offers, discounts, regional pricing), use RevenueCat
 * dashboard or webhooks as source of truth.
 */

import { analytics } from "../infrastructure/analytics";
import { isVariantForced } from "./experiment-assignment";
import type { ExperimentKey, Variant } from "./experiments";

type ExperimentEventProps = {
  experiment: ExperimentKey;
  variant: Variant;
  locale: string;
  screen: string;
};

type AnalyticsPayload = ExperimentEventProps & {
  is_forced: boolean;
};

function buildPayload(props: ExperimentEventProps): AnalyticsPayload {
  return {
    ...props,
    is_forced: isVariantForced(props.experiment),
  };
}

/**
 * Track when user is exposed to experimental copy.
 * Call this when the CTA becomes visible, not on every render.
 */
export function trackExperimentExposure(props: ExperimentEventProps): void {
  analytics.track("experiment_exposed", buildPayload(props));
}

/**
 * Track when user clicks the experimental CTA.
 */
export function trackExperimentClick(props: ExperimentEventProps): void {
  analytics.track("experiment_clicked", buildPayload(props));
}

// Granular conversion events for proper funnel analysis
type ConversionType =
  // Welcome CTA funnel
  | "onboarding_step_advanced"
  | "onboarding_completed"
  // Paywall CTA funnel
  | "checkout_started"
  | "trial_started"
  | "purchase_completed"
  | "paywall_skipped"
  | "paywall_dismissed";

type ConversionProps = ExperimentEventProps & {
  conversion: ConversionType;
  /** Revenue amount for purchase events (required for revenue panel) */
  revenue?: number;
  /** ISO currency code (e.g., "USD", "EUR") */
  currency?: string;
};

/**
 * Track when the experiment's goal conversion happens.
 * Use specific conversion types for proper funnel analysis.
 *
 * For purchase_completed, include revenue + currency for the revenue dashboard.
 */
export function trackExperimentConversion(props: ConversionProps): void {
  const payload: Record<string, unknown> = {
    ...buildPayload(props),
    conversion: props.conversion,
  };

  // Include revenue data for monetary conversions
  if (props.revenue !== undefined) {
    payload.revenue = props.revenue;
  }
  if (props.currency) {
    payload.currency = props.currency;
  }

  analytics.track("experiment_converted", payload);
}

/**
 * Helper to create consistent event props
 */
export function createExperimentProps(
  experiment: ExperimentKey,
  variant: Variant,
  locale: string,
  screen: string
): ExperimentEventProps {
  return { experiment, variant, locale, screen };
}
