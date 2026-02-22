/**
 * TabsShowcaseScreen
 * Demonstrates the custom glass tab bar component.
 * The GlassTabBar is now wired as a real tab bar via expo-router Tabs,
 * so this screen just documents its features.
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { GlassCard } from "../../ui/glass/GlassCard";
import { Screen } from "../../ui/layout/Screen";
import { TSpacer } from "../../ui/primitives/TSpacer";
import { TText } from "../../ui/primitives/TText";

export function TabsShowcaseScreen() {
  const { theme } = useTheme();

  return (
    <Screen padding={false}>
      <View style={[styles.container, { padding: theme.spacing.md }]}>
        <TSpacer size="lg" />

        <TText variant="heading" style={{ color: theme.colors.text }}>
          Glass Tab Bar
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
            How it works
          </TText>
          <TText
            color="secondary"
            style={{ fontSize: theme.typography.fontSize.base }}
          >
            On iOS 26+ the app uses Apple{"'"}s native liquid-glass tab bar.
            {"\n"}
            On iOS &lt; 26 and Android, a custom floating glassmorphism pill tab
            bar renders instead — with blur on iOS and a translucent fallback on
            Android.
          </TText>
        </GlassCard>

        <TSpacer size="md" />

        <GlassCard>
          <TText
            color="secondary"
            style={{ fontSize: theme.typography.fontSize.sm }}
          >
            Look at the bottom of the screen — you{"'"}re using the glass tab
            bar right now! Tap between tabs to see the animated pill indicator
            slide.
          </TText>
        </GlassCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
