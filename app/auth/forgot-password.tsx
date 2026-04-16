/**
 * Forgot Password Screen
 * User enters their email → taps "Send Reset Link" → sees confirmation UI.
 * Includes client-side rate limiting (60s cooldown) to prevent abuse.
 * The email contains a deep link that opens app/auth/reset-password.
 *
 * Design: Matches sign-in screen aesthetic — flat layout, pill buttons,
 * gradient teardrop, staggered entry animations.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { useAuth } from "../../src/features/auth/useAuth";
import { analytics } from "../../src/infrastructure/analytics";
import { useTheme } from "../../src/theme/useTheme";
import { TButton } from "../../src/ui/primitives/TButton";
import { TInput } from "../../src/ui/primitives/TInput";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

// Supabase server-side rate limit is ~60s per email. We use 90s client-side
// to avoid edge-case collisions where the timer expires but the server hasn't reset.
const COOLDOWN_SECONDS = 90;

/** Map raw Supabase error messages to user-friendly text */
function friendlyError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many requests. Please wait a couple of minutes before trying again.";
  }
  if (lower.includes("not found") || lower.includes("invalid")) {
    // Supabase normally doesn't leak this, but guard anyway
    return "If that email is registered, a reset link has been sent.";
  }
  return message;
}

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
        const msg = friendlyError(error.message);
        setSendError(msg);
        // If server rate-limited, start a cooldown so user can't spam retry
        if (error.message.toLowerCase().includes("rate limit")) {
          setCooldown(COOLDOWN_SECONDS);
        }
        // Stay on form / show inline error — don't navigate to "sent"
      } else {
        analytics.track("password_reset_requested", {
          email_domain: trimmed.split("@")[1],
        });
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
        const msg = friendlyError(error.message);
        setSendError(msg);
        // If server rate-limited, enforce cooldown again
        if (error.message.toLowerCase().includes("rate limit")) {
          setCooldown(COOLDOWN_SECONDS);
        }
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

  const insets = useSafeAreaInsets();

  const handleBack = () => {
    router.back();
  };

  // ── Confirmation state ──────────────────────────────────────────────────────
  if (screenState === "sent") {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* Gradient teardrop */}
        <View style={styles.gradientTeardrop}>
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient
                id={`grad-forgot-sent-${theme.mode}`}
                cx="50%"
                cy="0%"
                r="100%"
              >
                <Stop
                  offset="0%"
                  stopColor={theme.colors.primary}
                  stopOpacity={theme.mode === "light" ? 0.45 : 0.35}
                />
                <Stop
                  offset="50%"
                  stopColor={theme.colors.primary}
                  stopOpacity={theme.mode === "light" ? 0.15 : 0.1}
                />
                <Stop
                  offset="100%"
                  stopColor={theme.colors.primary}
                  stopOpacity={0}
                />
              </RadialGradient>
            </Defs>
            <Ellipse
              cx="50%"
              cy="0"
              rx="70%"
              ry="350"
              fill={`url(#grad-forgot-sent-${theme.mode})`}
            />
          </Svg>
        </View>

        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <Animated.View entering={FadeIn.duration(300)}>
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [
                styles.backButton,
                {
                  opacity: pressed ? 0.6 : 1,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <Ionicons
                name="chevron-back"
                size={20}
                color={theme.colors.text}
              />
            </Pressable>
          </Animated.View>
        </SafeAreaView>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: Math.max(insets.bottom, 16) + 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sentContent}>
            <Animated.View
              entering={FadeInDown.duration(500).delay(100)}
              style={styles.iconCircle}
            >
              <Ionicons
                name="mail-outline"
                size={44}
                color={theme.colors.primary}
              />
            </Animated.View>

            <TSpacer size="xl" />

            <Animated.View entering={FadeInDown.duration(500).delay(200)}>
              <TText variant="heading" style={styles.sentTitle}>
                Check your email
              </TText>
              <TSpacer size="sm" />
              <TText color="secondary" style={styles.sentDescription}>
                If an account exists for{" "}
                <TText style={styles.emailHighlight}>{email.trim()}</TText>, you
                {"'"}ll receive a reset link shortly.
              </TText>
              <TSpacer size="xs" />
              <TText color="secondary" style={styles.sentHint}>
                Check your spam folder. Resend available
                {cooldown > 0 ? ` in ${cooldown}s` : " now"}.
              </TText>
            </Animated.View>

            {sendError && (
              <>
                <TSpacer size="sm" />
                <TText style={styles.errorText}>{sendError}</TText>
              </>
            )}

            <TSpacer size="xl" />

            <Animated.View entering={FadeInUp.duration(400).delay(350)}>
              <TButton
                onPress={handleResend}
                variant="outline"
                size="lg"
                loading={loading}
                disabled={loading || cooldown > 0}
              >
                {cooldown > 0 ? `Resend Link (${cooldown}s)` : "Resend Link"}
              </TButton>

              <TSpacer size="md" />

              <Pressable
                onPress={handleBack}
                style={({ pressed }) => [
                  styles.backLink,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <TText
                  style={[styles.backLinkText, { color: theme.colors.primary }]}
                >
                  Back to Sign In
                </TText>
              </Pressable>
            </Animated.View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Email entry form ────────────────────────────────────────────────────────
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Gradient teardrop */}
      <View style={styles.gradientTeardrop}>
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient
              id={`grad-forgot-${theme.mode}`}
              cx="50%"
              cy="0%"
              r="100%"
            >
              <Stop
                offset="0%"
                stopColor={theme.colors.primary}
                stopOpacity={theme.mode === "light" ? 0.45 : 0.35}
              />
              <Stop
                offset="50%"
                stopColor={theme.colors.primary}
                stopOpacity={theme.mode === "light" ? 0.15 : 0.1}
              />
              <Stop
                offset="100%"
                stopColor={theme.colors.primary}
                stopOpacity={0}
              />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx="50%"
            cy="0"
            rx="70%"
            ry="350"
            fill={`url(#grad-forgot-${theme.mode})`}
          />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <Animated.View entering={FadeIn.duration(300)}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              {
                opacity: pressed ? 0.6 : 1,
                backgroundColor: theme.colors.surface,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
          </Pressable>
        </Animated.View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: Math.max(insets.bottom, 16) + 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(80)}
            style={styles.header}
          >
            <TText variant="heading" style={styles.title}>
              Forgot{"\n"}password?
            </TText>
            <TSpacer size="xs" />
            <TText color="secondary" style={styles.subtitle}>
              No worries, enter your email and we{"'"}ll send a reset link.
            </TText>
          </Animated.View>

          <TSpacer size="xl" />

          {/* Form */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <View style={styles.fieldGroup}>
              <TText color="secondary" style={styles.label}>
                Email
              </TText>
              <View style={{ height: 6 }} />
              <TInput
                testID="forgot-email-input"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoFocus
              />
            </View>

            {sendError && (
              <>
                <TSpacer size="sm" />
                <TText style={styles.errorText}>{sendError}</TText>
              </>
            )}

            <TSpacer size="lg" />

            <TButton
              testID="send-reset-link-button"
              onPress={handleSendResetLink}
              loading={loading}
              disabled={loading || cooldown > 0}
              size="lg"
            >
              {cooldown > 0
                ? `Send Reset Link (${cooldown}s)`
                : "Send Reset Link"}
            </TButton>
          </Animated.View>

          {/* Back to sign in */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(300)}
            style={styles.toggleRow}
          >
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <TText
                style={[styles.backLinkText, { color: theme.colors.primary }]}
              >
                Back to Sign In
              </TText>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  gradientTeardrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 420,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    marginTop: 8,
  },

  // Header
  header: {
    paddingTop: 100,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },

  // Form
  fieldGroup: {},
  label: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
  },

  // Toggle / back link
  toggleRow: {
    alignItems: "center",
    marginTop: 24,
  },
  backLink: {
    alignItems: "center",
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: 15,
    fontWeight: "700",
  },

  // Sent state
  sentContent: {
    paddingTop: 140,
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(120,120,128,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  sentTitle: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
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
