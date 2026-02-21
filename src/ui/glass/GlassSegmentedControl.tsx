/**
 * GlassSegmentedControl
 * 2–5 segment control with glass background, active segment highlight.
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
        accessibilityRole="tablist"
        accessibilityLabel={accessibilityLabel}
      >
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

  const handlePressIn = useCallback(() => {
    scale.value = withTiming(0.93, { duration: 80 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: 120 });
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
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
        style={[
          styles.segment,
          active && {
            backgroundColor: theme.colors.glassBorderHighlight,
            borderRadius: theme.radius.lg,
          },
        ]}
      >
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
  segmentLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
