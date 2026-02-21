/**
 * Forgot Password Screen
 * User enters their email → taps "Send Reset Link" → sees confirmation UI.
 * The email contains a deep link that opens app/auth/reset-password.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
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

type ScreenState = "form" | "sent";

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const { resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [screenState, setScreenState] = useState<ScreenState>("form");

  const handleSendResetLink = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert("Email Required", "Please enter your email address.");
      return;
    }
    if (!trimmed.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await resetPassword(trimmed);
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setScreenState("sent");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    router.back();
  };

  // ── Confirmation state ──────────────────────────────────────────────────────
  if (screenState === "sent") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ScrollView
          contentContainerStyle={styles.centeredScroll}
          showsVerticalScrollIndicator={false}
        >
          <GlassCard style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons
                name="mail-outline"
                size={48}
                color={theme.colors.primary}
              />
            </View>

            <TSpacer size="lg" />

            <TText variant="heading" style={styles.sentTitle}>
              Check Your Email
            </TText>

            <TSpacer size="sm" />

            <TText
              color="secondary"
              style={styles.sentDescription}
            >
              We sent a password reset link to{" "}
              <TText style={styles.emailHighlight}>{email.trim()}</TText>.
              Tap the link in the email to reset your password.
            </TText>

            <TSpacer size="md" />

            <TText color="secondary" style={styles.sentHint}>
              {"Didn't receive it? Check your spam folder or try again."}
            </TText>

            <TSpacer size="xl" />

            <TButton onPress={handleSendResetLink} variant="outline">
              Resend Link
            </TButton>

            <TSpacer size="sm" />

            <TButton onPress={handleBackToSignIn} variant="ghost">
              <TText color="primary">Back to Sign In</TText>
            </TButton>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Email entry form ────────────────────────────────────────────────────────
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
              Forgot Password
            </TText>
            <TSpacer size="sm" />
            <TText color="secondary" style={styles.subtitle}>
              Enter the email address associated with your account and
              {"we'll"} send you a link to reset your password.
            </TText>
          </View>

          <TSpacer size="xl" />

          <GlassCard style={styles.card}>
            <TText color="secondary" style={styles.label}>
              Email Address
            </TText>
            <TSpacer size="xs" />
            <TInput
              testID="forgot-email-input"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />

            <TSpacer size="xl" />

            <TButton
              testID="send-reset-link-button"
              onPress={handleSendResetLink}
              loading={loading}
              disabled={loading}
            >
              Send Reset Link
            </TButton>

            <TSpacer size="md" />

            <TButton onPress={handleBackToSignIn} variant="ghost">
              <TText color="primary">Back to Sign In</TText>
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
  centeredScroll: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  card: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  iconCircle: {
    alignSelf: "center",
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(120,120,128,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  sentTitle: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  sentDescription: {
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  emailHighlight: {
    fontWeight: "600",
  },
  sentHint: {
    textAlign: "center",
    fontSize: 13,
    fontStyle: "italic",
  },
});
