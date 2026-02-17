/**
 * SignInScreen
 * User sign in screen
 */

import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert } from "react-native";
import { useTheme } from "../../../theme/useTheme";
import { FormField } from "../../../ui/forms/FormField";
import { useSubmitLock } from "../../../ui/forms/useSubmitLock";
import { GlassCard } from "../../../ui/glass/GlassCard";
import { Screen } from "../../../ui/layout/Screen";
import { TButton } from "../../../ui/primitives/TButton";
import { TSpacer } from "../../../ui/primitives/TSpacer";
import { TText } from "../../../ui/primitives/TText";
import { AuthDebugPanel } from "../components/AuthDebugPanel";
import { AuthHeader } from "../components/AuthHeader";
import { useAuth } from "../useAuth";

export function SignInScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const { isSubmitting, withSubmitLock } = useSubmitLock();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>(
    {}
  );

  const handleSignIn = async () => {
    setErrors({});

    // Basic validation
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = "Email is required";
    if (!password) newErrors.password = "Password is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await withSubmitLock(async () => {
      const { error } = await signIn(email, password);
      if (error) {
        Alert.alert("Sign In Failed", error.message);
      }
    });
  };

  return (
    <Screen scrollable>
      <TSpacer size="xxl" />
      <AuthHeader title="Welcome Back" subtitle="Sign in to your account" />
      <TSpacer size="xl" />

      <GlassCard>
        <FormField
          label="Email"
          placeholder="email@example.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          error={errors.email}
          editable={!isSubmitting}
        />
        <TSpacer size="md" />
        <FormField
          label="Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={errors.password}
          editable={!isSubmitting}
        />
        <TSpacer size="lg" />
        <TButton
          onPress={handleSignIn}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          Sign In
        </TButton>
        <TSpacer size="md" />
        <TButton
          variant="ghost"
          onPress={() => router.push("/auth/forgot-password" as any)}
        >
          Forgot Password?
        </TButton>
      </GlassCard>

      <TSpacer size="md" />

      <TText
        style={{
          textAlign: "center",
          color: theme.colors.textSecondary,
          fontSize: theme.typography.fontSize.sm,
        }}
      >
        Don&apos;t have an account?{" "}
        <TText
          onPress={() => router.push("/auth/sign-up" as any)}
          style={{
            color: theme.colors.primary,
            fontWeight: theme.typography.fontWeight.semibold,
          }}
        >
          Sign Up
        </TText>
      </TText>

      <AuthDebugPanel />
    </Screen>
  );
}
