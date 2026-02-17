/**
 * SignedInHomeScreen
 * Home screen shown after successful authentication
 */

import React from 'react';
import { Screen } from '../../../ui/layout/Screen';
import { GlassCard } from '../../../ui/glass/GlassCard';
import { TText } from '../../../ui/primitives/TText';
import { TButton } from '../../../ui/primitives/TButton';
import { TSpacer } from '../../../ui/primitives/TSpacer';
import { useAuth } from '../useAuth';
import { useTheme } from '../../../theme/useTheme';

export function SignedInHomeScreen() {
  const { user, signOut } = useAuth();
  const { theme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <Screen>
      <TSpacer size="xxl" />
      
      <TText
        variant="heading"
        style={{
          textAlign: 'center',
          color: theme.colors.text,
        }}
      >
        Welcome!
      </TText>

      <TSpacer size="xl" />

      <GlassCard>
        <TText
          variant="subheading"
          style={{
            color: theme.colors.text,
            marginBottom: theme.spacing.sm,
          }}
        >
          You're signed in
        </TText>

        <TText
          color="secondary"
          style={{
            fontSize: theme.typography.fontSize.base,
          }}
        >
          Email: {user?.email}
        </TText>

        <TSpacer size="lg" />

        <TButton onPress={handleSignOut} variant="outline">
          Sign Out
        </TButton>
      </GlassCard>

      <TSpacer size="lg" />

      <GlassCard>
        <TText
          color="secondary"
          style={{
            fontSize: theme.typography.fontSize.sm,
            textAlign: 'center',
          }}
        >
          This is a demo authenticated screen. In a real app, you would show
          your main app content here.
        </TText>
      </GlassCard>
    </Screen>
  );
}
