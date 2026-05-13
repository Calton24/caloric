/**
 * Recover from dead Supabase refresh tokens stored on-device.
 *
 * GoTrue will throw / return `AuthApiError: Invalid Refresh Token` when the
 * server has revoked or rotated refresh tokens but SecureStore still holds
 * the old session. Clearing local storage forces a clean signed-out state.
 */

import { getSupabaseClient } from "../../lib/supabase/client";

function messageFromUnknown(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return String(error);
}

/** Matches Supabase `AuthApiError` messages seen when refresh cannot proceed. */
export function isInvalidRefreshTokenError(error: unknown): boolean {
  const msg = messageFromUnknown(error).toLowerCase();
  return (
    msg.includes("invalid refresh token") ||
    msg.includes("refresh token not found") ||
    msg.includes("refresh_token_not_found")
  );
}

/**
 * Drops persisted session only (no server revoke — avoids another failing
 * network call when the refresh token is already invalid).
 */
export async function clearStaleSupabaseAuthStorage(): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // Non-fatal — storage may already be empty.
  }
}
