/**
 * useAccountGate — Require account creation at strategic moments
 *
 * The app allows anonymous browsing during onboarding, but requires
 * an account before:
 *   - Saving a meal (first real data)
 *   - Using an AI scan (costs money)
 *   - Upgrading to premium (needs account for entitlement)
 *
 * Usage:
 *   const { requireAccount, gateReason, gateVisible, dismissGate } = useAccountGate();
 *
 *   async function onScanPress() {
 *     if (!requireAccount("scan")) return; // shows AuthGateModal
 *     // ... proceed with scan
 *   }
 *
 *   // In JSX:
 *   <AuthGateModal visible={gateVisible} onDismiss={dismissGate} reason={gateReason} />
 */

import { useCallback, useState } from "react";
import type { AuthGateReason } from "../../ui/components/AuthGateModal";
import { useAuth } from "./useAuth";

export type { AuthGateReason };

export function useAccountGate() {
  const { user, isLoading } = useAuth();
  const [gateVisible, setGateVisible] = useState(false);
  const [gateReason, setGateReason] = useState<AuthGateReason>("scan");

  /**
   * Check if the user is authenticated.
   * If not, shows AuthGateModal with contextual messaging.
   * Returns `true` if authenticated, `false` if gated.
   */
  const requireAccount = useCallback(
    (reason: AuthGateReason): boolean => {
      if (isLoading) return false;
      if (user) return true;

      setGateReason(reason);
      setGateVisible(true);
      return false;
    },
    [user, isLoading]
  );

  const dismissGate = useCallback(() => {
    setGateVisible(false);
  }, []);

  return {
    /** Whether user is currently authenticated */
    isAuthenticated: !!user,
    /** Whether auth state is still loading */
    isLoading,
    /** Gate an action — returns true if allowed, false if auth required */
    requireAccount,
    /** Current state for AuthGateModal */
    gateVisible,
    gateReason,
    dismissGate,
  };
}
