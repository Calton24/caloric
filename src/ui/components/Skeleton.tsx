/**
 * Skeleton
 * Animated loading placeholder. Token-driven colors and radii.
 *
 * Usage:
 *   <Skeleton width={200} height={16} />           // text line
 *   <Skeleton width={48} height={48} circle />      // avatar
 *   <Skeleton height={120} />                       // card block (full width)
 */

import React, { useEffect, useRef } from "react";
import { Animated, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../../theme/useTheme";

export interface SkeletonProps {
  /** Width in pixels or "100%" style string. Defaults to "100%". */
  width?: number | `${number}%`;
  /** Height in pixels */
  height?: number;
  /** Renders as a circle (borderRadius = height/2) */
  circle?: boolean;
  /** Custom border radius */
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = "100%",
  height = 16,
  circle = false,
  borderRadius,
  style,
}: SkeletonProps) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  const resolvedRadius = circle
    ? height / 2
    : (borderRadius ?? theme.radius.md);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: resolvedRadius,
          backgroundColor: theme.colors.surfaceSecondary,
          opacity,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    overflow: "hidden",
  },
});
