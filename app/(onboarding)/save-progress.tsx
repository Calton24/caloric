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
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingBackground } from "./_background";
import { OnboardingHeader } from "./_progress";

export default function SaveProgressScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
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
      Alert.alert(t("auth.comingSoon"), t("auth.appleComingSoon"));
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
      Alert.alert(t("auth.unavailable"), t("auth.googleUnavailable"));
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
      Alert.alert(t("common.error"), t("auth.enterEmailPassword"));
      return;
    }

    if (isSignUp) {
      if (password !== confirmPassword) {
        Alert.alert(t("common.error"), t("auth.passwordsMismatch"));
        return;
      }
      if (password.length < 6) {
        Alert.alert(t("common.error"), t("auth.passwordTooShort"));
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
          isSignUp ? t("auth.signUpFailed") : t("auth.signInFailed"),
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
    <OnboardingBackground>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* ── Header: Back + Progress ── */}
        <OnboardingHeader step={7} total={7} theme={theme} />

        {/* ── Heading ── */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(100)}
          style={styles.headingArea}
        >
          <TText
            variant="heading"
            style={[styles.heading, { color: theme.colors.text }]}
          >
            {t("onboarding.saveProgress.heading")}
          </TText>
          <TSpacer size="sm" />
          <TText color="secondary" style={styles.subheading}>
            {t("onboarding.saveProgress.subtitle")}
          </TText>
        </Animated.View>

        {/* ── Social proof + trust signals ── */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(250)}
          style={styles.proofArea}
        >
          <GlassSurface
            intensity="light"
            variant="pill"
            style={[styles.proofPill]}
          >
            <Ionicons name="people" size={16} color={theme.colors.primary} />
            <TText style={[styles.proofText, { color: theme.colors.primary }]}>
              {t("onboarding.saveProgress.socialProof")}
            </TText>
          </GlassSurface>
          <GlassSurface
            intensity="light"
            variant="pill"
            style={styles.trustBadge}
          >
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
                  {t("onboarding.saveProgress.privacy")}
                </TText>
              </View>
              <View style={styles.trustDot} />
              <View style={styles.trustItem}>
                <Ionicons
                  name="flash"
                  size={14}
                  color={theme.colors.textMuted}
                />
                <TText
                  style={[styles.trustText, { color: theme.colors.textMuted }]}
                >
                  {t("onboarding.saveProgress.speed")}
                </TText>
              </View>
            </View>
          </GlassSurface>
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
                {t("auth.signInWithApple")}
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
                {t("auth.signInWithGoogle")}
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
                  {t("auth.continueWithEmail")}
                </TText>
              </View>
            </Pressable>
          )}

          {/* Inline email form */}
          {showEmailForm && (
            <EmailForm
              theme={theme}
              t={t}
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
    </OnboardingBackground>
  );
}

// ─── Inline Email Form ──────────────────────────────────────────────────────

function EmailForm({
  theme,
  t,
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
  t: (key: string) => string;
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
        placeholder={t("auth.email")}
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
        placeholder={t("auth.password")}
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
          placeholder={t("auth.confirmPassword")}
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
            {isSignUp ? t("auth.createAccount") : t("auth.signIn")}
          </TText>
        </View>
      </Pressable>

      <Pressable onPress={onToggleMode} style={{ marginTop: 8 }}>
        <TText color="secondary" style={styles.toggleText}>
          {isSignUp ? t("auth.alreadyHaveAccount") : t("auth.needAccount")}
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
  },
  proofText: {
    fontSize: 14,
    fontWeight: "600",
  },
  trustBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
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
