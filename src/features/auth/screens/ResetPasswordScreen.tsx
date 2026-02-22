/**
 * ResetPasswordScreen
 * New password entry screen (after clicking reset link)
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

export function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const router = useRouter();
  const { isSubmitting, withSubmitLock } = useSubmitLock();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleResetPassword = async () => {
    setErrors({});

    const newErrors: {
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6)
      newErrors.password = "Password must be at least 6 characters";

    if (!confirmPassword) newErrors.confirmPassword = "Please confirm password";
    else if (password !== confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await withSubmitLock(async () => {
      const { error } = await updatePassword(password);
      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "Your password has been updated.", [
          {
            text: "OK",
            onPress: () => router.replace("/auth/sign-in" as any),
          },
        ]);
      }
    });
  };

  return (
    <Screen scrollable>
      <TSpacer size="xxl" />
      <AuthHeader title="New Password" subtitle="Enter your new password" />
      <TSpacer size="xl" />

      <GlassCard>
        <FormField
          label="New Password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          error={errors.password}
          editable={!isSubmitting}
        />
        <TSpacer size="md" />
        <FormField
          label="Confirm Password"
          placeholder="••••••••"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          error={errors.confirmPassword}
          editable={!isSubmitting}
        />
        <TSpacer size="lg" />
        <TButton
          onPress={handleResetPassword}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          Update Password
        </TButton>
      </GlassCard>
    </Screen>
  );
}
