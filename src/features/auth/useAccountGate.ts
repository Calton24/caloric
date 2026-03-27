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
 *   const { requireAccount } = useAccountGate();
 *
 *   async function onScanPress() {
 *     if (!requireAccount("scan")) return; // shows auth prompt if needed
 *     // ... proceed with scan
 *   }
 */

import { router } from "expo-router";
import { useCallback } from "react";
import { Alert } from "react-native";
import { useAuth } from "./useAuth";

type GateReason = "meal_save" | "scan" | "upgrade" | "export";

const GATE_MESSAGES: Record<GateReason, { title: string; message: string }> = {
  meal_save: {
    title: "Create an Account",
    message: "Sign up to save your meals and track your progress.",
  },
  scan: {
    title: "Account Required",
    message: "Create a free account to use AI food scanning.",
  },
  upgrade: {
    title: "Sign In to Upgrade",
    message: "Create an account to manage your subscription.",
  },
  export: {
    title: "Account Required",
    message: "Sign up to export your nutrition data.",
  },
};

export function useAccountGate() {
  const { user, isLoading } = useAuth();

  /**
   * Check if the user is authenticated.
   * If not, shows a contextual prompt and navigates to sign-up.
   * Returns `true` if authenticated, `false` if gated.
   */
  const requireAccount = useCallback(
    (reason: GateReason): boolean => {
      if (isLoading) return false;
      if (user) return true;

      const { title, message } = GATE_MESSAGES[reason];
      Alert.alert(title, message, [
        { text: "Not Now", style: "cancel" },
        {
          text: "Sign Up",
          onPress: () => router.push("/auth/sign-in"),
        },
      ]);
      return false;
    },
    [user, isLoading]
  );

  return {
    /** Whether user is currently authenticated */
    isAuthenticated: !!user,
    /** Whether auth state is still loading */
    isLoading,
    /** Gate an action — returns true if allowed, false if auth required */
    requireAccount,
  };
}
