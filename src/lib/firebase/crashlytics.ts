/**
 * Firebase Crashlytics Wrapper
 * Safe wrapper with no-op behavior when Firebase is disabled
 */

import { logger } from "../../logging/logger";
import { getCrashlytics } from "./init";

/**
 * Record a non-fatal error to Crashlytics
 * No-op if Crashlytics is disabled
 *
 * @param error - Error object or string message
 * @param context - Optional context object for debugging
 *
 * @example
 * recordError(new Error('API call failed'), {
 *   endpoint: '/users/123',
 *   statusCode: 500
 * });
 */
export async function recordError(
  error: Error | string,
  context?: Record<string, any>
): Promise<void> {
  const crashlytics = getCrashlytics();

  if (!crashlytics) {
    // No-op when disabled, but still log to console
    logger.error("[Crashlytics] Error (not reported):", { error, context });
    return;
  }

  try {
    // Convert string to Error if needed
    const errorObj = typeof error === "string" ? new Error(error) : error;

    // Add context as custom attributes
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        crashlytics.setAttribute(key, String(value));
      });
    }

    await crashlytics.recordError(errorObj);
    logger.log("[Crashlytics] Error recorded:", errorObj.message);
  } catch (err) {
    logger.error("[Crashlytics] Failed to record error:", err);
  }
}

/**
 * Log a custom message to Crashlytics
 * Useful for debugging crash reports
 * No-op if Crashlytics is disabled
 *
 * @param message - Log message
 *
 * @example
 * log('User opened settings screen');
 */
export async function log(message: string): Promise<void> {
  const crashlytics = getCrashlytics();

  if (!crashlytics) {
    return;
  }

  try {
    await crashlytics.log(message);
  } catch (error) {
    logger.error("[Crashlytics] Failed to log message:", error);
  }
}

/**
 * Set user identifier for crash reports
 * Helps identify which users are experiencing crashes
 * No-op if Crashlytics is disabled
 *
 * @param userId - Unique user identifier (or null to clear)
 *
 * @example
 * setCrashUserId('user_abc123');
 */
export async function setCrashUserId(userId: string | null): Promise<void> {
  const crashlytics = getCrashlytics();

  if (!crashlytics) {
    return;
  }

  try {
    await crashlytics.setUserId(userId || "");
    logger.log(`[Crashlytics] User ID set:`, userId);
  } catch (error) {
    logger.error("[Crashlytics] Failed to set user ID:", error);
  }
}

/**
 * Set custom attribute for crash reports
 * Max 64 key-value pairs
 * No-op if Crashlytics is disabled
 *
 * @param key - Attribute key
 * @param value - Attribute value (string)
 *
 * @example
 * setAttribute('subscription_tier', 'premium');
 */
export async function setAttribute(key: string, value: string): Promise<void> {
  const crashlytics = getCrashlytics();

  if (!crashlytics) {
    return;
  }

  try {
    await crashlytics.setAttribute(key, value);
  } catch (error) {
    logger.error("[Crashlytics] Failed to set attribute:", error);
  }
}

/**
 * Set multiple custom attributes at once
 * No-op if Crashlytics is disabled
 *
 * @param attributes - Object with key-value pairs
 *
 * @example
 * setAttributes({
 *   environment: 'production',
 *   app_version: '1.2.3',
 *   feature_flag_x: 'enabled'
 * });
 */
export async function setAttributes(attributes: {
  [key: string]: string;
}): Promise<void> {
  const crashlytics = getCrashlytics();

  if (!crashlytics) {
    return;
  }

  try {
    await crashlytics.setAttributes(attributes);
    logger.log("[Crashlytics] Attributes set:", attributes);
  } catch (error) {
    logger.error("[Crashlytics] Failed to set attributes:", error);
  }
}

/**
 * Enable or disable crash collection
 * Useful for GDPR compliance
 * No-op if Crashlytics is disabled
 *
 * @param enabled - Whether to enable crash collection
 */
export async function setCrashCollectionEnabled(
  enabled: boolean
): Promise<void> {
  const crashlytics = getCrashlytics();

  if (!crashlytics) {
    return;
  }

  try {
    await crashlytics.setCrashlyticsCollectionEnabled(enabled);
    logger.log(`[Crashlytics] Collection ${enabled ? "enabled" : "disabled"}`);
  } catch (error) {
    logger.error("[Crashlytics] Failed to set collection enabled:", error);
  }
}

/**
 * Check if app crashed on previous execution
 * Useful for showing "sorry for the crash" messages
 * Returns false if Crashlytics is disabled
 */
export async function didCrashOnPreviousExecution(): Promise<boolean> {
  const crashlytics = getCrashlytics();

  if (!crashlytics) {
    return false;
  }

  try {
    return await crashlytics.didCrashOnPreviousExecution();
  } catch (error) {
    logger.error("[Crashlytics] Failed to check previous crash status:", error);
    return false;
  }
}

/**
 * Force a crash (for testing only!)
 * Only use in development/staging
 * No-op if Crashlytics is disabled
 */
export function crash(): void {
  const crashlytics = getCrashlytics();

  if (!crashlytics) {
    logger.warn("[Crashlytics] Crash test disabled (Crashlytics not enabled)");
    return;
  }

  logger.warn("[Crashlytics] Forcing crash for testing...");
  crashlytics.crash();
}

/**
 * Send unsent crash reports immediately
 * Useful before logout or app termination
 * No-op if Crashlytics is disabled
 */
export async function sendUnsentReports(): Promise<void> {
  const crashlytics = getCrashlytics();

  if (!crashlytics) {
    return;
  }

  try {
    await crashlytics.sendUnsentReports();
    logger.log("[Crashlytics] Unsent reports sent");
  } catch (error) {
    logger.error("[Crashlytics] Failed to send unsent reports:", error);
  }
}

/**
 * Delete unsent crash reports
 * Useful for privacy/GDPR
 * No-op if Crashlytics is disabled
 */
export async function deleteUnsentReports(): Promise<void> {
  const crashlytics = getCrashlytics();

  if (!crashlytics) {
    return;
  }

  try {
    await crashlytics.deleteUnsentReports();
    logger.log("[Crashlytics] Unsent reports deleted");
  } catch (error) {
    logger.error("[Crashlytics] Failed to delete unsent reports:", error);
  }
}

/**
 * Convenience function: Record error with user context
 * Automatically adds user ID and common attributes
 *
 * @param error - Error object
 * @param userId - Optional user ID
 * @param additionalContext - Additional context
 */
export async function recordErrorWithContext(
  error: Error | string,
  userId?: string,
  additionalContext?: Record<string, any>
): Promise<void> {
  if (userId) {
    await setCrashUserId(userId);
  }

  await recordError(error, additionalContext);
}
