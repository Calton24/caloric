/**
 * Compact glass-style toggle for menu rows (dark mode, Live Activities, etc.).
 * Thumb position and fill animate with a spring when `value` changes.
 */

import React, { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";

const THUMB_SIZE = 20;
const TRACK_W = 44;
const TRACK_H = 26;
const TRACK_PAD = 2;
const THUMB_TRAVEL = 18;

const SPRING = {
  damping: 17,
  stiffness: 220,
  mass: 0.35,
};

export function GlassToggleSwitch({
  value,
  onToggle,
}: {
  value: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();
  const thumbX = useSharedValue(value ? THUMB_TRAVEL : 0);

  useEffect(() => {
    thumbX.value = withSpring(value ? THUMB_TRAVEL : 0, SPRING);
  }, [value, thumbX]);

  const primary = theme.colors.primary;
  const muted = theme.colors.textMuted;

  const thumbStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: thumbX.value }],
      backgroundColor: interpolateColor(
        thumbX.value,
        [0, THUMB_TRAVEL],
        [muted, primary]
      ),
    };
  }, [primary, muted]);

  const trackStyle = {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor:
      theme.mode === "dark"
        ? "rgba(255,255,255,0.10)"
        : "rgba(255,255,255,0.55)",
    padding: TRACK_PAD,
    justifyContent: "center" as const,
  };

  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={trackStyle}
    >
      <Animated.View
        style={[
          {
            width: THUMB_SIZE,
            height: THUMB_SIZE,
            borderRadius: THUMB_SIZE / 2,
          },
          thumbStyle,
        ]}
      />
    </Pressable>
  );
}
