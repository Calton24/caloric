/**
 * SignUpScreen
 * User registration screen
 */

import React, { useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '../../../ui/layout/Screen';
import { GlassCard } from '../../../ui/glass/GlassCard';
import { TButton } from '../../../ui/primitives/TButton';
import { TSpacer } from '../../../ui/primitives/TSpacer';
import { TText } from '../../../ui/primitives/TText';
import { FormField } from '../../../ui/forms/FormField';
import { useSubmitLock } from '../../../ui/forms/useSubmitLock';
import { AuthHeader } from '../components/AuthHeader';
import { AuthDebugPanel } from '../components/AuthDebugPanel';
import { useAuth } from '../useAuth';
import { useTheme } from '../../../theme/useTheme';

export function SignUpScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const { isSubmitting, withSubmitLock } = useSubmitLock();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleSignUp = async () => {
    setErrors({});

    // Validation
    const newErrors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!email) newErrors.email = 'Email is required';
    else if (!email.includes('@')) newErrors.email = 'Invalid email address';

    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6)
      newErrors.password = 'Password must be at least 6 characters';

    if (!confirmPassword) newErrors.confirmPassword = 'Please confirm password';
    else if (password !== confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await withSubmitLock(async () => {
      const { error } = await signUp(email, password);
      if (error) {
        Alert.alert('Sign Up Failed', error.message);
      }
    });
  };

  return (
    <Screen scrollable>
      <TSpacer size="xxl" />
      <AuthHeader
        title="Create Account"
        subtitle="Sign up to get started"
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
          onPress={handleSignUp}
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          Sign Up
        </TButton>
      </GlassCard>

      <TSpacer size="md" />

      <TText
        style={{
          textAlign: 'center',
          color: theme.colors.textSecondary,
          fontSize: theme.typography.fontSize.sm,
        }}
      >
        Already have an account?{' '}
        <TText
          onPress={() => router.push('/auth/sign-in' as any)}
          style={{
            color: theme.colors.primary,
            fontWeight: theme.typography.fontWeight.semibold,
          }}
        >
          Sign In
        </TText>
      </TText>

      <AuthDebugPanel />
    </Screen>
  );
}
