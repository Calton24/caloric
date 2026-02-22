/**
 * GlassSegmentedControl
 * 2–5 segment control with glass background.
 * Features a sliding animated indicator that glides between segments.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
    LayoutChangeEvent,
    Pressable,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";
import { GlassSurface } from "./GlassSurface";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export interface SegmentOption {
  key: string;
  label: string;
  icon?: IconName;
}

interface GlassSegmentedControlProps {
  options: SegmentOption[];
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  /** Pass-through to GlassSurface */
  blurEnabled?: boolean;
  reduceTransparency?: boolean;
  intensity?: number;
  tint?: "light" | "dark" | "default";
  style?: StyleProp<ViewStyle>;
}

const INDICATOR_TIMING = {
  duration: 280,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

export function GlassSegmentedControl({
  options,
  value,
  onChange,
  disabled = false,
  accessibilityLabel = "Segmented control",
  blurEnabled,
  reduceTransparency,
  intensity,
  tint,
  style,
}: GlassSegmentedControlProps) {
  const { theme } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);

  // Sliding indicator
  const activeIndex = options.findIndex((o) => o.key === value);
  const segmentWidth = options.length > 0 ? containerWidth / options.length : 0;
  const indicatorX = useSharedValue(activeIndex * segmentWidth);
  const indicatorOpacity = useSharedValue(containerWidth > 0 ? 1 : 0);

  // Animate indicator to new position when value changes
  useEffect(() => {
    if (containerWidth <= 0) return;
    const idx = options.findIndex((o) => o.key === value);
    if (idx < 0) return;
    const targetX = idx * (containerWidth / options.length);
    indicatorX.value = withTiming(targetX, INDICATOR_TIMING);
    indicatorOpacity.value = withTiming(1, { duration: 200 });
  }, [value, containerWidth, options, indicatorX, indicatorOpacity]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    opacity: indicatorOpacity.value,
  }));

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const w = e.nativeEvent.layout.width;
      setContainerWidth(w);
      // Set initial position without animation
      const idx = options.findIndex((o) => o.key === value);
      if (idx >= 0 && options.length > 0) {
        indicatorX.value = idx * (w / options.length);
        indicatorOpacity.value = 1;
      }
    },
    [options, value, indicatorX, indicatorOpacity]
  );

  return (
    <GlassSurface
      variant="pill"
      blurEnabled={blurEnabled}
      reduceTransparency={reduceTransparency}
      intensity={intensity}
      tint={tint}
      style={[styles.container, style]}
    >
      <View
        style={styles.inner}
        onLayout={handleLayout}
        accessibilityRole="tablist"
        accessibilityLabel={accessibilityLabel}
      >
        {/* Sliding indicator */}
        {segmentWidth > 0 && (
          <Animated.View
            style={[
              styles.indicator,
              {
                width: segmentWidth - 4, // 2px inset per side
                backgroundColor: theme.colors.glassBorderHighlight,
                borderRadius: theme.radius.lg,
              },
              indicatorStyle,
            ]}
            pointerEvents="none"
          />
        )}

        {options.map((opt) => {
          const isActive = opt.key === value;
          return (
            <SegmentTab
              key={opt.key}
              option={opt}
              active={isActive}
              disabled={disabled}
              theme={theme}
              onPress={() => onChange(opt.key)}
            />
          );
        })}
      </View>
    </GlassSurface>
  );
}

/** Individual segment — separated to isolate reanimated hooks */
function SegmentTab({
  option,
  active,
  disabled,
  theme,
  onPress,
}: {
  option: SegmentOption;
  active: boolean;
  disabled: boolean;
  theme: ReturnType<typeof import("../../theme/useTheme").useTheme>["theme"];
  onPress: () => void;
}) {
  const scale = useSharedValue(1);
  const labelOpacity = useSharedValue(active ? 1 : 0.6);

  // Animate text/icon opacity on active change
  useEffect(() => {
    labelOpacity.value = withTiming(active ? 1 : 0.6, { duration: 200 });
  }, [active, labelOpacity]);

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.93, { duration: 80 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 120 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const labelAnimStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  return (
    <Animated.View style={[styles.segmentWrapper, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        accessibilityRole="tab"
        accessibilityLabel={option.label}
        accessibilityState={{ selected: active, disabled }}
        style={styles.segment}
      >
        <Animated.View style={[styles.segmentContent, labelAnimStyle]}>
          {option.icon && (
            <Ionicons
              name={option.icon}
              size={16}
              color={active ? theme.colors.text : theme.colors.textMuted}
              style={{ marginRight: option.label ? 4 : 0 }}
            />
          )}
          <TText
            color={active ? "primary" : "muted"}
            style={styles.segmentLabel}
          >
            {option.label}
          </TText>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 3,
  },
  inner: {
    flexDirection: "row",
    position: "relative",
  },
  indicator: {
    position: "absolute",
    top: 2,
    left: 2,
    bottom: 2,
  },
  segmentWrapper: {
    flex: 1,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  segmentContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
