/**
 * ProgressBar
 * Animated horizontal progress indicator. Token-driven colors + radius.
 *
 * Usage:
 *   <ProgressBar progress={0.65} />
 *   <ProgressBar progress={0.3} tone="success" label="Uploading…" />
 */

import React, { useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

type Tone = "primary" | "success" | "warning" | "error" | "info";

export interface ProgressBarProps {
  /** Progress value 0..1 */
  progress: number;
  /** Semantic color tone */
  tone?: Tone;
  /** Height of the bar in pixels */
  height?: number;
  /** Show percentage label */
  showLabel?: boolean;
  /** Custom label text (overrides percentage) */
  label?: string;
  /** Indeterminate mode — ignores progress, shows animated shimmer */
  indeterminate?: boolean;
  style?: StyleProp<ViewStyle>;
}

const TIMING_CONFIG = { duration: 350, easing: Easing.out(Easing.cubic) };

export function ProgressBar({
  progress,
  tone = "primary",
  height = 8,
  showLabel = false,
  label,
  indeterminate = false,
  style,
}: ProgressBarProps) {
  const { theme } = useTheme();
  const fillWidth = useSharedValue(Math.max(0, Math.min(1, progress)));

  useEffect(() => {
    if (!indeterminate) {
      fillWidth.value = withTiming(
        Math.max(0, Math.min(1, progress)),
        TIMING_CONFIG
      );
    }
  }, [progress, indeterminate, fillWidth]);

  const toneColor = {
    primary: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
    info: theme.colors.info,
  }[tone];

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillWidth.value * 100}%` as unknown as number,
  }));

  // Indeterminate shimmer
  const shimmerX = useSharedValue(0);
  useEffect(() => {
    if (indeterminate) {
      const run = () => {
        shimmerX.value = 0;
        shimmerX.value = withTiming(1, {
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
        });
      };
      run();
      const interval = setInterval(run, 1400);
      return () => clearInterval(interval);
    }
  }, [indeterminate, shimmerX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    left: `${shimmerX.value * 70}%` as unknown as number,
    width: "30%",
  }));

  const displayLabel =
    label ??
    (showLabel
      ? `${Math.round(Math.max(0, Math.min(1, progress)) * 100)}%`
      : null);

  return (
    <View style={[styles.wrapper, style]}>
      {displayLabel && (
        <TText color="secondary" style={styles.label}>
          {displayLabel}
        </TText>
      )}
      <View
        style={[
          styles.track,
          {
            height,
            backgroundColor: theme.colors.surfaceSecondary,
            borderRadius: height / 2,
          },
        ]}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: 100,
          now: indeterminate ? undefined : Math.round(progress * 100),
        }}
      >
        {indeterminate ? (
          <Animated.View
            style={[
              styles.fill,
              {
                backgroundColor: toneColor,
                borderRadius: height / 2,
                height,
                position: "absolute",
                top: 0,
              },
              shimmerStyle,
            ]}
          />
        ) : (
          <Animated.View
            style={[
              styles.fill,
              {
                backgroundColor: toneColor,
                borderRadius: height / 2,
                height,
              },
              fillStyle,
            ]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  label: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
  },
  track: {
    overflow: "hidden",
  },
  fill: {},
});
