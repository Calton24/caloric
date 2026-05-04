/* eslint-disable react/no-unescaped-entities */
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
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { AuthCapabilities } from "../../src/features/auth/authCapabilities";
import { useAuth } from "../../src/features/auth/useAuth";
import { useAppTranslation } from "../../src/infrastructure/i18n";
import { useTheme } from "../../src/theme/useTheme";
import { GlassCard } from "../../src/ui/glass/GlassCard";
import { TButton } from "../../src/ui/primitives/TButton";
import { TInput } from "../../src/ui/primitives/TInput";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

export default function AuthScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const {
    signIn,
    signUp,
    user,
    signOut,
    signInWithAppleNative,
    signInWithGoogleNative,
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
      Alert.alert(t("common.error"), t("auth.enterEmailPassword"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        Alert.alert(t("auth.signInFailed"), error.message);
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
      Alert.alert(t("common.error"), t("auth.enterEmailPassword"));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t("common.error"), t("auth.passwordsMismatch"));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t("common.error"), t("auth.passwordTooShort"));
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(email, password);
      if (error) {
        Alert.alert(t("auth.signUpFailed"), error.message);
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
      Alert.alert(t("auth.unavailable"), t("auth.googleUnavailable"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await signInWithGoogleNative();
      if (error) {
        if (error.message !== "User cancelled") {
          Alert.alert(t("common.error"), error.message);
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
      Alert.alert(t("auth.unavailable"), t("auth.appleUnavailable"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await signInWithAppleNative();
      if (error) {
        if (error.message !== "User cancelled") {
          Alert.alert(t("common.error"), error.message);
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
          <TText variant="heading">{t("auth.signedIn")}</TText>
          <TSpacer size="md" />
          <TText color="secondary">{user.email}</TText>
          <TSpacer size="xl" />
          <TButton
            testID="sign-out-button"
            onPress={handleSignOut}
            loading={loading}
            disabled={loading}
          >
            {t("auth.signOut")}
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
            {t("auth.accountCreated")}
          </TText>

          <TSpacer size="md" />

          <TText color="secondary" style={styles.successMessage}>
            {t("auth.verificationSent", { email })}
          </TText>

          <TSpacer size="xl" />

          <View style={styles.successActions}>
            <TButton testID="go-to-sign-in-button" onPress={handleGoToSignIn}>
              {t("auth.goToSignIn")}
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
                {isSignUp ? t("auth.createAccount") : t("auth.welcome")}
              </TText>
              <TSpacer size="sm" />
              <TText color="secondary">
                {isSignUp
                  ? t("auth.signUpToGetStarted")
                  : t("auth.signInToContinue")}
              </TText>
            </View>

            <TSpacer size="xl" />

            {/* Auth Form */}
            <GlassCard style={styles.formCard}>
              <TText variant="heading">
                {isSignUp ? t("auth.signUp") : t("auth.signIn")}
              </TText>
              <TSpacer size="lg" />

              {/* Email Input */}
              <TText color="secondary" style={styles.label}>
                {t("auth.email")}
              </TText>
              <TSpacer size="xs" />
              <TInput
                testID="email-input"
                placeholder={t("auth.enterEmailPlaceholder")}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TSpacer size="md" />

              {/* Password Input */}
              <TText color="secondary" style={styles.label}>
                {t("auth.password")}
              </TText>
              <TSpacer size="xs" />
              <TInput
                testID="password-input"
                placeholder={t("auth.enterPasswordPlaceholder")}
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
                    {t("auth.confirmPassword")}
                  </TText>
                  <TSpacer size="xs" />
                  <TInput
                    testID="confirm-password-input"
                    placeholder={t("auth.confirmPasswordPlaceholder")}
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
                      {t("auth.forgotPassword")}
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
                {isSignUp ? t("auth.createAccount") : t("auth.signIn")}
              </TButton>

              <TSpacer size="md" />

              {/* Toggle Auth Mode Link */}
              <View style={styles.signUpContainer}>
                <TText color="secondary">
                  {isSignUp
                    ? t("auth.alreadyHaveAccountShort")
                    : t("auth.dontHaveAccount")}{" "}
                </TText>
                <TButton
                  testID="toggle-auth-mode"
                  onPress={toggleAuthMode}
                  variant="ghost"
                >
                  <TText color="primary" style={styles.signUpText}>
                    {isSignUp ? t("auth.signIn") : t("auth.signUp")}
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
                    {t("auth.orContinueWith")}
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
                        <TText>{t("auth.continueWithGoogle")}</TText>
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
                        <TText>{t("auth.continueWithApple")}</TText>
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
