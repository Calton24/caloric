/**
 * GlassIconButton
 * Circular quick-action button with glass background — iOS Control Center style.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "./GlassSurface";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const SIZE_MAP = {
  sm: { container: 40, icon: 18 },
  md: { container: 52, icon: 22 },
  lg: { container: 64, icon: 28 },
} as const;

interface GlassIconButtonProps {
  icon: IconName;
  onPress: () => void;
  /** Active/toggled-on state — shows subtle ring highlight */
  active?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  accessibilityLabel: string;
  /** Pass-through to GlassSurface */
  blurEnabled?: boolean;
  reduceTransparency?: boolean;
  /** Override blur intensity */
  intensity?: number;
  tint?: "light" | "dark" | "default";
  style?: StyleProp<ViewStyle>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GlassIconButton({
  icon,
  onPress,
  active = false,
  disabled = false,
  size = "md",
  accessibilityLabel,
  blurEnabled,
  reduceTransparency,
  intensity,
  tint,
  style,
}: GlassIconButtonProps) {
  const { theme } = useTheme();
  const dims = SIZE_MAP[size];
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.9, { duration: 100 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 150 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconColor = disabled
    ? theme.colors.textMuted
    : active
      ? theme.colors.text
      : theme.colors.textSecondary;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: active }}
      style={[animatedStyle, { opacity: disabled ? 0.4 : 1 }, style]}
    >
      <GlassSurface
        variant="circle"
        border={active}
        blurEnabled={blurEnabled}
        reduceTransparency={reduceTransparency}
        intensity={intensity}
        tint={tint}
        style={[
          {
            width: dims.container,
            height: dims.container,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        {/* Active ring glow */}
        {active && (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: dims.container / 2,
                borderWidth: 2,
                borderColor: theme.colors.glassActiveRing,
                opacity: 0.5,
              },
            ]}
            pointerEvents="none"
          />
        )}
        <Ionicons name={icon} size={dims.icon} color={iconColor} />
      </GlassSurface>
    </AnimatedPressable>
  );
}
