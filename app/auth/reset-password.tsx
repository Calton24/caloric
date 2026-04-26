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
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { GlassCard } from "../../src/ui/glass/GlassCard";
import { TButton } from "../../src/ui/primitives/TButton";
import { TInput } from "../../src/ui/primitives/TInput";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

type ScreenState = "verifying" | "form" | "success" | "invalid-link";

export default function ResetPasswordScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
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
      Alert.alert(t("common.error"), t("auth.enterEmailPassword"));
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert(t("common.error"), t("auth.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert(t("common.error"), t("auth.passwordsMismatch"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        Alert.alert(t("common.error"), error.message);
      } else {
        setScreenState("success");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // After successful password update the user has a session from verifyOtp,
    // so dismiss the entire modal stack and go home.
    if (router.canDismiss()) {
      router.dismissAll();
    }
    router.replace("/(tabs)");
  };

  const handleBackToSignIn = () => {
    if (router.canDismiss()) {
      router.dismissAll();
    }
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
          <TText color="secondary">{t("auth.checkYourEmail")}</TText>
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
            {t("auth.invalidEmail")}
          </TText>

          <TSpacer size="sm" />

          <TText color="secondary" style={styles.stateDescription}>
            {errorMessage}
          </TText>

          <TSpacer size="xl" />

          <TButton testID="back-to-sign-in-button" onPress={handleBackToSignIn}>
            {t("auth.backToSignIn")}
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
            {t("auth.passwordUpdated")}
          </TText>

          <TSpacer size="sm" />

          <TText color="secondary" style={styles.stateDescription}>
            {t("auth.passwordUpdatedMessage")}
          </TText>

          <TSpacer size="xl" />

          <TButton testID="continue-button" onPress={handleContinue}>
            {t("common.continue")}
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
              {t("auth.resetPasswordHeading")}
            </TText>
            <TSpacer size="sm" />
            <TText color="secondary">{t("auth.resetPasswordSubtitle")}</TText>
          </View>

          <TSpacer size="xl" />

          <GlassCard style={styles.card}>
            <TText color="secondary" style={styles.label}>
              {t("auth.newPassword")}
            </TText>
            <TSpacer size="xs" />
            <TInput
              testID="new-password-input"
              placeholder={t("auth.enterNewPasswordPlaceholder")}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TSpacer size="md" />

            <TText color="secondary" style={styles.label}>
              {t("auth.confirmNewPassword")}
            </TText>
            <TSpacer size="xs" />
            <TInput
              testID="confirm-new-password-input"
              placeholder={t("auth.confirmNewPasswordPlaceholder")}
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
              {t("auth.updatePassword")}
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
