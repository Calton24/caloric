/**
 * Auth Screen — Standalone sign-in / sign-up screen.
 *
 * Reached from the landing page "Sign In" link.
 * Shares logic with the (tabs)/auth screen but lives outside
 * the tab navigator so unauthenticated users can access it.
 */

import { Ionicons } from "@expo/vector-icons";
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
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { AuthCapabilities } from "../../src/features/auth/authCapabilities";
import { useAuth } from "../../src/features/auth/useAuth";
import { useTheme } from "../../src/theme/useTheme";
import { GlassCard } from "../../src/ui/glass/GlassCard";
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
                stopOpacity={theme.mode === "light" ? 0.6 : 0.5}
              />
              <Stop
                offset="40%"
                stopColor={theme.colors.primary}
                stopOpacity={theme.mode === "light" ? 0.35 : 0.25}
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
            rx="60%"
            ry="400"
            fill={`url(#grad-signin-${theme.mode})`}
          />
        </Svg>
      </View>

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        {/* Back button */}
        <Animated.View entering={FadeInDown.duration(400)}>
          <Pressable
            testID="sign-in-back"
            onPress={handleBack}
            style={({ pressed }) => [
              styles.backButton,
              {
                opacity: pressed ? 0.6 : 1,
                backgroundColor: theme.colors.surface + "80",
              },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={theme.colors.text} />
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 16) + 40,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            entering={FadeInDown.duration(600).delay(100)}
            style={styles.content}
          >
            {/* Header */}
            <View style={styles.header}>
              <TText variant="heading" style={styles.title}>
                {isSignUp ? "Create Account" : "Welcome back"}
              </TText>
              <TSpacer size="sm" />
              <TText color="secondary">
                {isSignUp ? "Sign up to get started" : "Sign in to continue"}
              </TText>
            </View>

            <TSpacer size="xl" />

            {/* Sign In Form */}
            <Animated.View entering={FadeInUp.duration(500).delay(200)}>
              <GlassCard style={styles.formCard}>
                <TText color="secondary" style={styles.label}>
                  Email
                </TText>
                <TSpacer size="xs" />
                <TInput
                  testID="signin-email-input"
                  placeholder="Enter your email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TSpacer size="md" />

                <TText color="secondary" style={styles.label}>
                  Password
                </TText>
                <TSpacer size="xs" />
                <TInput
                  testID="signin-password-input"
                  placeholder="Enter your password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />

                {/* Confirm Password (Sign Up only) */}
                {isSignUp && (
                  <>
                    <TSpacer size="md" />
                    <TText color="secondary" style={styles.label}>
                      Confirm Password
                    </TText>
                    <TSpacer size="xs" />
                    <TInput
                      testID="signin-confirm-password-input"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                      autoCapitalize="none"
                    />
                  </>
                )}

                {/* Forgot Password (Sign In only) */}
                {!isSignUp && (
                  <View style={styles.forgotRow}>
                    <TButton
                      onPress={handleForgotPassword}
                      variant="ghost"
                      size="sm"
                    >
                      <TText color="primary" style={styles.forgotText}>
                        Forgot Password?
                      </TText>
                    </TButton>
                  </View>
                )}

                <TSpacer size="lg" />

                <TButton
                  testID="signin-submit-button"
                  onPress={isSignUp ? handleSignUpSubmit : handleLogin}
                  loading={loading}
                  disabled={loading}
                >
                  {isSignUp ? "Create Account" : "Sign In"}
                </TButton>

                <TSpacer size="md" />

                {/* Toggle Sign In / Sign Up */}
                <View style={styles.toggleRow}>
                  <TText color="secondary">
                    {isSignUp
                      ? "Already have an account? "
                      : "Don't have an account? "}
                  </TText>
                  <TButton
                    testID="toggle-auth-mode"
                    onPress={toggleAuthMode}
                    variant="ghost"
                  >
                    <TText color="primary" style={styles.toggleText}>
                      {isSignUp ? "Sign In" : "Sign Up"}
                    </TText>
                  </TButton>
                </View>
              </GlassCard>
            </Animated.View>

            {/* Social Login */}
            {showOAuth && (
              <Animated.View entering={FadeInUp.duration(500).delay(350)}>
                <TSpacer size="xl" />
                <GlassCard style={styles.socialCard}>
                  <TText color="secondary" style={styles.orText}>
                    Or continue with
                  </TText>
                  <TSpacer size="md" />

                  {googleEnabled && (
                    <TButton
                      onPress={handleGoogleSignIn}
                      variant="outline"
                      disabled={loading}
                    >
                      <View style={styles.socialButton}>
                        <Ionicons
                          name="logo-google"
                          size={20}
                          color={theme.colors.text}
                        />
                        <View style={{ width: 12 }} />
                        <TText>Continue with Google</TText>
                      </View>
                    </TButton>
                  )}

                  {googleEnabled && appleEnabled && <TSpacer size="sm" />}

                  {appleEnabled && (
                    <TButton
                      onPress={handleAppleSignIn}
                      variant="outline"
                      disabled={loading}
                    >
                      <View style={styles.socialButton}>
                        <Ionicons
                          name="logo-apple"
                          size={20}
                          color={theme.colors.text}
                        />
                        <View style={{ width: 12 }} />
                        <TText>Continue with Apple</TText>
                      </View>
                    </TButton>
                  )}
                </GlassCard>
              </Animated.View>
            )}
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
    height: 400,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 16,
    marginTop: 8,
  },
  content: {
    paddingTop: 100,
  },
  header: {
    alignItems: "center",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
  },
  formCard: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  forgotRow: {
    alignItems: "flex-end",
    marginTop: 4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
  },
  socialCard: {
    padding: 20,
    alignItems: "center",
  },
  orText: {
    fontSize: 14,
    fontWeight: "600",
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "700",
  },
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
