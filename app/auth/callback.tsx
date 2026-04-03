/**
 * Auth Callback Screen
 *
 * Single entry point for all auth deep links (recovery, email confirm, etc.).
 * Supabase redirects here with a PKCE `code` param after the user clicks
 * the email link. This screen exchanges the code, then routes to the
 * appropriate destination.
 *
 * Deep link: caloric://auth/callback?code=XXX
 *
 * Recovery detection: The Supabase SDK stores "codeVerifier/PASSWORD_RECOVERY"
 * during resetPasswordForEmail and returns isRecovery from exchangeCodeForSession.
 * This means we do NOT need ?flow=recovery in the URL (which would break
 * Supabase's redirect URL allow-list matching).
 *
 * Decision logic is in callback-logic.ts so it can be unit-tested
 * without React rendering or navigation mocks.
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  resolveCallbackAction,
  resolveDestination,
} from "../../src/features/auth/callback-logic";
import { useAuth } from "../../src/features/auth/useAuth";
import { useTheme } from "../../src/theme/useTheme";
import { TButton } from "../../src/ui/primitives/TButton";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

export default function AuthCallbackScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    type?: string;
    error_code?: string;
    error_description?: string;
  }>();

  const { exchangeCodeForSession } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (__DEV__) {
        console.log("[AuthCallback] params:", JSON.stringify(params));
      }

      const decision = resolveCallbackAction(params);

      if (decision.action === "error") {
        if (!cancelled) setError(decision.message);
        return;
      }

      // Phase 1: Exchange the PKCE code
      const { error: exchangeError, isRecovery } =
        await exchangeCodeForSession(decision.code);

      if (cancelled) return;

      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }

      // Phase 2: Determine destination from the SDK's recovery detection
      const destination = resolveDestination(isRecovery === true);

      if (__DEV__) {
        console.log(
          "[AuthCallback] exchange OK, isRecovery:",
          isRecovery,
          "navigating to:",
          destination
        );
      }

      router.replace(destination);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.centered}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: "rgba(255,59,48,0.1)" },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
          </View>
          <TSpacer size="lg" />
          <TText variant="heading" style={styles.title}>
            Link Expired
          </TText>
          <TSpacer size="sm" />
          <TText color="secondary" style={styles.description}>
            {error}
          </TText>
          <TSpacer size="xl" />
          <TButton onPress={() => router.replace("/auth/sign-in")}>
            Back to Sign In
          </TButton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <TSpacer size="lg" />
        <TText color="secondary">Verifying your link...</TText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
});
