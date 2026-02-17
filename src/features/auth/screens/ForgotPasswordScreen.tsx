/**
 * ForgotPasswordScreen
 * Password reset request screen
 */

import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert } from "react-native";
import { FormField } from "../../../ui/forms/FormField";
import { useSubmitLock } from "../../../ui/forms/useSubmitLock";
import { GlassCard } from "../../../ui/glass/GlassCard";
import { Screen } from "../../../ui/layout/Screen";
import { TButton } from "../../../ui/primitives/TButton";
import { TSpacer } from "../../../ui/primitives/TSpacer";
import { AuthHeader } from "../components/AuthHeader";
import { useAuth } from "../useAuth";

export function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const { isSubmitting, withSubmitLock } = useSubmitLock();

  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ email?: string }>({});

  const handleResetPassword = async () => {
    setErrors({});

    if (!email) {
      setErrors({ email: "Email is required" });
      return;
    }

    if (!email.includes("@")) {
      setErrors({ email: "Invalid email address" });
      return;
    }

    await withSubmitLock(async () => {
      const { error } = await resetPassword(email);
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert(
          "Success",
          "Password reset email sent. Check your inbox for instructions.",
          [
            {
              text: "OK",
              onPress: () => router.back(),
            },
          ]
        );
      }
    });
  };

  return (
    <Screen scrollable>
      <TSpacer size="xxl" />
      <AuthHeader
        title="Reset Password"
        subtitle="Enter your email to receive reset instructions"
      />
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
        <TSpacer size="lg" />
        <TButton
          onPress={handleResetPassword}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          Send Reset Email
        </TButton>
        <TSpacer size="md" />
        <TButton variant="ghost" onPress={() => router.back()}>
          Back to Sign In
        </TButton>
      </GlassCard>
    </Screen>
  );
}
