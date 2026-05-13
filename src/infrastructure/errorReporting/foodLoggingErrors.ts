/**
 * Food logging funnel — Sentry breadcrumbs + tagged errors.
 *
 * Payload policy: no images, transcripts, tokens, or emails. Truncate titles.
 */

import { initErrorReporting, getErrorReporter } from "./factory";
import { scrubExtra } from "./reportError";

export type FoodLoggingFlow =
  | "manual"
  | "voice"
  | "ai_camera"
  | "barcode"
  | "quick_add"
  | "confirm_meal"
  | "sync"
  | "healthkit"
  | "scan_result"
  | "unknown";

export type FoodLoggingContext = {
  flow: FoodLoggingFlow;
  step: string;
  route?: string;
  userId?: string | null;
  mealId?: string;
  foodTitle?: string;
  calories?: number;
  hasImage?: boolean;
  barcode?: string;
  provider?: "openai" | "gemini" | "barcode_api" | "local" | "supabase";
  /** Free-form, scrubbed extras for one-off step diagnostics. Avoid PII. */
  extras?: Record<string, unknown>;
};

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, (_k, v) => {
      if (typeof v === "bigint") return v.toString();
      if (typeof v === "function") return "[Function]";
      if (v instanceof Error) return { name: v.name, message: v.message };
      return v;
    });
  } catch {
    return Object.prototype.toString.call(value);
  }
}

/**
 * Convert any thrown value (including Supabase's plain error objects) into a
 * proper `Error` so Sentry shows a useful message instead of `[object Object]`.
 *
 * Supabase client throws plain objects like:
 *   { message: "Could not find column...", code: "PGRST204", details: null }
 *
 * `String(error)` on those gives "[object Object]" because they don't override
 * `toString()`. We must read `.message` explicitly.
 */
function normaliseError(error: unknown): Error & { originalError?: unknown } {
  if (error instanceof Error) return error;

  if (typeof error === "string") return new Error(error);

  if (isPlainRecord(error)) {
    const msg =
      typeof error.message === "string" && error.message.trim()
        ? error.message
        : safeJson(error);

    const err = Object.assign(new Error(msg), {
      name:
        typeof error.name === "string" && error.name.trim()
          ? error.name
          : "NonErrorObject",
      originalError: error,
    });

    return err;
  }

  return new Error(String(error));
}

function truncateTitle(title: string | undefined, max = 80): string | undefined {
  if (title == null) return undefined;
  if (title.length <= max) return title;
  return `${title.slice(0, max)}…`;
}

function truncateBarcode(code: string | undefined, max = 24): string | undefined {
  if (code == null) return undefined;
  const s = String(code);
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

/** Safe extras for Sentry (PII-scrubbed via scrubExtra). */
function foodLoggingExtra(ctx: FoodLoggingContext): Record<string, unknown> {
  return scrubExtra({
    flow: ctx.flow,
    step: ctx.step,
    route: ctx.route,
    user_present: Boolean(ctx.userId),
    meal_id: ctx.mealId,
    food_title: truncateTitle(ctx.foodTitle),
    calories: ctx.calories,
    has_image: ctx.hasImage === true,
    barcode: truncateBarcode(ctx.barcode),
    provider: ctx.provider,
    ...(ctx.extras ?? {}),
  });
}

/**
 * Breadcrumb for the food logging funnel. High frequency — does not create issues.
 */
export function addFoodLoggingBreadcrumb(
  name: string,
  data?: Record<string, unknown>
): void {
  try {
    initErrorReporting();
    const payload =
      data && Object.keys(data).length > 0
        ? scrubExtra(data as Record<string, unknown>)
        : undefined;
    getErrorReporter().addBreadcrumb({
      message: name,
      category: "food_logging",
      level: "info",
      data: payload,
    });
  } catch {
    // ignore
  }
}

export type CaptureFoodLoggingOptions = {
  level?: "error" | "warning";
  /** When true, tags `test=true` for Sentry alert routing / filtering. */
  test?: boolean;
};

/**
 * Capture an exception with food_logging tags + scrubbed context.
 */
export function captureFoodLoggingError(
  error: unknown,
  context: FoodLoggingContext,
  options?: CaptureFoodLoggingOptions
): void {
  try {
    initErrorReporting();
    const err = normaliseError(error);
    const tags: Record<string, string> = {
      area: "food_logging",
      flow: context.flow,
      step: context.step,
    };
    if (context.route) tags.route = context.route;
    if (options?.test) tags.test = "true";

    const extra: Record<string, unknown> = { ...foodLoggingExtra(context) };

    // When the thrown value is a plain object (e.g. Supabase error), attach its
    // full structure so Sentry shows code/details/hint alongside the message.
    if (isPlainRecord(error)) {
      extra.originalError = safeJson(error);
    }

    getErrorReporter().captureException(err, {
      tags,
      level: options?.level ?? "error",
      extra,
    });
  } catch {
    // ignore
  }
}

/**
 * DEV / QA: send a tagged test event through the same pipeline as real errors.
 * Does not throw — safe to call from a settings button.
 */
export function triggerFoodLoggingTestError(): void {
  captureFoodLoggingError(
    new Error("CalCut dev/QA: food logging pipeline test"),
    {
      flow: "confirm_meal",
      step: "manual_test_trigger",
      route: "dev_tools",
    },
    { test: true, level: "error" }
  );
  addFoodLoggingBreadcrumb("food_logging.test_trigger_sent", {
    test: true,
  });
}

/**
 * Optional span wrapper — breadcrumbs only (no capture) to avoid duplicate events.
 */
export async function withFoodLoggingSpan<T>(
  name: string,
  fn: () => Promise<T>,
  data?: Record<string, unknown>
): Promise<T> {
  addFoodLoggingBreadcrumb(`${name}_started`, data);
  try {
    const result = await fn();
    addFoodLoggingBreadcrumb(`${name}_success`, data);
    return result;
  } catch (error) {
    addFoodLoggingBreadcrumb(`${name}_failed`, {
      ...data,
      errorMessage:
        error instanceof Error ? error.message : String(error ?? "unknown"),
    });
    throw error;
  }
}
