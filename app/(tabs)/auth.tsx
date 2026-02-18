import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";
import { useAuth } from "../../src/features/auth/useAuth";
import { useTheme } from "../../src/theme/useTheme";
import { GlassCard } from "../../src/ui/glass/GlassCard";
import { TButton } from "../../src/ui/primitives/TButton";
import { TInput } from "../../src/ui/primitives/TInput";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

export default function AuthScreen() {
  const { theme } = useTheme();
  const { signIn, signUp, user, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

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
        Alert.alert(
          "Success",
          "Account created! Check your email to verify your account."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Forgot Password",
      "Password reset would be sent to your email"
    );
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
        style={[styles.container, { backgroundColor: theme.colors.background }]}
        edges={["top"]}
      >
        <View style={styles.signedInContainer}>
          <TText variant="heading">Signed In</TText>
          <TSpacer size="md" />
          <TText color="secondary">{user.email}</TText>
          <TSpacer size="xl" />
          <TButton onPress={handleSignOut} loading={loading} disabled={loading}>
            Sign Out
          </TButton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
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
            <TButton
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
  signedInContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  gradientTeardrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    zIndex: 0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 120,
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
