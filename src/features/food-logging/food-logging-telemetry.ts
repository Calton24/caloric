/**
 * Structured breadcrumbs for the food logging pipeline (Sentry via ErrorReporter).
 * Safe no-op when reporting is disabled. Never logs base64, raw barcodes, or full descriptions.
 */

import { getErrorReporter } from "../../infrastructure/errorReporting/factory";

export const FOOD_LOG_TRUNCATE = 80;

export type FoodLoggingFlowTag =
  | "ai_camera"
  | "barcode"
  | "manual"
  | "voice"
  | "confirm_meal"
  | "sync";

export function truncateFoodLogText(
  text: string | undefined,
  maxLen = FOOD_LOG_TRUNCATE
): string {
  if (!text) return "";
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}

/**
 * Add a food-logging breadcrumb. Errors are swallowed — never throws.
 */
export function foodLogBreadcrumb(
  message: string,
  data?: Record<string, unknown>
): void {
  try {
    const reporter = getErrorReporter();
    reporter.addBreadcrumb({
      message,
      category: "food_logging",
      level: "info",
      data: {
        area: "food_logging",
        route: "camera_pipeline",
        ...data,
      },
    });
  } catch {
    /* noop */
  }
}
