/**
 * Auth Callback Logic — Pure Functions
 *
 * Extracted from auth/callback.tsx so the decision logic can be
 * unit-tested without React rendering or navigation mocks.
 *
 * Phase 1: resolveCallbackAction — validates URL params, extracts code
 * Phase 2: resolveDestination — determines post-exchange destination
 *          based on the SDK's recovery detection (not URL params)
 */

export type CallbackParams = {
  code?: string;
  type?: string;
  error_code?: string;
  error_description?: string;
};

export type CallbackDecision =
  | { action: "error"; message: string }
  | { action: "exchange"; code: string };

export type CallbackDestination = "/auth/reset-password" | "/(tabs)";

/**
 * Given the search params from the deep link, decide what the callback
 * screen should do — without touching React state, navigation, or Supabase.
 *
 * Note: Destination is determined AFTER exchange via resolveDestination(),
 * because the Supabase SDK stores the flow type alongside the PKCE
 * code_verifier and returns it from exchangeCodeForSession().
 */
export function resolveCallbackAction(
  params: CallbackParams
): CallbackDecision {
  // Supabase can send error params directly
  if (params.error_code || params.error_description) {
    return {
      action: "error",
      message: params.error_description || "Invalid or expired link",
    };
  }

  // PKCE code is required
  if (!params.code) {
    return {
      action: "error",
      message: "Missing authentication code. Please request a new link.",
    };
  }

  return { action: "exchange", code: params.code };
}

/**
 * After a successful code exchange, determine where to navigate.
 * `isRecovery` comes from the Supabase SDK's internal tracking
 * (it stores "codeVerifier/PASSWORD_RECOVERY" during resetPasswordForEmail).
 */
export function resolveDestination(isRecovery: boolean): CallbackDestination {
  return isRecovery ? "/auth/reset-password" : "/(tabs)";
}
