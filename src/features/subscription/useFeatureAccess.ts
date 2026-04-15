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
  | "daily_limit";

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
  };
}
