/**
 * Server credit state — READ-ONLY client module
 *
 * The ai-scan Edge Function is the single choke point for all enforcement.
 * This module only READS server state for client UX display.
 * The client NEVER writes credits or subscription state directly.
 *
 * Usage:
 *   - fetchUsageState() → show "2 scans remaining" in UI
 *   - checkUserBlocked() → check on app load
 */

import { getSupabaseClient } from "../../../lib/supabase/client";
import { logger } from "../../../logging/logger";

// ── Types ──────────────────────────────────────────────────────────────

export interface UsageState {
  creditsRemaining: number;
  dailyCount: number;
  totalUsed: number;
}

export interface SubscriptionInfo {
  status:
    | "free"
    | "trialing"
    | "active"
    | "grace_period"
    | "expired"
    | "cancelled";
  isPro: boolean;
  expiresAt: string | null;
}

// ── Read usage state (for UI display) ──────────────────────────────────

/**
 * Fetch the user's current usage state from the server.
 * Used for UX display ("2 scans remaining"). NOT for enforcement.
 * The ai-scan Edge Function handles real enforcement.
 */
export async function fetchUsageState(
  userId: string
): Promise<UsageState | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("usage_state")
      .select(
        "ai_scan_credits_remaining, ai_scan_daily_count, total_ai_scans_used"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return null;

    return {
      creditsRemaining: data.ai_scan_credits_remaining,
      dailyCount: data.ai_scan_daily_count,
      totalUsed: data.total_ai_scans_used,
    };
  } catch (err) {
    logger.error("[CreditState] fetchUsageState error:", err);
    return null;
  }
}

// ── Read subscription state ────────────────────────────────────────────

/**
 * Fetch the user's subscription state from the server.
 * This is the webhook-mirrored state from RevenueCat.
 */
export async function fetchSubscriptionState(
  userId: string
): Promise<SubscriptionInfo | null> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("subscription_state")
      .select("status, expires_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) {
      return { status: "free", isPro: false, expiresAt: null };
    }

    const isPro =
      data.status === "active" ||
      data.status === "trialing" ||
      data.status === "grace_period";

    return {
      status: data.status,
      isPro,
      expiresAt: data.expires_at,
    };
  } catch (err) {
    logger.error("[CreditState] fetchSubscriptionState error:", err);
    return null;
  }
}

// ── Block check ────────────────────────────────────────────────────────

/**
 * Check if a user is blocked. Call on app load.
 */
export async function checkUserBlocked(userId: string): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("profiles")
      .select("is_blocked")
      .eq("user_id", userId)
      .maybeSingle();

    if (error || !data) return false;
    return data.is_blocked === true;
  } catch {
    return false;
  }
}
