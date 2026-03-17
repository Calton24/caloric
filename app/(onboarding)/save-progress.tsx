/**
 * Onboarding Step 9 — Save Your Progress (Auth Gate)
 *
 * After the user sees their personalised plan, prompt them to
 * sign in / sign up so their data is saved. Mirrors Cal AI's
 * "Save your progress" screen with Apple + Google OAuth and a
 * "Skip" option for users who want to sign in later.
 *
 * On success or skip → continues to paywall.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
    Alert,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthCapabilities } from "../../src/features/auth/authCapabilities";
import { useAuth } from "../../src/features/auth/useAuth";
import { useTheme } from "../../src/theme/useTheme";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingProgress } from "./_progress";

const TOTAL_STEPS = 11;
const CURRENT_STEP = 9;

export default function SaveProgressScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { signIn, signUp, signInWithOAuth } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const navigateNext = () => {
    router.push("/(onboarding)/paywall" as any);
  };

  const handleAppleSignIn = async () => {
    if (!AuthCapabilities.apple) {
      Alert.alert(
        "Coming Soon",
        "Sign in with Apple will be available in a future update."
      );
      return;
    }
    setLoading(true);
    try {
      const { url, error } = await signInWithOAuth("apple");
      if (error) {
        Alert.alert("Error", error.message);
        return;
      }
      if (url) {
        await WebBrowser.openAuthSessionAsync(url);
      }
      navigateNext();
    } finally {
      setLoading(false);
    }
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
        await WebBrowser.openAuthSessionAsync(url);
      }
      navigateNext();
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        Alert.alert("Error", "Passwords do not match");
        return;
      }
      if (password.length < 6) {
        Alert.alert("Error", "Password must be at least 6 characters");
        return;
      }
    }

    setLoading(true);
    try {
      const { error } = isSignUp
        ? await signUp(email, password)
        : await signIn(email, password);
      if (error) {
        Alert.alert(
          isSignUp ? "Sign Up Failed" : "Sign In Failed",
          error.message
        );
      } else {
        navigateNext();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigateNext();
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* ── Header: Back + Progress ── */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.headerRow}>
          <Pressable
            testID="save-progress-back"
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
          <View style={styles.progressContainer}>
            <OnboardingProgress
              step={CURRENT_STEP}
              total={TOTAL_STEPS}
              theme={theme}
            />
          </View>
        </Animated.View>

        {/* ── Heading ── */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(100)}
          style={styles.headingArea}
        >
          <TText
            variant="heading"
            style={[styles.heading, { color: theme.colors.text }]}
          >
            Save your progress
          </TText>
        </Animated.View>

        {/* ── Spacer pushes buttons to center-ish ── */}
        <View style={styles.spacer} />

        {/* ── Auth buttons ── */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(300)}
          style={styles.buttonsArea}
        >
          {/* Sign in with Apple */}
          <Pressable
            testID="save-progress-apple"
            onPress={handleAppleSignIn}
            disabled={loading}
            style={({ pressed }) => ({
              opacity: pressed || loading ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <View
              style={[
                styles.oauthButton,
                {
                  backgroundColor: theme.colors.text,
                },
              ]}
            >
              <Ionicons
                name="logo-apple"
                size={24}
                color={theme.colors.background}
              />
              <TText
                style={[styles.oauthLabel, { color: theme.colors.background }]}
              >
                Sign in with Apple
              </TText>
            </View>
          </Pressable>

          <TSpacer size="md" />

          {/* Sign in with Google */}
          <Pressable
            testID="save-progress-google"
            onPress={handleGoogleSignIn}
            disabled={loading}
            style={({ pressed }) => ({
              opacity: pressed || loading ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <View
              style={[
                styles.oauthButton,
                {
                  backgroundColor: "transparent",
                  borderWidth: 1.5,
                  borderColor: theme.colors.text,
                },
              ]}
            >
              <Ionicons
                name="logo-google"
                size={22}
                color={theme.colors.text}
              />
              <TText style={[styles.oauthLabel, { color: theme.colors.text }]}>
                Sign in with Google
              </TText>
            </View>
          </Pressable>

          <TSpacer size="md" />

          {/* Email sign in / sign up toggle */}
          {!showEmailForm && (
            <Pressable
              testID="save-progress-email"
              onPress={() => setShowEmailForm(true)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <View
                style={[
                  styles.oauthButton,
                  {
                    backgroundColor: "transparent",
                    borderWidth: 1.5,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={22}
                  color={theme.colors.text}
                />
                <TText
                  style={[styles.oauthLabel, { color: theme.colors.text }]}
                >
                  Continue with Email
                </TText>
              </View>
            </Pressable>
          )}

          {/* Inline email form */}
          {showEmailForm && (
            <EmailForm
              theme={theme}
              isSignUp={isSignUp}
              email={email}
              password={password}
              confirmPassword={confirmPassword}
              setEmail={setEmail}
              setPassword={setPassword}
              setConfirmPassword={setConfirmPassword}
              loading={loading}
              onSubmit={handleEmailAuth}
              onToggleMode={() => {
                setIsSignUp(!isSignUp);
                setPassword("");
                setConfirmPassword("");
              }}
            />
          )}

          <TSpacer size="xl" />

          {/* Skip */}
          <Pressable
            testID="save-progress-skip"
            onPress={handleSkip}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <View style={styles.skipRow}>
              <TText
                style={[
                  styles.skipLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {"Would you like to sign in later?  "}
              </TText>
              <TText style={[styles.skipLink, { color: theme.colors.text }]}>
                Skip
              </TText>
            </View>
          </Pressable>
        </Animated.View>

        {/* ── Bottom spacer ── */}
        <View style={styles.bottomSpacer} />
      </SafeAreaView>
    </View>
  );
}

// ─── Inline Email Form ──────────────────────────────────────────────────────

function EmailForm({
  theme,
  isSignUp,
  email,
  password,
  confirmPassword,
  setEmail,
  setPassword,
  setConfirmPassword,
  loading,
  onSubmit,
  onToggleMode,
}: {
  theme: any;
  isSignUp: boolean;
  email: string;
  password: string;
  confirmPassword: string;
  setEmail: (v: string) => void;
  setPassword: (v: string) => void;
  setConfirmPassword: (v: string) => void;
  loading: boolean;
  onSubmit: () => void;
  onToggleMode: () => void;
}) {
  const inputStyle = [
    styles.emailInput,
    {
      color: theme.colors.text,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
  ];

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.emailForm}>
      <TextInput
        testID="save-progress-email-input"
        placeholder="Email"
        placeholderTextColor={theme.colors.textMuted}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        style={inputStyle}
      />
      <TextInput
        testID="save-progress-password-input"
        placeholder="Password"
        placeholderTextColor={theme.colors.textMuted}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        style={inputStyle}
      />
      {isSignUp && (
        <TextInput
          testID="save-progress-confirm-password-input"
          placeholder="Confirm Password"
          placeholderTextColor={theme.colors.textMuted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoCapitalize="none"
          style={inputStyle}
        />
      )}

      <Pressable
        testID="save-progress-email-submit"
        onPress={onSubmit}
        disabled={loading}
        style={({ pressed }) => ({
          opacity: pressed || loading ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        })}
      >
        <View
          style={[
            styles.oauthButton,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <TText
            style={[styles.oauthLabel, { color: theme.colors.textInverse }]}
          >
            {isSignUp ? "Create Account" : "Sign In"}
          </TText>
        </View>
      </Pressable>

      <Pressable onPress={onToggleMode} style={{ marginTop: 8 }}>
        <TText color="secondary" style={styles.toggleText}>
          {isSignUp
            ? "Already have an account? Sign In"
            : "Need an account? Sign Up"}
        </TText>
      </Pressable>
    </Animated.View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 8 : 4,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  progressContainer: {
    flex: 1,
  },
  headingArea: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 40,
  },
  spacer: {
    flex: 1,
  },
  buttonsArea: {
    paddingHorizontal: 24,
  },
  oauthButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 32,
    gap: 14,
  },
  oauthLabel: {
    fontSize: 17,
    fontWeight: "600",
  },
  skipRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  skipLabel: {
    fontSize: 15,
  },
  skipLink: {
    fontSize: 15,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  bottomSpacer: {
    flex: 0.6,
  },
  emailForm: {
    gap: 12,
  },
  emailInput: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  toggleText: {
    fontSize: 14,
    textAlign: "center",
  },
});
