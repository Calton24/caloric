/**
 * GlassTabBar
 * Tab bar with glass morphism effect using GlassSurface
 */

import React from "react";
import { Platform, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../glass/GlassSurface";
import { TabItem } from "./TabItem";

export interface Tab {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface GlassTabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabPress: (key: string) => void;
}

export function GlassTabBar({ tabs, activeTab, onTabPress }: GlassTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <GlassSurface
      intensity="strong"
      style={[
        styles.container,
        {
          paddingBottom:
            Platform.OS === "ios" ? insets.bottom : theme.spacing.sm,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.border,
        },
      ]}
    >
      <Animated.View
        key={theme.mode}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.tabsContainer}
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.key}
            label={tab.label}
            icon={tab.icon}
            isActive={activeTab === tab.key}
            onPress={() => onTabPress(tab.key)}
          />
        ))}
      </Animated.View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
  },
});
