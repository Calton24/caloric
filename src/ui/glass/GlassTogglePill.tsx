/**
 * GlassTogglePill
 * Large pill control — toggle, menu, or mixed mode (iOS Focus style).
 * Animated active state transitions for premium feel.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect } from "react";
import {
    Pressable,
    StyleProp,
    StyleSheet,
    ViewStyle
} from "react-native";
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";
import { GlassSurface } from "./GlassSurface";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

interface GlassTogglePillProps {
  leadingIcon?: IconName;
  label: string;
  /** "toggle" = tap toggles value, "menu" = tap opens menu, "mixed" = tap body toggles, chevron opens menu */
  mode: "toggle" | "menu" | "mixed";
  value?: boolean;
  onToggle?: () => void;
  onPressMenu?: () => void;
  trailing?: "chevron" | "none";
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Pass-through to GlassSurface */
  blurEnabled?: boolean;
  reduceTransparency?: boolean;
  intensity?: number;
  tint?: "light" | "dark" | "default";
  style?: StyleProp<ViewStyle>;
}

const AnimatedView = Animated.View;
const TOGGLE_TIMING = { duration: 250 };

export function GlassTogglePill({
  leadingIcon,
  label,
  mode,
  value = false,
  onToggle,
  onPressMenu,
  trailing = mode === "menu" || mode === "mixed" ? "chevron" : "none",
  disabled = false,
  accessibilityLabel,
  blurEnabled,
  reduceTransparency,
  intensity,
  tint,
  style,
}: GlassTogglePillProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const activeProgress = useSharedValue(value ? 1 : 0);

  // Animate active state in/out
  useEffect(() => {
    activeProgress.value = withTiming(value ? 1 : 0, TOGGLE_TIMING);
  }, [value, activeProgress]);

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.96, { duration: 80 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 120 });
  }, [scale]);

  const animatedScale = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Background tint fades in when active
  const tintAnimStyle = useAnimatedStyle(() => ({
    opacity: activeProgress.value * 0.25,
  }));

  // Leading icon circle color animates
  const iconCircleStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      activeProgress.value,
      [0, 1],
      [theme.colors.surfaceSecondary, theme.colors.glassActiveRing]
    ),
  }));

  const handleBodyPress = useCallback(() => {
    if (mode === "toggle" || mode === "mixed") {
      onToggle?.();
    } else {
      onPressMenu?.();
    }
  }, [mode, onToggle, onPressMenu]);

  const iconColor = value
    ? theme.colors.textInverse
    : theme.colors.textSecondary;
  const labelColor = value ? "primary" : "secondary";

  return (
    <AnimatedView
      style={[animatedScale, { opacity: disabled ? 0.4 : 1 }, style]}
    >
      <GlassSurface
        variant="pill"
        border={value}
        blurEnabled={blurEnabled}
        reduceTransparency={reduceTransparency}
        intensity={intensity}
        tint={tint}
        style={styles.pill}
      >
        {/* Animated active background tint */}
        <AnimatedView
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: theme.colors.glassTintLight,
              borderRadius: theme.radius.full,
            },
            tintAnimStyle,
          ]}
          pointerEvents="none"
        />

        <Pressable
          onPress={handleBodyPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled}
          accessibilityRole={mode === "toggle" ? "switch" : "button"}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={
            mode === "toggle" || mode === "mixed"
              ? { checked: value, disabled }
              : { disabled }
          }
          style={styles.bodyPressable}
        >
          {leadingIcon && (
            <AnimatedView style={[styles.leadingIconWrap, iconCircleStyle]}>
              <Ionicons name={leadingIcon} size={18} color={iconColor} />
            </AnimatedView>
          )}
          <TText color={labelColor} style={styles.label} numberOfLines={1}>
            {label}
          </TText>
        </Pressable>

        {/* Chevron for menu zone */}
        {trailing === "chevron" && (
          <Pressable
            onPress={onPressMenu}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`${label} options`}
            hitSlop={8}
            style={styles.chevronZone}
          >
            <Ionicons
              name="chevron-expand-outline"
              size={16}
              color={theme.colors.textMuted}
            />
          </Pressable>
        )}
      </GlassSurface>
    </AnimatedView>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bodyPressable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  leadingIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  chevronZone: {
    paddingLeft: 8,
    paddingVertical: 4,
  },
});
