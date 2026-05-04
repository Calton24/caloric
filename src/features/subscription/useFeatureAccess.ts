/**
 * useFeatureAccess — Unified feature access control
 *
 * Combines subscription status, scan credits, and account gate into
 * a single hook for checking whether a user can access a feature.
 *
 * Cost tiers:
 *   Zero-cost (always available): manual logging, search, basic dashboard, streak
 *   Medium-cost (account required): barcode lookup, lightweight backend
 *   High-cost (premium or credit-gated): AI scan, LLM reasoning, OCR, insights, export
 *
 * Two-layer enforcement:
 *   Client-side: fast UX feedback (this hook — canScan, checkFeature)
 *   Server-side: real enforcement in the ai-scan Edge Function (single choke point)
 *
 * The client NEVER verifies credits directly. The ai-scan Edge Function
 * handles auth, credit check, decrement, AI call, and audit logging.
 * This hook is purely for fast UX display.
 *
 * Usage:
 *   const { canScan, consumeScan, checkFeature } = useFeatureAccess();
 *
 *   async function handleScan() {
 *     const result = canScan();
 *     if (!result.allowed) { // show paywall or gate }
 *     // ... call ai-scan Edge Function (it enforces server-side)
 *     await consumeScan();
 *   }
 */

import { useCallback } from "react";
import { getSupabaseClient } from "../../lib/supabase/client";
import type { GatedFeature } from "../../ui/components/FeatureGatePaywall";
import { useAuth } from "../auth/useAuth";
import { FREE_SCAN_LIMIT, useScanCreditsStore } from "./scanCredits.store";
import { useSubscriptionStore } from "./subscription.store";

// ── Types ──────────────────────────────────────────────────────────────────

export type AccessDeniedReason =
  | "not_authenticated"
  | "no_credits"
  | "premium_required"
  | "blocked"
  | "daily_limit"
  | "verification_required";

/**
 * Trust freshness of the server-verified entitlement.
 *   fresh      — verified within 24h → allow immediately
 *   stale      — verified within 72h → soft recheck (preserve on network failure)
 *   expired    — verified >72h ago   → hard recheck (deny if server unreachable)
 *   unverified — no timestamp yet    → hard recheck (same as expired)
 */
export type VerificationStatus = "fresh" | "stale" | "expired" | "unverified";

/**
 * Classify verification freshness from a server-supplied ISO timestamp.
 * Uses Date.now() only for age comparison — this is acceptable because
 * device clock tampering can skew classification but cannot forge entitlement.
 * The server controls the write path.
 *
 * Pure function, safe to call outside React.
 */
export function getVerificationStatus(
  lastVerifiedAt: string | null
): VerificationStatus {
  if (!lastVerifiedAt) return "unverified";
  const hours =
    (Date.now() - new Date(lastVerifiedAt).getTime()) / (1000 * 60 * 60);
  if (hours <= 24) return "fresh";
  if (hours <= 72) return "stale";
  return "expired";
}

export type AccessResult =
  | { allowed: true }
  | { allowed: false; reason: AccessDeniedReason };

// ── Features that require premium (no free access at all) ──────────────

const PREMIUM_ONLY_FEATURES: Set<GatedFeature> = new Set([
  "macro_trends",
  "ai_insights",
  "export_data",
  "custom_goals",
]);

// ── Hook ───────────────────────────────────────────────────────────────────

export function useFeatureAccess() {
  const { user } = useAuth();
  const isPro = useSubscriptionStore(
    (s) => s.subscription.hasActiveSubscription
  );
  const lastServerVerifiedAt = useSubscriptionStore(
    (s) => s.subscription.lastServerVerifiedAt
  );
  const verificationStatus = getVerificationStatus(lastServerVerifiedAt);
  // Premium users whose last server verification is not fresh need a recheck
  // before the scan proceeds. Stale = soft (preserve on failure); expired/unverified = hard.
  const requiresRevalidation = isPro && verificationStatus !== "fresh";
  const { hasCredits, remaining, consumeCredit } = useScanCreditsStore();

  /**
   * Check if the user can perform an AI scan (client-side — fast UX).
   * - Premium: always allowed
   * - Free + authenticated: allowed if credits remain
   * - Unauthenticated: blocked (need account first)
   */
  const canScan = useCallback((): AccessResult => {
    if (isPro) return { allowed: true };
    if (!user) return { allowed: false, reason: "not_authenticated" };
    if (!hasCredits()) return { allowed: false, reason: "no_credits" };
    return { allowed: true };
  }, [isPro, user, hasCredits]);

  /**
   * Consume one AI scan credit locally. Call AFTER the scan succeeds.
   * No-op for premium users.
   */
  const consumeScan = useCallback(async (): Promise<void> => {
    if (isPro) return;
    await consumeCredit();
  }, [isPro, consumeCredit]);

  /**
   * Check access to a gated feature.
   * - Premium: always allowed
   * - unlimited_scans: delegates to canScan()
   * - Other features: premium only
   */
  const checkFeature = useCallback(
    (feature: GatedFeature): AccessResult => {
      if (isPro) return { allowed: true };
      if (feature === "unlimited_scans") return canScan();
      if (PREMIUM_ONLY_FEATURES.has(feature)) {
        return { allowed: false, reason: "premium_required" };
      }
      return { allowed: true };
    },
    [isPro, canScan]
  );

  return {
    /** Whether the user has an active premium subscription */
    isPro,
    /** Check if AI scan is allowed (client-side — instant UX) */
    canScan,
    /** Consume one scan credit locally (no-op if premium) */
    consumeScan,
    /** Check access to any gated feature */
    checkFeature,
    /** Number of free scans remaining */
    scansRemaining: isPro ? Infinity : remaining(),
    /** Total scan limit for free tier */
    scanLimit: FREE_SCAN_LIMIT,
    /**
     * How stale the last server verification is. Use alongside
     * requiresRevalidation to decide whether to trigger a hard or soft recheck.
     */
    verificationStatus,
    /**
     * True when the user is premium but their last server-verified timestamp
     * is stale or expired. The gate in camera-log triggers recheck() when true.
     */
    requiresRevalidation,
    /**
     * Server-side recheck for premium status.
     *
     * @param hard — when true, returns { allowed: false, reason: "verification_required" }
     *               if the server is unreachable (expired/unverified premium).
     *               When false (stale premium), falls back to canScan() on failure.
     *
     * Call on the denial path OR when requiresRevalidation is true before allowing a scan.
     * ~200ms latency, one RC API call. Saves a premium user from a bogus paywall.
     */
    recheck: useCallback(
      async ({
        hard = false,
      }: { hard?: boolean } = {}): Promise<AccessResult> => {
        try {
          const { data, error } =
            await getSupabaseClient().functions.invoke("sync-entitlement");
          if (!error && data?.ok) {
            useSubscriptionStore.getState().syncFromServer({
              isPro: data.isPro as boolean,
              status: data.status as string,
              expiresAt: (data.expiresAt as string | null) ?? null,
              lastServerVerifiedAt: data.lastServerVerifiedAt as string,
            });
            // Re-read store state directly (not from React closure)
            const freshIsPro =
              useSubscriptionStore.getState().subscription
                .hasActiveSubscription;
            if (freshIsPro) return { allowed: true };
            return { allowed: false, reason: "no_credits" };
          }
        } catch {
          // Non-fatal — fall through
        }
        // Network failure path
        if (hard) return { allowed: false, reason: "verification_required" };
        return canScan();
      },
      [canScan]
    ),
  };
}
