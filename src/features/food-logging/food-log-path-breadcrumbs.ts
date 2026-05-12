import * as Sentry from "@sentry/react-native";
import { scrubExtra } from "../../infrastructure/errorReporting/reportError";

export function foodLogPathBreadcrumb(
  message:
    | "food_log.press"
    | "food_log.validate_start"
    | "food_log.validate_success"
    | "food_log.commit_start"
    | "food_log.commit_success"
    | "food_log.draft_clear_start"
    | "food_log.draft_clear_success"
    | "food_log.exit_start"
    | "food_log.exit_success"
    | "food_log.home_apply_start"
    | "food_log.home_apply_success",
  data?: {
    flowId?: string;
    mealId?: string;
    transactionId?: string;
    pathname?: string;
  }
): void {
  try {
    Sentry.addBreadcrumb({
      category: "food_log",
      level: "info",
      message,
      data: data ? scrubExtra(data as Record<string, unknown>) : undefined,
    });
  } catch {
    /* ignore */
  }
}
