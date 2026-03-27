/**
 * useRevenueCat
 *
 * Convenience hook for consuming RevenueCat billing state and actions.
 * Reads subscription status from Zustand (synced in real-time by BillingGate)
 * and exposes helpers to present the paywall, Customer Center, and restore.
 *
 * Usage:
 *   const { isPro, presentPaywall, presentCustomerCenter, restorePurchases } = useRevenueCat();
 */

import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { getBillingProvider } from "../../lib/billing";
import { useSubscriptionStore } from "./subscription.store";

export function useRevenueCat() {
  const subscription = useSubscriptionStore((s) => s.subscription);
  const [isRestoring, setIsRestoring] = useState(false);
  const [offerings, setOfferings] = useState<any>(null);
  const [isLoadingOfferings, setIsLoadingOfferings] = useState(false);

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

  /**
   * Present the full RevenueCat paywall (always shown regardless of
   * current subscription status).
   */
  const presentPaywall = useCallback(async () => {
    try {
      await getBillingProvider().presentPaywall();
    } catch {
      Alert.alert("Error", "Could not open the paywall. Please try again.");
    }
  }, []);

  /**
   * Present the paywall only if the user does not have the "Caloric Premium" entitlement.
   * Silently does nothing when the user is already a subscriber.
   */
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

  /**
   * Present the RevenueCat Customer Center so the user can manage their
   * subscription, request a refund, or contact support.
   */
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

  // ── Derived state ────────────────────────────────────────────────────────

  return {
    /** True when the user has an active paid subscription */
    isPro: subscription.hasActiveSubscription,
    /** Current plan: "monthly" | "annual" | null */
    plan: subscription.plan,
    /** True while a restore is in progress */
    isRestoring,
    /** Current offerings from RevenueCat (auto-fetched on mount) */
    offerings,
    /** True while offerings are being fetched */
    isLoadingOfferings,
    /** Convenience: current offering's available packages */
    packages: offerings?.current?.availablePackages ?? [],
    /** Re-fetch offerings from RevenueCat */
    fetchOfferings,
    /** Purchase a specific package */
    purchasePackage,
    presentPaywall,
    presentPaywallIfNeeded,
    presentCustomerCenter,
    restorePurchases,
  };
}
