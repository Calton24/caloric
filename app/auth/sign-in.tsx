/**
 * Auth Screen — Standalone sign-in / sign-up screen.
 *
 * Reached from the landing page "Sign In" link.
 * Shares logic with the (tabs)/auth screen but lives outside
 * the tab navigator so unauthenticated users can access it.
 *
 * Design: Social-first layout with clean flat styling, pill buttons,
 * refined typography, and staggered entry animations.
 */

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
    Layout,
} from "react-native-reanimated";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { AuthCapabilities } from "../../src/features/auth/authCapabilities";
import { useAuth } from "../../src/features/auth/useAuth";
import { useTheme } from "../../src/theme/useTheme";
import { CalCutLogo } from "../../src/ui/brand/CalCutLogo";
import { TButton } from "../../src/ui/primitives/TButton";
import { TInput } from "../../src/ui/primitives/TInput";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

export default function SignInScreen() {
  const { theme } = useTheme();
  const { signIn, signUp, signInWithAppleNative, signInWithGoogleNative } =
    useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const googleEnabled = AuthCapabilities.google;
  const appleEnabled = AuthCapabilities.apple;
  const showOAuth = googleEnabled || appleEnabled;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        Alert.alert("Sign In Failed", error.message);
      } else {
        // Let index.tsx evaluate auth + onboarding state so routing is
        // always correct regardless of local store hydration timing.
        router.replace("/");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(email, password);
      if (error) {
        Alert.alert("Sign Up Failed", error.message);
      } else {
        setSignUpSuccess(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setSignUpSuccess(false);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleGoToSignIn = () => {
    setSignUpSuccess(false);
    setIsSignUp(false);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleForgotPassword = () => {
    router.push("/auth/forgot-password");
  };

  const handleGoogleSignIn = async () => {
    if (!AuthCapabilities.google) {
      Alert.alert("Unavailable", "Google sign-in is disabled for this app.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signInWithGoogleNative();
      if (error) {
        if (error.message !== "User cancelled") {
          Alert.alert("Error", error.message);
        }
        return;
      }
      router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (!AuthCapabilities.apple) {
      Alert.alert("Unavailable", "Apple sign-in is disabled for this app.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signInWithAppleNative();
      if (error) {
        if (error.message !== "User cancelled") {
          Alert.alert("Error", error.message);
        }
        return;
      }
      router.replace("/");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Gradient hue teardrop */}
      <View style={styles.gradientTeardrop}>
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient
              id={`grad-signin-${theme.mode}`}
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
            fill={`url(#grad-signin-${theme.mode})`}
          />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Back button */}
        <Animated.View entering={FadeIn.duration(300)}>
          <Pressable
            testID="sign-in-back"
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

      {/* Sign-up success screen */}
      {signUpSuccess && (
        <View
          style={[
            styles.successOverlay,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <SafeAreaView style={styles.successSafe} edges={["top", "bottom"]}>
            <View style={styles.successContent}>
              <View
                style={[
                  styles.successIcon,
                  {
                    backgroundColor: (theme.colors as any).success
                      ? (theme.colors as any).success + "18"
                      : theme.colors.primary + "18",
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={72}
                  color={(theme.colors as any).success || theme.colors.primary}
                />
              </View>
              <TSpacer size="xl" />
              <TText variant="heading" style={styles.successTitle}>
                Account Created!
              </TText>
              <TSpacer size="md" />
              <TText color="secondary" style={styles.successMessage}>
                {"We've sent a verification link to\n"}
                <TText style={{ fontWeight: "600" }}>{email}</TText>
                {"\n\nCheck your inbox and verify your email, then sign in."}
              </TText>
              <TSpacer size="xl" />
              <TButton testID="go-to-sign-in-button" onPress={handleGoToSignIn}>
                Go to Sign In
              </TButton>
            </View>
          </SafeAreaView>
        </View>
      )}

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
          {/* ── Header ── */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(80)}
            style={styles.header}
          >
            {Platform.OS === "ios" ? (
              <BlurView
                intensity={40}
                tint={theme.mode === "dark" ? "dark" : "light"}
                style={styles.brandPill}
              >
                <View style={styles.brandInner}>
                  <CalCutLogo size={19} color={theme.colors.primary} />
                  <TText
                    style={[styles.brandWordmark, { color: theme.colors.text }]}
                  >
                    CalCut
                  </TText>
                </View>
              </BlurView>
            ) : (
              <View
                style={[
                  styles.brandPill,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <View style={styles.brandInner}>
                  <CalCutLogo size={19} color={theme.colors.primary} />
                  <TText
                    style={[styles.brandWordmark, { color: theme.colors.text }]}
                  >
                    CalCut
                  </TText>
                </View>
              </View>
            )}
            <TSpacer size="lg" />
            <TText variant="heading" style={styles.title}>
              {isSignUp ? "Create your\naccount" : "Welcome\nback"}
            </TText>
            <TSpacer size="xs" />
            <TText color="secondary" style={styles.subtitle}>
              {isSignUp
                ? "Start your 21-day journey"
                : "Pick up where you left off"}
            </TText>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Social Auth (show first — higher conversion) ── */}
          {showOAuth && (
            <Animated.View entering={FadeInDown.duration(500).delay(180)}>
              {appleEnabled && (
                <Pressable
                  onPress={handleAppleSignIn}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.socialBtn,
                    {
                      backgroundColor: theme.mode === "light" ? "#000" : "#fff",
                      opacity: pressed ? 0.85 : loading ? 0.5 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="logo-apple"
                    size={19}
                    color={theme.mode === "light" ? "#fff" : "#000"}
                  />
                  <TText
                    style={[
                      styles.socialBtnText,
                      {
                        color: theme.mode === "light" ? "#fff" : "#000",
                      },
                    ]}
                  >
                    Continue with Apple
                  </TText>
                </Pressable>
              )}

              {appleEnabled && googleEnabled && <View style={{ height: 12 }} />}

              {googleEnabled && (
                <Pressable
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.socialBtn,
                    {
                      backgroundColor: theme.colors.surface,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      opacity: pressed ? 0.85 : loading ? 0.5 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name="logo-google"
                    size={18}
                    color={theme.colors.text}
                  />
                  <TText
                    style={[styles.socialBtnText, { color: theme.colors.text }]}
                  >
                    Continue with Google
                  </TText>
                </Pressable>
              )}

              {/* ── Divider ── */}
              <View style={styles.dividerRow}>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <TText color="secondary" style={styles.dividerText}>
                  or
                </TText>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
              </View>
            </Animated.View>
          )}

          {/* ── Email / Password Form ── */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(showOAuth ? 300 : 180)}
            layout={Layout.springify().damping(18)}
          >
            <View style={styles.fieldGroup}>
              <TText color="secondary" style={styles.label}>
                Email
              </TText>
              <View style={{ height: 6 }} />
              <TInput
                testID="signin-email-input"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={{ height: 16 }} />

            <View style={styles.fieldGroup}>
              <TText color="secondary" style={styles.label}>
                Password
              </TText>
              <View style={{ height: 6 }} />
              <TInput
                testID="signin-password-input"
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            {/* Confirm Password (Sign Up only) */}
            {isSignUp && (
              <Animated.View entering={FadeInDown.duration(300)}>
                <View style={{ height: 16 }} />
                <View style={styles.fieldGroup}>
                  <TText color="secondary" style={styles.label}>
                    Confirm Password
                  </TText>
                  <View style={{ height: 6 }} />
                  <TInput
                    testID="signin-confirm-password-input"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </Animated.View>
            )}

            {/* Forgot Password (Sign In only) */}
            {!isSignUp && (
              <Pressable
                onPress={handleForgotPassword}
                style={({ pressed }) => [
                  styles.forgotRow,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <TText
                  style={[styles.forgotText, { color: theme.colors.primary }]}
                >
                  Forgot password?
                </TText>
              </Pressable>
            )}

            <TSpacer size="lg" />

            <TButton
              testID="signin-submit-button"
              onPress={isSignUp ? handleSignUpSubmit : handleLogin}
              loading={loading}
              disabled={loading}
              size="lg"
            >
              {isSignUp ? "Create Account" : "Sign In"}
            </TButton>
          </Animated.View>

          {/* ── Toggle Sign In / Sign Up ── */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(showOAuth ? 400 : 280)}
            style={styles.toggleRow}
          >
            <TText color="secondary" style={styles.toggleLabel}>
              {isSignUp ? "Already have an account?" : "Don't have an account?"}
            </TText>
            <Pressable
              testID="toggle-auth-mode"
              onPress={toggleAuthMode}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <TText
                style={[styles.toggleLink, { color: theme.colors.primary }]}
              >
                {isSignUp ? "Sign In" : "Sign Up"}
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
  flex: { flex: 1 },
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
    alignItems: "center",
  },
  brandPill: {
    borderRadius: 20,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
  },
  brandInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  brandWordmark: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.15,
  },
  title: {
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 40,
    letterSpacing: -0.5,
    alignSelf: "flex-start",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
    alignSelf: "flex-start",
  },

  // Social buttons
  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 52,
    borderRadius: 9999,
    gap: 10,
  },
  socialBtnText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.1,
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "500",
    paddingHorizontal: 16,
  },

  // Form
  fieldGroup: {},
  label: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  forgotRow: {
    alignSelf: "flex-end",
    marginTop: 10,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Toggle
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    gap: 6,
  },
  toggleLabel: {
    fontSize: 15,
  },
  toggleLink: {
    fontSize: 15,
    fontWeight: "700",
  },

  // Success overlay
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  successSafe: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  successContent: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  successMessage: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
});
