/**
 * HelpIcon
 * Tappable circle "?" button for contextual help.
 *
 * Features:
 * - 3 sizes: sm (24), md (32), lg (40)
 * - Outline + filled variants
 * - onPress callback (open tooltip, modal, sheet, etc.)
 * - Subtle press scale animation
 * - Token-driven colors via useTheme()
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";

/* ── Types ─────────────────────────────────────────── */

export type HelpIconSize = "sm" | "md" | "lg";
export type HelpIconVariant = "outline" | "filled";

const SIZE_MAP: Record<HelpIconSize, number> = {
  sm: 24,
  md: 32,
  lg: 40,
};

const ICON_SIZE: Record<HelpIconSize, number> = {
  sm: 14,
  md: 18,
  lg: 24,
};

export interface HelpIconProps {
  /** Press handler — open help modal, tooltip, etc. */
  onPress: () => void;
  /** Size preset (default: md) */
  size?: HelpIconSize;
  /** Visual variant (default: outline) */
  variant?: HelpIconVariant;
  /** Override icon color */
  color?: string;
  /** Container style */
  style?: StyleProp<ViewStyle>;
  /** Accessibility label (default: "Help") */
  accessibilityLabel?: string;
}

/* ── Component ─────────────────────────────────────── */

export function HelpIcon({
  onPress,
  size = "md",
  variant = "outline",
  color,
  style,
  accessibilityLabel = "Help",
}: HelpIconProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const dim = SIZE_MAP[size];
  const iconSize = ICON_SIZE[size];
  const isFilled = variant === "filled";

  const iconColor =
    color ?? (isFilled ? theme.colors.textInverse : theme.colors.textSecondary);
  const bgColor = isFilled ? theme.colors.primary : "transparent";
  const borderColor = isFilled ? "transparent" : theme.colors.border;

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.88, { duration: 80 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 120 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint="Opens help information"
    >
      <Animated.View
        style={[
          styles.container,
          {
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            backgroundColor: bgColor,
            borderWidth: isFilled ? 0 : 1.5,
            borderColor,
          },
          animatedStyle,
          style,
        ]}
      >
        <Ionicons name="help" size={iconSize} color={iconColor} />
      </Animated.View>
    </Pressable>
  );
}

/* ── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});
