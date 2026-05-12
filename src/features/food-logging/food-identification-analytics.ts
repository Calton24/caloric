/**
 * Food identification funnel — PostHog-friendly event names (snake_case).
 *
 * Fired from the shared fallback UI and from the nutrition pipeline so you can
 * correlate: scan failures → recovery attempts → parse / match outcomes.
 */

import { analytics } from "../../infrastructure/analytics/analytics";

export type FoodIdentificationSource = "camera" | "barcode" | "manual";

export type FoodIdentificationErrorReason =
  | "no_food_detected"
  | "low_confidence"
  | "barcode_not_found"
  | "ai_failed"
  | "manual_not_found"
  | "network_error"
  | "unknown";

export const FOOD_IDENTIFICATION_EVENTS = {
  FAILED: "food_identification_failed",
  RETRY: "food_identification_retry",
  MANUAL_RECOVERY: "food_identification_manual_recovery",
  PROVIDER_SUCCESS: "food_identification_provider_success",
  PROVIDER_FAILED: "food_identification_provider_failed",
  ABANDONED: "food_identification_abandoned",
} as const;

export type FoodIdentificationRetryKind = "retry_ai" | "retake" | "scan_again";

export function trackFoodIdentificationFailed(props: {
  source: FoodIdentificationSource;
  error_reason: FoodIdentificationErrorReason | "unknown";
  has_image: boolean;
  has_barcode: boolean;
  initial_query_length: number;
}): void {
  analytics.track(FOOD_IDENTIFICATION_EVENTS.FAILED, props);
}

export function trackFoodIdentificationRetry(props: {
  source: FoodIdentificationSource;
  retry_kind: FoodIdentificationRetryKind;
}): void {
  analytics.track(FOOD_IDENTIFICATION_EVENTS.RETRY, props);
}

export function trackFoodIdentificationManualRecovery(props: {
  source: FoodIdentificationSource;
}): void {
  analytics.track(FOOD_IDENTIFICATION_EVENTS.MANUAL_RECOVERY, props);
}

export function trackFoodIdentificationAbandoned(props: {
  source: FoodIdentificationSource;
  error_reason?: FoodIdentificationErrorReason | "unknown";
}): void {
  analytics.track(FOOD_IDENTIFICATION_EVENTS.ABANDONED, props);
}

export type FoodIdentificationProviderSuccessProps =
  | {
      surface: "nutrition_pipeline";
      input_source: string;
      parse_method: string;
      item_count: number;
      overall_confidence?: number;
      /** Present when this run originated from the shared fallback screen. */
      recovery_source?: FoodIdentificationSource;
    }
  | {
      surface: "legacy_fallback";
      input_source: string;
      parse_method: "legacy_heuristic";
      item_count: number;
      recovery_source?: FoodIdentificationSource;
    };

export function trackFoodIdentificationProviderSuccess(
  props: FoodIdentificationProviderSuccessProps
): void {
  analytics.track(FOOD_IDENTIFICATION_EVENTS.PROVIDER_SUCCESS, props);
}

export type FoodIdentificationProviderFailedProps =
  | {
      surface: "nutrition_pipeline";
      input_source: string;
      parse_method: string;
      reason: string;
      recovery_source?: FoodIdentificationSource;
    }
  | {
      surface: "fallback_recovery";
      recovery_source: FoodIdentificationSource;
      reason: "no_match" | "exception";
      query_length?: number;
    }
  | {
      surface: "primary_logging_flow";
      input_source: string;
      parse_method?: string;
      reason: string;
      recovery_source?: FoodIdentificationSource;
    };

export function trackFoodIdentificationProviderFailed(
  props: FoodIdentificationProviderFailedProps
): void {
  analytics.track(FOOD_IDENTIFICATION_EVENTS.PROVIDER_FAILED, props);
}
