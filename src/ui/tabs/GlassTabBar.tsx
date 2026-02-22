/**
 * GlassTabBar
 * Floating pill-style glassmorphism tab bar.
 *
 * Designed as a drop-in `tabBar` for @react-navigation/bottom-tabs (expo-router Tabs).
 * Renders a frosted blur surface with a sliding pill indicator behind the active tab.
 * Works on iOS (BlurView) and Android (solid translucent fallback).
 */

import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import React, { useCallback } from "react";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../glass/GlassSurface";

/** Map route names → Ionicons glyphs (filled / outline). */
const ICON_MAP: Record<string, { filled: string; outline: string }> = {
  index: { filled: "home", outline: "home-outline" },
  notes: { filled: "document-text", outline: "document-text-outline" },
  auth: { filled: "person-circle", outline: "person-circle-outline" },
  playground: { filled: "sparkles", outline: "sparkles-outline" },
  "mobile-core": { filled: "hammer", outline: "hammer-outline" },
};

const SPRING = { damping: 20, stiffness: 200, mass: 0.8 };
const TAB_HEIGHT = 56;

export function GlassTabBar({
  state,
  descriptors,
  navigation,
}: BottomTabBarProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabCount = state.routes.length;

  // Measure container for animated pill offset
  const containerWidth = useSharedValue(0);
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      containerWidth.value = e.nativeEvent.layout.width;
    },
    [containerWidth]
  );

  const handlePress = useCallback(
    (routeKey: string, routeName: string, isFocused: boolean) => {
      const event = navigation.emit({
        type: "tabPress",
        target: routeKey,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate(routeName);
      }
    },
    [navigation]
  );

  const handleLongPress = useCallback(
    (routeKey: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      navigation.emit({ type: "tabLongPress", target: routeKey });
    },
    [navigation]
  );

  // Animated pill: slides smoothly on tab change
  const pillStyle = useAnimatedStyle(() => {
    const tabWidth = containerWidth.value / (tabCount || 1);
    return {
      width: tabWidth,
      transform: [{ translateX: withSpring(state.index * tabWidth, SPRING) }],
    };
  });

  return (
    <GlassSurface
      intensity="strong"
      style={[
        styles.wrapper,
        {
          marginBottom: Math.max(insets.bottom, 8),
          borderColor: theme.colors.glassBorder,
        },
      ]}
    >
      {/* Active pill background */}
      <Animated.View style={[styles.pill, pillStyle]}>
        <View
          style={[
            styles.pillInner,
            {
              backgroundColor:
                theme.mode === "light"
                  ? "rgba(0,0,0,0.08)"
                  : "rgba(255,255,255,0.12)",
              borderRadius: theme.radius.xl,
            },
          ]}
        />
      </Animated.View>

      {/* Tab items */}
      <Animated.View
        key={theme.mode}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={styles.row}
        onLayout={onLayout}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === "string"
              ? options.tabBarLabel
              : (options.title ?? route.name);
          const isFocused = state.index === index;
          const icons = ICON_MAP[route.name] ?? {
            filled: "ellipse",
            outline: "ellipse-outline",
          };

          return (
            <Pressable
              key={route.key}
              testID={`tab-${route.name}`}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={() => handlePress(route.key, route.name, isFocused)}
              onLongPress={() => handleLongPress(route.key)}
              style={styles.tab}
            >
              <Ionicons
                name={(isFocused ? icons.filled : icons.outline) as any}
                size={22}
                color={
                  isFocused ? theme.colors.primary : theme.colors.textSecondary
                }
              />
              <Animated.Text
                style={[
                  styles.label,
                  {
                    color: isFocused
                      ? theme.colors.primary
                      : theme.colors.textSecondary,
                    fontWeight: isFocused ? "600" : "400",
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Animated.Text>
            </Pressable>
          );
        })}
      </Animated.View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    height: TAB_HEIGHT,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
  },
  row: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: TAB_HEIGHT,
    gap: 2,
  },
  label: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    position: "absolute",
    top: 6,
    bottom: 6,
    justifyContent: "center",
    alignItems: "stretch",
  },
  pillInner: {
    flex: 1,
    marginHorizontal: 6,
  },
});
