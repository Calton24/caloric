/**
 * DevMenuScreen
 * Main dev menu with links to all demo screens
 */

import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";
import { useAuth } from "../../features/auth/useAuth";
import { useTheme } from "../../theme/useTheme";
import { GlassCard } from "../../ui/glass/GlassCard";
import { Screen } from "../../ui/layout/Screen";
import { TSpacer } from "../../ui/primitives/TSpacer";
import { TText } from "../../ui/primitives/TText";

interface MenuItem {
  title: string;
  subtitle: string;
  path: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    title: "Theme Demo",
    subtitle: "Test theme system and color modes",
    path: "/dev/theme",
  },
  {
    title: "Tabs Showcase",
    subtitle: "Glass tab bar examples",
    path: "/dev/tabs",
  },
  {
    title: "Bottom Sheet Demo",
    subtitle: "Sheet interactions and animations",
    path: "/dev/sheets",
  },
  {
    title: "Sign In",
    subtitle: "Authentication sign in",
    path: "/auth/sign-in",
  },
  {
    title: "Sign Up",
    subtitle: "User registration",
    path: "/auth/sign-up",
  },
  {
    title: "Forgot Password",
    subtitle: "Password reset flow",
    path: "/auth/forgot-password",
  },
  {
    title: "Signed In Home",
    subtitle: "Authenticated home screen",
    path: "/auth/home",
  },
];

export function DevMenuScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();

  return (
    <Screen padding={false}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={{
          padding: theme.spacing.md,
        }}
      >
        <TSpacer size="lg" />

        <TText
          variant="heading"
          style={{
            color: theme.colors.text,
            marginBottom: theme.spacing.sm,
          }}
        >
          Dev Menu
        </TText>

        <TText
          color="secondary"
          style={{
            fontSize: theme.typography.fontSize.base,
            marginBottom: theme.spacing.xl,
          }}
        >
          Caloric UI Components
        </TText>

        {user && (
          <>
            <GlassCard padding="md">
              <TText
                color="secondary"
                style={{ fontSize: theme.typography.fontSize.sm }}
              >
                Signed in as: {user.email}
              </TText>
            </GlassCard>
            <TSpacer size="md" />
          </>
        )}

        {MENU_ITEMS.map((item, index) => (
          <React.Fragment key={item.path}>
            <Pressable
              onPress={() => router.push(item.path as any)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <GlassCard padding="md">
                <TText
                  variant="subheading"
                  style={{
                    color: theme.colors.text,
                    marginBottom: theme.spacing.xs,
                  }}
                >
                  {item.title}
                </TText>
                <TText
                  color="secondary"
                  style={{
                    fontSize: theme.typography.fontSize.sm,
                  }}
                >
                  {item.subtitle}
                </TText>
              </GlassCard>
            </Pressable>
            {index < MENU_ITEMS.length - 1 && <TSpacer size="sm" />}
          </React.Fragment>
        ))}

        <TSpacer size="xxl" />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
});
