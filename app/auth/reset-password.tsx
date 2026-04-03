/**
 * Reset Password Screen
 *
 * Owns the full recovery flow: parses token_hash and type from the deep link,
 * verifies the token via verifyRecoveryToken, then gates the password form
 * on successful verification.
 */

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/features/auth/useAuth";
import { useTheme } from "../../src/theme/useTheme";
import { GlassCard } from "../../src/ui/glass/GlassCard";
import { TButton } from "../../src/ui/primitives/TButton";
import { TInput } from "../../src/ui/primitives/TInput";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

type ScreenState = "verifying" | "form" | "success" | "invalid-link";

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const { updatePassword, verifyRecoveryToken } = useAuth();
  const router = useRouter();
  const { token_hash, type } = useLocalSearchParams<{
    token_hash?: string;
    type?: string;
  }>();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [screenState, setScreenState] = useState<ScreenState>("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  // Verify the recovery token on mount
  useEffect(() => {
    if (!token_hash || type !== "recovery") {
      setErrorMessage("Invalid or missing reset link.");
      setScreenState("invalid-link");
      return;
    }

    let cancelled = false;
    (async () => {
      const { error } = await verifyRecoveryToken(token_hash);
      if (cancelled) return;
      if (error) {
        setErrorMessage(error.message);
        setScreenState("invalid-link");
      } else {
        setScreenState("form");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token_hash, type, verifyRecoveryToken]);

  const handleUpdatePassword = async () => {
    if (!newPassword) {
      Alert.alert("Error", "Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setScreenState("success");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    router.replace("/auth/sign-in");
  };

  // ── Verifying: checking token ───────────────────────────────────────────────
  if (screenState === "verifying") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <TSpacer size="lg" />
          <TText color="secondary">Verifying reset link…</TText>
        </View>
      </SafeAreaView>
    );
  }

  // ── Invalid link: bad/missing/expired token ─────────────────────────────────
  if (screenState === "invalid-link") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.centered}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: "rgba(255,59,48,0.12)" },
            ]}
          >
            <Ionicons name="close-circle-outline" size={48} color="#FF3B30" />
          </View>

          <TSpacer size="lg" />

          <TText variant="heading" style={styles.stateTitle}>
            Invalid Link
          </TText>

          <TSpacer size="sm" />

          <TText color="secondary" style={styles.stateDescription}>
            {errorMessage ||
              "This reset link is invalid or has expired. Please request a new one."}
          </TText>

          <TSpacer size="xl" />

          <TButton testID="back-to-sign-in-button" onPress={handleBackToSignIn}>
            Back to Sign In
          </TButton>
        </View>
      </SafeAreaView>
    );
  }

  // ── Success: password updated ───────────────────────────────────────────────
  if (screenState === "success") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.centered}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: "rgba(52,199,89,0.12)" },
            ]}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={48}
              color="#34C759"
            />
          </View>

          <TSpacer size="lg" />

          <TText variant="heading" style={styles.stateTitle}>
            Password Updated
          </TText>

          <TSpacer size="sm" />

          <TText color="secondary" style={styles.stateDescription}>
            Your password has been successfully changed. You can now sign in
            with your new password.
          </TText>

          <TSpacer size="xl" />

          <TButton testID="back-to-sign-in-button" onPress={handleBackToSignIn}>
            Back to Sign In
          </TButton>
        </View>
      </SafeAreaView>
    );
  }

  // ── Form: enter new password ────────────────────────────────────────────────
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <TText variant="heading" style={styles.title}>
              Reset Password
            </TText>
            <TSpacer size="sm" />
            <TText color="secondary">
              Choose a new password for your account
            </TText>
          </View>

          <TSpacer size="xl" />

          <GlassCard style={styles.card}>
            <TText color="secondary" style={styles.label}>
              New Password
            </TText>
            <TSpacer size="xs" />
            <TInput
              testID="new-password-input"
              placeholder="Enter new password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TSpacer size="md" />

            <TText color="secondary" style={styles.label}>
              Confirm New Password
            </TText>
            <TSpacer size="xs" />
            <TInput
              testID="confirm-new-password-input"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TSpacer size="xl" />

            <TButton
              testID="reset-password-button"
              onPress={handleUpdatePassword}
              loading={loading}
              disabled={loading}
            >
              Update Password
            </TButton>
          </GlassCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  card: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  stateTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  stateDescription: {
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
});
