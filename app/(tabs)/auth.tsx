/* eslint-disable react/no-unescaped-entities */
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { getAppConfig } from "../../src/config";
import { AuthCapabilities } from "../../src/features/auth/authCapabilities";
import { useAuth } from "../../src/features/auth/useAuth";
import { useTheme } from "../../src/theme/useTheme";
import { GlassCard } from "../../src/ui/glass/GlassCard";
import { TButton } from "../../src/ui/primitives/TButton";
import { TInput } from "../../src/ui/primitives/TInput";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

export default function AuthScreen() {
  const { theme } = useTheme();
  const {
    signIn,
    signUp,
    user,
    signOut,
    signInWithOAuth,
    exchangeCodeForSession,
    signInWithAppleNative,
  } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Auth capability flags
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
        // Route through index so auth + onboarding state is evaluated once.
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
      const { url, error } = await signInWithOAuth("google");
      if (error) {
        Alert.alert("Error", error.message);
        return;
      }
      if (url) {
        const scheme = getAppConfig().app.scheme;
        const redirectUrl = `${scheme}://auth/callback`;
        const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);
        if (result.type === "success" && result.url) {
          const params = new URL(result.url).searchParams;
          const code = params.get("code");
          if (code) {
            const { error: exchangeError } = await exchangeCodeForSession(code);
            if (exchangeError) {
              Alert.alert("Error", exchangeError.message);
            }
          }
        }
      }
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

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
    } finally {
      setLoading(false);
    }
  };

  // If user is signed in, show signed in state
  if (user) {
    return (
      <SafeAreaView
        testID="auth-screen"
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={["top"]}
      >
        <View style={styles.signedInContainer}>
          <TText variant="heading">Signed In</TText>
          <TSpacer size="md" />
          <TText color="secondary">{user.email}</TText>
          <TSpacer size="xl" />
          <TButton
            testID="sign-out-button"
            onPress={handleSignOut}
            loading={loading}
            disabled={loading}
          >
            Sign Out
          </TButton>
        </View>
      </SafeAreaView>
    );
  }

  // Sign-up success screen
  if (signUpSuccess) {
    return (
      <SafeAreaView
        testID="auth-screen"
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={["top"]}
      >
        {/* Gradient Hue Teardrop */}
        <View style={styles.gradientTeardrop}>
          <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient
                id={`grad-success-${theme.mode}`}
                cx="50%"
                cy="0%"
                r="100%"
              >
                <Stop
                  offset="0%"
                  stopColor={theme.colors.success}
                  stopOpacity={theme.mode === "light" ? 0.5 : 0.4}
                />
                <Stop
                  offset="40%"
                  stopColor={theme.colors.success}
                  stopOpacity={theme.mode === "light" ? 0.25 : 0.15}
                />
                <Stop
                  offset="100%"
                  stopColor={theme.colors.success}
                  stopOpacity={0}
                />
              </RadialGradient>
            </Defs>
            <Ellipse
              cx="50%"
              cy="0"
              rx="60%"
              ry="400"
              fill={`url(#grad-success-${theme.mode})`}
            />
          </Svg>
        </View>

        <View style={styles.successContainer}>
          <View
            style={[
              styles.successIcon,
              { backgroundColor: theme.colors.success + "18" },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={72}
              color={theme.colors.success}
            />
          </View>

          <TSpacer size="xl" />

          <TText variant="heading" style={styles.successTitle}>
            Account Created!
          </TText>

          <TSpacer size="md" />

          <TText color="secondary" style={styles.successMessage}>
            We've sent a verification link to{"\n"}
            <TText style={{ fontWeight: "600" }}>{email}</TText>
            {"\n\n"}Check your inbox and verify your email, then sign in below.
          </TText>

          <TSpacer size="xl" />

          <View style={styles.successActions}>
            <TButton testID="go-to-sign-in-button" onPress={handleGoToSignIn}>
              Go to Sign In
            </TButton>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      testID="auth-screen"
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top"]}
    >
      {/* Gradient Hue Teardrop */}
      <View style={styles.gradientTeardrop}>
        <Svg height="100%" width="100%" style={StyleSheet.absoluteFill}>
          <Defs>
            <RadialGradient id={`grad-${theme.mode}`} cx="50%" cy="0%" r="100%">
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
            fill={`url(#grad-${theme.mode})`}
          />
        </Svg>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: Math.max(insets.bottom, 16) + 100,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <TText variant="heading" style={styles.title}>
                {isSignUp ? "Create Account" : "Welcome"}
              </TText>
              <TSpacer size="sm" />
              <TText color="secondary">
                {isSignUp ? "Sign up to get started" : "Sign in to continue"}
              </TText>
            </View>

            <TSpacer size="xl" />

            {/* Auth Form */}
            <GlassCard style={styles.formCard}>
              <TText variant="heading">
                {isSignUp ? "Sign Up" : "Sign In"}
              </TText>
              <TSpacer size="lg" />

              {/* Email Input */}
              <TText color="secondary" style={styles.label}>
                Email
              </TText>
              <TSpacer size="xs" />
              <TInput
                testID="email-input"
                placeholder="Enter your email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TSpacer size="md" />

              {/* Password Input */}
              <TText color="secondary" style={styles.label}>
                Password
              </TText>
              <TSpacer size="xs" />
              <TInput
                testID="password-input"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
              />

              <TSpacer size="xs" />

              {/* Confirm Password (Sign Up Only) */}
              {isSignUp && (
                <>
                  <TText color="secondary" style={styles.label}>
                    Confirm Password
                  </TText>
                  <TSpacer size="xs" />
                  <TInput
                    testID="confirm-password-input"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </>
              )}

              {/* Forgot Password Link (Sign In Only) — tight to field */}
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

              {/* Submit Button */}
              <TButton
                testID="submit-button"
                onPress={isSignUp ? handleSignUpSubmit : handleLogin}
                loading={loading}
                disabled={loading}
              >
                {isSignUp ? "Create Account" : "Sign In"}
              </TButton>

              <TSpacer size="md" />

              {/* Toggle Auth Mode Link */}
              <View style={styles.signUpContainer}>
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
                  <TText color="primary" style={styles.signUpText}>
                    {isSignUp ? "Sign In" : "Sign Up"}
                  </TText>
                </TButton>
              </View>
            </GlassCard>

            {/* Social Login Options — only when OAuth providers are enabled */}
            {showOAuth && (
              <>
                <TSpacer size="xl" />

                <GlassCard style={styles.socialCard}>
                  <TText variant="heading" style={styles.orText}>
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
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  signedInContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  successContainer: {
    flex: 1,
    justifyContent: "center",
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
    fontWeight: "bold",
    textAlign: "center",
  },
  successMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  successActions: {
    width: "100%",
    paddingHorizontal: 16,
  },
  gradientTeardrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    zIndex: 0,
  },
  content: {
    paddingTop: 40,
  },
  header: {
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
  },
  formCard: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
  },
  flex: {
    flex: 1,
  },
  forgotRow: {
    alignItems: "flex-end",
    marginTop: 4,
  },
  forgotText: {
    fontSize: 14,
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signUpText: {
    fontSize: 14,
    fontWeight: "600",
  },
  socialCard: {
    padding: 24,
  },
  orText: {
    textAlign: "center",
    fontSize: 16,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
