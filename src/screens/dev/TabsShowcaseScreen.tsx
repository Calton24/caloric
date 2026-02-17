/**
 * TabsShowcaseScreen
 * Demonstrates glass tab bar component
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Screen } from '../../ui/layout/Screen';
import { GlassCard } from '../../ui/glass/GlassCard';
import { GlassTabBar, Tab } from '../../ui/tabs/GlassTabBar';
import { TText } from '../../ui/primitives/TText';
import { TSpacer } from '../../ui/primitives/TSpacer';
import { useTheme } from '../../theme/useTheme';

const DEMO_TABS: Tab[] = [
  { key: 'home', label: 'Home', icon: <TText>🏠</TText> },
  { key: 'search', label: 'Search', icon: <TText>🔍</TText> },
  { key: 'profile', label: 'Profile', icon: <TText>👤</TText> },
  { key: 'settings', label: 'Settings', icon: <TText>⚙️</TText> },
];

export function TabsShowcaseScreen() {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('home');

  const getTabContent = () => {
    switch (activeTab) {
      case 'home':
        return 'Home tab content. This is where your main feed or dashboard would go.';
      case 'search':
        return 'Search tab content. Add search functionality and results here.';
      case 'profile':
        return 'Profile tab content. Show user profile and settings.';
      case 'settings':
        return 'Settings tab content. App configuration and preferences.';
      default:
        return 'Unknown tab';
    }
  };

  return (
    <Screen padding={false}>
      <View style={styles.container}>
        <View
          style={[
            styles.content,
            { padding: theme.spacing.md },
          ]}
        >
          <TSpacer size="lg" />
          
          <TText
            variant="heading"
            style={{ color: theme.colors.text }}
          >
            Tab Bar Showcase
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
              Active Tab: {activeTab}
            </TText>
            <TText
              color="secondary"
              style={{ fontSize: theme.typography.fontSize.base }}
            >
              {getTabContent()}
            </TText>
          </GlassCard>

          <TSpacer size="md" />

          <GlassCard>
            <TText
              color="secondary"
              style={{ fontSize: theme.typography.fontSize.sm }}
            >
              The glass tab bar below uses blur effects on iOS and a translucent
              fallback on Android. It stays pinned to the bottom with safe area
              insets.
            </TText>
          </GlassCard>
        </View>

        {/* Glass Tab Bar */}
        <GlassTabBar
          tabs={DEMO_TABS}
          activeTab={activeTab}
          onTabPress={setActiveTab}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
