/**
 * DashboardSkeleton
 *
 * Lightweight shimmer-style skeleton block used across cards while data
 * is hydrating. No external deps — just a pulsed opacity loop on a
 * neutral fill, keyed off the current theme.
 */

import React, { memo, useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../../theme/useTheme";

interface DashboardSkeletonProps {
  width?: number | string;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

function DashboardSkeletonImpl({
  width = "100%",
  height = 16,
  radius = 8,
  style,
}: DashboardSkeletonProps) {
  const { theme } = useTheme();
  const v = useSharedValue(0.5);

  useEffect(() => {
    v.value = withRepeat(
      withTiming(1, { duration: 950, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [v]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + v.value * 0.4,
  }));

  return (
    <View
      style={[
        { width: width as number | undefined, height, borderRadius: radius },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            backgroundColor: theme.colors.borderSecondary,
            borderRadius: radius,
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}

export const DashboardSkeleton = memo(DashboardSkeletonImpl);

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
