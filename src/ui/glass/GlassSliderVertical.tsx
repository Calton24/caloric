/**
 * GlassSliderVertical
 * Vertical slider (brightness/volume style) with glass background.
 * Animated fill track using Reanimated, optional haptics (feature-flagged).
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { haptics } from "../../infrastructure/haptics";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "./GlassSurface";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

const TRACK_HEIGHT = 160;
const TRACK_WIDTH = 52;

interface GlassSliderVerticalProps {
  /** Current value 0..1 */
  value: number;
  onChange: (value: number) => void;
  icon?: IconName;
  /** Snap step (e.g., 0.1 for 10 steps). If omitted, continuous. */
  step?: number;
  /** Enable haptic feedback on step changes (requires expo-haptics) */
  haptics?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Pass-through to GlassSurface */
  blurEnabled?: boolean;
  reduceTransparency?: boolean;
  intensity?: number;
  tint?: "light" | "dark" | "default";
  style?: StyleProp<ViewStyle>;
}

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(v, min), max);
}

function snap(v: number, step: number | undefined) {
  "worklet";
  if (!step || step <= 0) return v;
  return Math.round(v / step) * step;
}

export function GlassSliderVertical({
  value,
  onChange,
  icon,
  step,
  haptics: hapticsEnabled = true,
  disabled = false,
  accessibilityLabel = "Slider",
  blurEnabled,
  reduceTransparency,
  intensity,
  tint,
  style,
}: GlassSliderVerticalProps) {
  const { theme } = useTheme();
  const fillHeight = useSharedValue(value * TRACK_HEIGHT);
  const startFill = useSharedValue(value * TRACK_HEIGHT);

  const lastSnapped = useSharedValue(value);

  const fireHaptic = useCallback(() => {
    if (hapticsEnabled) haptics.selection();
  }, [hapticsEnabled]);

  const emitChange = useCallback(
    (v: number) => {
      onChange(v);
    },
    [onChange]
  );

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => {
      startFill.value = fillHeight.value;
    })
    .onUpdate((e) => {
      // Dragging UP = increase, dragging DOWN = decrease
      const raw = clamp(
        (startFill.value - e.translationY) / TRACK_HEIGHT,
        0,
        1
      );
      const snapped = snap(raw, step);
      fillHeight.value = snapped * TRACK_HEIGHT;
      if (snapped !== lastSnapped.value) {
        lastSnapped.value = snapped;
        runOnJS(fireHaptic)();
      }
      runOnJS(emitChange)(snapped);
    })
    .onEnd(() => {
      // Smooth settle
      const snapped = snap(fillHeight.value / TRACK_HEIGHT, step);
      fillHeight.value = withTiming(snapped * TRACK_HEIGHT, { duration: 80 });
    });

  const fillAnimStyle = useAnimatedStyle(() => ({
    height: fillHeight.value,
  }));

  // Sync external value changes
  React.useEffect(() => {
    fillHeight.value = withTiming(value * TRACK_HEIGHT, { duration: 120 });
  }, [value, fillHeight]);

  return (
    <View
      style={[styles.wrapper, { opacity: disabled ? 0.4 : 1 }, style]}
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(value * 100),
      }}
    >
      <GestureDetector gesture={panGesture}>
        <View>
          <GlassSurface
            variant="pill"
            blurEnabled={blurEnabled}
            reduceTransparency={reduceTransparency}
            intensity={intensity}
            tint={tint}
            style={[
              styles.track,
              {
                width: TRACK_WIDTH,
                height: TRACK_HEIGHT,
              },
            ]}
          >
            {/* Fill track from bottom */}
            <View style={styles.fillContainer}>
              <Animated.View
                style={[
                  styles.fill,
                  {
                    backgroundColor: theme.colors.glassBorderHighlight,
                    width: TRACK_WIDTH,
                  },
                  fillAnimStyle,
                ]}
              />
            </View>

            {/* Icon at bottom center */}
            {icon && (
              <View style={styles.iconContainer}>
                <Ionicons name={icon} size={22} color={theme.colors.text} />
              </View>
            )}
          </GlassSurface>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  track: {
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  fillContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
  },
  fill: {
    borderRadius: 0,
    opacity: 0.4,
  },
  iconContainer: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: "center",
  },
});
