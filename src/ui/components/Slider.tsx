/**
 * Slider (horizontal)
 * Animated horizontal slider with token-driven track/thumb.
 * Uses Reanimated + GestureHandler for smooth 60fps interaction.
 *
 * Usage:
 *   <Slider value={volume} onChange={setVolume} />
 *   <Slider value={0.5} onChange={v => {}} step={0.1} />
 */

import React, { useCallback, useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";

export interface SliderProps {
  /** Current value 0..1 */
  value: number;
  /** Called with new value on change */
  onChange: (value: number) => void;
  /** Snap step (e.g. 0.1 for 10 steps). Omit for continuous. */
  step?: number;
  /** Minimum track color tone */
  tone?: "primary" | "success" | "warning" | "error";
  /** Track height */
  trackHeight?: number;
  /** Thumb size */
  thumbSize?: number;
  /** Disabled state */
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const TRACK_DEFAULT_WIDTH = 280; // fallback if layout not measured yet

function clamp(v: number, min: number, max: number) {
  "worklet";
  return Math.min(Math.max(v, min), max);
}

function snap(v: number, step: number | undefined) {
  "worklet";
  if (!step || step <= 0) return v;
  return Math.round(v / step) * step;
}

export function Slider({
  value,
  onChange,
  step,
  tone = "primary",
  trackHeight = 6,
  thumbSize = 24,
  disabled = false,
  accessibilityLabel = "Slider",
  style,
}: SliderProps) {
  const { theme } = useTheme();
  const trackWidth = useSharedValue(TRACK_DEFAULT_WIDTH);
  const thumbX = useSharedValue(value * TRACK_DEFAULT_WIDTH);
  const startX = useSharedValue(0);
  const thumbScale = useSharedValue(1);

  const toneColor = {
    primary: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
  }[tone];

  const emitChange = useCallback(
    (v: number) => {
      onChange(v);
    },
    [onChange]
  );

  // Sync external value changes
  useEffect(() => {
    thumbX.value = withTiming(value * trackWidth.value, { duration: 100 });
  }, [value, thumbX, trackWidth]);

  const panGesture = Gesture.Pan()
    .enabled(!disabled)
    .onBegin(() => {
      startX.value = thumbX.value;
      thumbScale.value = withTiming(1.2, { duration: 100 });
    })
    .onUpdate((e) => {
      const raw = clamp(
        (startX.value + e.translationX) / trackWidth.value,
        0,
        1
      );
      const snapped = snap(raw, step);
      thumbX.value = snapped * trackWidth.value;
      runOnJS(emitChange)(snapped);
    })
    .onEnd(() => {
      thumbScale.value = withTiming(1, { duration: 150 });
      const snapped = snap(thumbX.value / trackWidth.value, step);
      thumbX.value = withTiming(snapped * trackWidth.value, { duration: 80 });
    });

  const fillStyle = useAnimatedStyle(() => ({
    width: thumbX.value,
  }));

  const thumbAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: thumbX.value - thumbSize / 2 },
      { scale: thumbScale.value },
    ],
  }));

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
        <View
          style={[
            styles.trackContainer,
            { height: Math.max(trackHeight, thumbSize) },
          ]}
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            if (w > 0) {
              trackWidth.value = w;
              thumbX.value = value * w;
            }
          }}
        >
          {/* Background track */}
          <View
            style={[
              styles.track,
              {
                height: trackHeight,
                borderRadius: trackHeight / 2,
                backgroundColor: theme.colors.surfaceSecondary,
              },
            ]}
          />
          {/* Filled track */}
          <Animated.View
            style={[
              styles.trackFill,
              {
                height: trackHeight,
                borderRadius: trackHeight / 2,
                backgroundColor: toneColor,
              },
              fillStyle,
            ]}
          />
          {/* Thumb */}
          <Animated.View
            style={[
              styles.thumb,
              {
                width: thumbSize,
                height: thumbSize,
                borderRadius: thumbSize / 2,
                backgroundColor: "#FFFFFF",
                borderColor: toneColor,
                top: (Math.max(trackHeight, thumbSize) - thumbSize) / 2,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 4,
              },
              thumbAnimStyle,
            ]}
          />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  trackContainer: {
    justifyContent: "center",
    position: "relative",
  },
  track: {
    position: "absolute",
    left: 0,
    right: 0,
  },
  trackFill: {
    position: "absolute",
    left: 0,
  },
  thumb: {
    position: "absolute",
    borderWidth: 2,
  },
});
