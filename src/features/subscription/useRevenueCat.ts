/**
 * useRevenueCat
 *
 * Convenience hook for consuming RevenueCat billing state and actions.
 * Reads subscription status from Zustand (synced in real-time by BillingGate)
 * and exposes helpers to present the paywall, Customer Center, and restore.
 *
 * Intro eligibility is store-aware:
 *   - iOS: resolved via checkTrialOrIntroductoryPriceEligibility (accurate)
 *   - Android: always UNKNOWN from SDK; treated as eligible (store enforces at purchase)
 *
 * Usage:
 *   const { isPro, presentPaywall, presentCustomerCenter, restorePurchases } = useRevenueCat();
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Platform } from "react-native";
import { getBillingProvider } from "../../lib/billing";
import { useChallengeStore } from "../challenge/challenge.store";
import { useSubscriptionStore } from "./subscription.store";

// ── Intro eligibility ────────────────────────────────────────────────────

/**
 * Store-level intro eligibility:
 *   - "eligible"   — store confirms intro offer is available
 *   - "ineligible" — store confirms intro offer is NOT available
 *   - "unknown"    — SDK can't determine (Android always, iOS before check)
 */
export type IntroEligibility = "eligible" | "ineligible" | "unknown";

/** INTRO_ELIGIBILITY_STATUS enum values from RevenueCat SDK */
const RC_INTRO_ELIGIBLE = 2;
const RC_INTRO_INELIGIBLE = 1;

export function useRevenueCat() {
  const subscription = useSubscriptionStore((s) => s.subscription);
  const challenge = useChallengeStore((s) => s.challenge);
  const hasSeenIntroMoment = useChallengeStore((s) => s.introUsed);

  const [isRestoring, setIsRestoring] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);
  const [introEligibility, setIntroEligibility] =
    useState<IntroEligibility>("unknown");

  const isChallengeActive = challenge?.status === "active";

  // ── Offerings ───────────────────────────────────────────────────────────

  const fetchOfferings = useCallback(async () => {
    setIsLoadingOfferings(true);
    try {
      const provider = getBillingProvider();
      const result = await provider.getOfferings();
      setOfferings(result);
      return result;
    } catch {
      // Silent — offerings may not be configured yet
      return null;
    } finally {
      setIsLoadingOfferings(false);
    }
  }, []);

  // Auto-fetch offerings on mount
  useEffect(() => {
    fetchOfferings();
  }, [fetchOfferings]);

  // ── Offering resolution ─────────────────────────────────────────────────

  /**
   * Select the correct offering based on challenge state:
   *   - challenge active → "challenge" offering (falls back to current)
   *   - otherwise        → "default" offering (falls back to current)
   */
  const activeOffering = useMemo(() => {
    if (!offerings) return null;
    if (isChallengeActive) {
      return offerings.challenge ?? offerings.current ?? null;
    }
    return offerings.default ?? offerings.current ?? null;
  }, [offerings, isChallengeActive]);

  const packages = activeOffering?.availablePackages ?? [];

  // ── Store intro eligibility check ───────────────────────────────────────

  useEffect(() => {
    if (!isChallengeActive || packages.length === 0) {
      setIntroEligibility("unknown");
      return;
    }

    let cancelled = false;

    async function checkEligibility() {
      // Find the weekly package — that's where the intro offer lives
      const weeklyPkg = packages.find(
        (pkg: any) => pkg.identifier === "$rc_weekly"
      );
      const product = weeklyPkg?.product ?? weeklyPkg?.storeProduct;

      if (!product?.identifier) {
        if (!cancelled) setIntroEligibility("unknown");
        return;
      }

      // iOS: accurate eligibility from the store
      if (Platform.OS === "ios") {
        try {
          const RC = require("react-native-purchases").default; // eslint-disable-line @typescript-eslint/no-require-imports
          const result = await RC.checkTrialOrIntroductoryPriceEligibility([
            product.identifier,
          ]);
          const status = result?.[product.identifier]?.status;

          if (!cancelled) {
            if (status === RC_INTRO_ELIGIBLE) {
              setIntroEligibility("eligible");
            } else if (status === RC_INTRO_INELIGIBLE) {
              setIntroEligibility("ineligible");
            } else {
              setIntroEligibility("unknown");
            }
          }
        } catch {
          if (!cancelled) setIntroEligibility("unknown");
        }
        return;
      }

      // Android: SDK always returns UNKNOWN. Store enforces at purchase time.
      // We trust the store and treat UNKNOWN as potentially eligible.
      if (!cancelled) setIntroEligibility("unknown");
    }

    checkEligibility();
    return () => {
      cancelled = true;
    };
  }, [isChallengeActive, packages]);

  // ── Purchase ─────────────────────────────────────────────────────────────

  const purchasePackage = useCallback(async (pkg: any) => {
    try {
      const provider = getBillingProvider() as any;
      if (typeof provider.purchasePackage === "function") {
        return await provider.purchasePackage(pkg);
      }
      // Fallback: present managed paywall
      await provider.presentPaywall();
      return null;
    } catch {
      Alert.alert("Error", "Purchase failed. Please try again.");
      return null;
    }
  }, []);

  // ── Paywall ─────────────────────────────────────────────────────────────

  const presentPaywall = useCallback(async () => {
    try {
      await getBillingProvider().presentPaywall();
    } catch {
      Alert.alert("Error", "Could not open the paywall. Please try again.");
    }
  }, []);

  const presentPaywallIfNeeded = useCallback(async () => {
    const provider = getBillingProvider();
    try {
      if (typeof (provider as any).presentPaywallIfNeeded === "function") {
        await (provider as any).presentPaywallIfNeeded();
      } else {
        await provider.presentPaywall();
      }
    } catch {
      Alert.alert("Error", "Could not open the paywall. Please try again.");
    }
  }, []);

  // ── Customer Center ──────────────────────────────────────────────────────

  const presentCustomerCenter = useCallback(async () => {
    try {
      await getBillingProvider().presentCustomerCenter?.();
    } catch {
      Alert.alert(
        "Error",
        "Could not open subscription management. Please try again."
      );
    }
  }, []);

  // ── Restore ──────────────────────────────────────────────────────────────

  const restorePurchases = useCallback(async () => {
    setIsRestoring(true);
    try {
      await getBillingProvider().restorePurchases();
      Alert.alert(
        "Restored",
        "Your purchases have been restored successfully."
      );
    } catch {
      Alert.alert(
        "Error",
        "Could not restore purchases. Please try again later."
      );
    } finally {
      setIsRestoring(false);
    }
  }, []);

  // ── Derived intro eligibility ────────────────────────────────────────────

  /**
   * True when we should show intro pricing in the UI.
   * Three conditions must ALL be true:
   *   1. Challenge is active
   *   2. User hasn't already seen the intro paywall moment (UI gate)
   *   3. Store says eligible (iOS) OR status is unknown (Android — store enforces)
   *
   * iOS: only "eligible" passes — Apple eligibility is per subscription group.
   * Android: "unknown" passes — SDK can't check, store enforces at purchase time.
   */
  const isIntroEligible =
    isChallengeActive &&
    !hasSeenIntroMoment &&
    (Platform.OS === "ios"
      ? introEligibility === "eligible"
      : introEligibility !== "ineligible");

  return {
    /** True when the user has an active paid subscription */
    isPro: subscription.hasActiveSubscription,
    /** Current plan: "monthly" | "annual" | null */
    plan: subscription.plan,
    /** True while a restore is in progress */
    isRestoring,
    /** Raw offerings from RevenueCat (auto-fetched on mount) */
    offerings,
    /** Resolved offering: challenge or default based on challenge state */
    activeOffering,
    /** True while offerings are being fetched */
    isLoadingOfferings,
    /** Packages from the resolved active offering */
    packages,
    /** Re-fetch offerings from RevenueCat */
    fetchOfferings,
    /** Purchase a specific package */
    purchasePackage,
    presentPaywall,
    presentPaywallIfNeeded,
    presentCustomerCenter,
    restorePurchases,
    /** Whether the challenge is active (for UI context) */
    isChallengeActive,
    /** Store-level intro eligibility: "eligible" | "ineligible" | "unknown" */
    introEligibility,
    /**
     * Whether the UI should show intro pricing.
     * Combines: challenge active + UI gate (hasSeenIntroMoment) + store eligibility.
     */
    isIntroEligible,
  };
}
