/**
 * useOverLimitColor — Animated severity color for calorie over-limit
 *
 * Returns an interpolated color that transitions smoothly:
 *   green (on-track) → yellow (slightly over) → orange (moderate) → red (severe)
 *
 * Thresholds based on calorie progress ratio (consumed / budget):
 *   ≤ 1.00  →  theme primary (green)
 *   1.00–1.15  →  #FBBF24 (yellow / warning)
 *   1.15–1.30  →  #F97316 (orange)
 *   > 1.30  →  #EF4444 (red / error)
 */

import { useEffect } from "react";
import {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../src/theme/useTheme";

const YELLOW = "#FBBF24";
const ORANGE = "#F97316";
const RED = "#EF4444";

/** Get a static severity color from a calorie progress ratio */
export function getOverLimitColor(
  progress: number,
  primaryColor: string
): string {
  if (progress <= 1) return primaryColor;
  if (progress <= 1.15) return YELLOW;
  if (progress <= 1.3) return ORANGE;
  return RED;
}

/** Hook returning an animated color and static value for over-limit severity */
export function useOverLimitColor(calorieProgress: number) {
  const { theme } = useTheme();
  const primary = theme.colors.primary;

  // Clamp to 0–2 range for interpolation
  const progressVal = useSharedValue(Math.min(calorieProgress, 2));

  useEffect(() => {
    progressVal.value = withTiming(Math.min(calorieProgress, 2), {
      duration: 600,
    });
  }, [calorieProgress, progressVal]);

  // Static color for non-animated uses (SVG, etc.)
  const staticColor = getOverLimitColor(calorieProgress, primary);

  // Animated style that can be applied to Animated.View backgrounds
  const animatedColorStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      progressVal.value,
      [0, 1, 1.15, 1.3, 2],
      [primary, primary, YELLOW, ORANGE, RED]
    );
    return { backgroundColor: color };
  });

  // Animated style for tint/color (e.g. text, icons)
  const animatedTintStyle = useAnimatedStyle(() => {
    const color = interpolateColor(
      progressVal.value,
      [0, 1, 1.15, 1.3, 2],
      [primary, primary, YELLOW, ORANGE, RED]
    );
    return { color };
  });

  return {
    /** Static hex color string for current severity */
    color: staticColor,
    /** Whether currently over the calorie limit */
    isOver: calorieProgress > 1,
    /** Animated backgroundColor style */
    animatedColorStyle,
    /** Animated text/tint color style */
    animatedTintStyle,
    /** The calorie progress ratio */
    progress: calorieProgress,
  };
}
