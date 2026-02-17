/**
 * Auth Screen
 * Login and authentication interface
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/useTheme";
import { GlassCard } from "../../src/ui/glass/GlassCard";
import { TButton } from "../../src/ui/primitives/TButton";
import { TInput } from "../../src/ui/primitives/TInput";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

export default function AuthScreen() {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  const handleLogin = () => {
    console.log("Login attempt:", { email, password });
    // TODO: Implement actual authentication
  };

  const handleSignUpSubmit = () => {
    console.log("Sign up attempt:", { email, password, confirmPassword });
    // TODO: Implement actual sign up
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    // Clear form fields when switching
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleForgotPassword = () => {
    console.log("Forgot password redirect");
    // TODO: Navigate to forgot password flow
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top"]}
    >
      {/* Gradient Teardrop */}
      <LinearGradient
        colors={[
          `${theme.colors.primary}40`,
          `${theme.colors.primary}20`,
          `${theme.colors.primary}00`,
        ]}
        style={styles.gradientTeardrop}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
            <TText variant="heading">{isSignUp ? "Sign Up" : "Sign In"}</TText>
            <TSpacer size="lg" />

            {/* Email Input */}
            <TText color="secondary" style={styles.label}>
              Email
            </TText>
            <TSpacer size="xs" />
            <TInput
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
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <TSpacer size="sm" />

            {/* Confirm Password (Sign Up Only) */}
            {isSignUp && (
              <>
                <TText color="secondary" style={styles.label}>
                  Confirm Password
                </TText>
                <TSpacer size="xs" />
                <TInput
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <TSpacer size="sm" />
              </>
            )}

            {/* Forgot Password Link (Sign In Only) */}
            {!isSignUp && (
              <>
                <TButton onPress={handleForgotPassword} variant="ghost">
                  <TText color="primary" style={styles.forgotText}>
                    Forgot Password?
                  </TText>
                </TButton>
                <TSpacer size="lg" />
              </>
            )}

            {isSignUp && <TSpacer size="lg" />}

            {/* Submit Button */}
            <TButton onPress={isSignUp ? handleSignUpSubmit : handleLogin}>
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
              <TButton onPress={toggleAuthMode} variant="ghost">
                <TText color="primary" style={styles.signUpText}>
                  {isSignUp ? "Sign In" : "Sign Up"}
                </TText>
              </TButton>
            </View>
          </GlassCard>

          <TSpacer size="xl" />

          {/* Social Login Options */}
          <GlassCard style={styles.socialCard}>
            <TText variant="heading" style={styles.orText}>
              Or continue with
            </TText>
            <TSpacer size="md" />

            <TButton
              onPress={() => console.log("Google login")}
              variant="outline"
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
            <TSpacer size="sm" />
            <TButton
              onPress={() => console.log("Apple login")}
              variant="outline"
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
          </GlassCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradientTeardrop: {
    position: "absolute",
    top: 0,
    left: "20%",
    right: "20%",
    height: 400,
    borderBottomLeftRadius: 200,
    borderBottomRightRadius: 200,
    zIndex: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
    zIndex: 1,
  },
  content: {
    flex: 1,
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
  forgotText: {
    fontSize: 14,
    textAlign: "right",
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
