/**
 * Onboarding Step 9 — Save Your Progress (Auth Gate)
 *
 * After the user sees their personalised plan, prompt them to
 * sign in / sign up so their data is saved.
 *
 * Psychological conversion tactics:
 * - Social proof counter ("X users joined this week")
 * - Loss aversion ("Don't lose your personalized plan")
 * - Trust signal (privacy note)
 * - Speed framing ("Takes 5 seconds")
 *
 * On success → continues to paywall.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Pressable, StyleSheet, TextInput, View } from "react-native";
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
import { OnboardingHeader } from "./_progress";

export default function SaveProgressScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { signIn, signUp, signInWithAppleNative, signInWithGoogleNative } =
    useAuth();

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
      const { error } = await signInWithAppleNative();
      if (error) {
        if (error.message !== "User cancelled") {
          Alert.alert("Error", error.message);
        }
        return;
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
      const { error } = await signInWithGoogleNative();
      if (error) {
        if (error.message !== "User cancelled") {
          Alert.alert("Error", error.message);
        }
        return;
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

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* ── Header: Back + Progress ── */}
        <OnboardingHeader step={6} total={6} theme={theme} />

        {/* ── Heading ── */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(100)}
          style={styles.headingArea}
        >
          <TText
            variant="heading"
            style={[styles.heading, { color: theme.colors.text }]}
          >
            Don't lose your{"\n"}personalized plan
          </TText>
          <TSpacer size="sm" />
          <TText color="secondary" style={styles.subheading}>
            Create an account to keep your calorie targets, macros, and progress
            synced across devices.
          </TText>
        </Animated.View>

        {/* ── Social proof + trust signals ── */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(250)}
          style={styles.proofArea}
        >
          <View
            style={[
              styles.proofPill,
              { backgroundColor: theme.colors.primary + "12" },
            ]}
          >
            <Ionicons name="people" size={16} color={theme.colors.primary} />
            <TText style={[styles.proofText, { color: theme.colors.primary }]}>
              2,400+ users signed up this week
            </TText>
          </View>
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Ionicons
                name="lock-closed"
                size={14}
                color={theme.colors.textMuted}
              />
              <TText
                style={[styles.trustText, { color: theme.colors.textMuted }]}
              >
                Your data stays private
              </TText>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustItem}>
              <Ionicons name="flash" size={14} color={theme.colors.textMuted} />
              <TText
                style={[styles.trustText, { color: theme.colors.textMuted }]}
              >
                Takes 5 seconds
              </TText>
            </View>
          </View>
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

  headingArea: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 40,
  },
  subheading: {
    fontSize: 16,
    lineHeight: 22,
  },
  proofArea: {
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  proofPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
  },
  proofText: {
    fontSize: 14,
    fontWeight: "600",
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trustText: {
    fontSize: 13,
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#999",
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
