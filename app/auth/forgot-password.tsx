/**
 * Forgot Password Screen
 * User enters their email → taps "Send Reset Link" → sees confirmation UI.
 * Includes client-side rate limiting (60s cooldown) to prevent abuse.
 * The email contains a deep link that opens app/auth/reset-password.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
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

const COOLDOWN_SECONDS = 60;

type ScreenState = "form" | "sent";

export default function ForgotPasswordScreen() {
  const { theme } = useTheme();
  const { resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [screenState, setScreenState] = useState<ScreenState>("form");
  const [cooldown, setCooldown] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown timer
  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
      return;
    }
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, [cooldown > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendResetLink = useCallback(async () => {
    if (cooldown > 0) return; // rate limited

    const trimmed = email.trim();
    if (!trimmed) {
      Alert.alert("Email Required", "Please enter your email address.");
      return;
    }
    if (!trimmed.includes("@")) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    setSendError(null);
    setLoading(true);
    try {
      const { error } = await resetPassword(trimmed);
      if (error) {
        setSendError(error.message);
        // Stay on form / show inline error — don't navigate to "sent"
      } else {
        setSendError(null);
        setCooldown(COOLDOWN_SECONDS);
        setScreenState("sent");
      }
    } catch {
      setSendError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [cooldown, email, resetPassword]);

  const handleResend = useCallback(async () => {
    if (cooldown > 0) return;

    setSendError(null);
    setLoading(true);
    try {
      const { error } = await resetPassword(email.trim());
      if (error) {
        setSendError(error.message);
      } else {
        setSendError(null);
        setCooldown(COOLDOWN_SECONDS);
      }
    } catch {
      setSendError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [cooldown, email, resetPassword]);

  const handleBackToSignIn = () => {
    router.back();
  };

  // ── Drag handle (replaces modal header) ─────────────────────────────────────
  const DragHandle = () => (
    <View style={styles.dragHandleContainer}>
      <View
        style={[
          styles.dragHandle,
          { backgroundColor: theme.colors.border ?? "rgba(120,120,128,0.3)" },
        ]}
      />
    </View>
  );

  // ── Confirmation state ──────────────────────────────────────────────────────
  if (screenState === "sent") {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={["top"]}
      >
        <DragHandle />
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

            <TText color="secondary" style={styles.sentDescription}>
              We sent a password reset link to{" "}
              <TText style={styles.emailHighlight}>{email.trim()}</TText>. Tap
              the link in the email to reset your password.
            </TText>

            <TSpacer size="md" />

            <TText color="secondary" style={styles.sentHint}>
              {"Didn't receive it? Check your spam folder or try again."}
            </TText>

            {/* Inline error for resend failures */}
            {sendError && (
              <>
                <TSpacer size="sm" />
                <TText style={styles.errorText}>{sendError}</TText>
              </>
            )}

            <TSpacer size="xl" />

            <TButton
              onPress={handleResend}
              variant="outline"
              loading={loading}
              disabled={loading || cooldown > 0}
            >
              {cooldown > 0
                ? `Resend Link (${cooldown}s)`
                : "Resend Link"}
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
      edges={["top"]}
    >
      <DragHandle />
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
              Enter the email address associated with your account and{" "}
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

            {/* Inline error */}
            {sendError && (
              <>
                <TSpacer size="sm" />
                <TText style={styles.errorText}>{sendError}</TText>
              </>
            )}

            <TSpacer size="xl" />

            <TButton
              testID="send-reset-link-button"
              onPress={handleSendResetLink}
              loading={loading}
              disabled={loading || cooldown > 0}
            >
              {cooldown > 0
                ? `Send Reset Link (${cooldown}s)`
                : "Send Reset Link"}
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
  dragHandleContainer: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  centeredScroll: {
    paddingHorizontal: 20,
    paddingTop: 40,
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
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    textAlign: "center",
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
