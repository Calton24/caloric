/**
 * Checkbox
 * Animated checkbox with label, controlled/uncontrolled support.
 *
 * Features:
 * - Spring scale animation on check
 * - Checkmark icon animates in
 * - Disabled & indeterminate states
 * - Label support with tap target
 * - Color customization or theme-driven
 * - Accessible (role, state)
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect } from "react";
import {
    Pressable,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import Animated, {
    interpolateColor,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

/* ── Types ─────────────────────────────────────────── */

export type CheckboxSize = "sm" | "md" | "lg";

export interface CheckboxProps {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Change handler */
  onChange: (checked: boolean) => void;
  /** Label text */
  label?: string;
  /** Description / helper text below label */
  description?: string;
  /** Indeterminate state (overrides checked visually) */
  indeterminate?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Size preset (default: "md") */
  size?: CheckboxSize;
  /** Custom active color (default: theme.primary) */
  activeColor?: string;
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

/* ── Size map ──────────────────────────────────────── */

const SIZE_MAP: Record<
  CheckboxSize,
  { box: number; icon: number; radius: number }
> = {
  sm: { box: 18, icon: 12, radius: 4 },
  md: { box: 22, icon: 16, radius: 5 },
  lg: { box: 28, icon: 20, radius: 6 },
};

/* ── Component ─────────────────────────────────────── */

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  indeterminate = false,
  disabled = false,
  size = "md",
  activeColor,
  style,
}: CheckboxProps) {
  const { theme } = useTheme();
  const dim = SIZE_MAP[size];
  const color = activeColor ?? theme.colors.primary;
  const inactiveColor = theme.colors.borderSecondary;

  // Shared values
  const progress = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);
  const iconOpacity = useSharedValue(checked || indeterminate ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: 200 });
    iconOpacity.value = withTiming(checked || indeterminate ? 1 : 0, {
      duration: 180,
    });
  }, [checked, indeterminate, progress, iconOpacity]);

  const handlePress = useCallback(() => {
    if (disabled) return;
    // Bounce
    scale.value = withSequence(
      withSpring(0.85, { damping: 10, stiffness: 400 }),
      withSpring(1, { damping: 8, stiffness: 250 })
    );
    onChange(!checked);
  }, [disabled, checked, onChange, scale]);

  const boxStyle = useAnimatedStyle(() => {
    const bg = interpolateColor(progress.value, [0, 1], ["transparent", color]);
    const borderColor = interpolateColor(
      progress.value,
      [0, 1],
      [inactiveColor, color]
    );
    return {
      backgroundColor: bg,
      borderColor,
      transform: [{ scale: scale.value }],
    };
  });

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconOpacity.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="checkbox"
      accessibilityState={{
        checked: indeterminate ? "mixed" : checked,
        disabled,
      }}
      style={[styles.container, disabled && styles.disabled, style]}
    >
      <Animated.View
        style={[
          styles.box,
          {
            width: dim.box,
            height: dim.box,
            borderRadius: dim.radius,
            borderWidth: 2,
          },
          boxStyle,
        ]}
      >
        <Animated.View style={iconStyle}>
          <Ionicons
            name={indeterminate ? "remove" : "checkmark"}
            size={dim.icon}
            color="#fff"
          />
        </Animated.View>
      </Animated.View>

      {(label || description) && (
        <View style={styles.labelContainer}>
          {label && (
            <TText
              style={{
                fontSize:
                  size === "sm"
                    ? theme.typography.fontSize.sm
                    : size === "lg"
                      ? theme.typography.fontSize.lg
                      : theme.typography.fontSize.base,
                color: disabled ? theme.colors.textMuted : theme.colors.text,
                fontWeight: theme.typography.fontWeight.medium,
              }}
            >
              {label}
            </TText>
          )}
          {description && (
            <TText
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textMuted,
                marginTop: 2,
              }}
            >
              {description}
            </TText>
          )}
        </View>
      )}
    </Pressable>
  );
}

/* ── CheckboxGroup ─────────────────────────────────── */

export interface CheckboxGroupProps {
  /** Array of selected values */
  value: string[];
  /** Change handler */
  onChange: (value: string[]) => void;
  /** Options */
  options: { value: string; label: string; description?: string }[];
  /** Size for all checkboxes */
  size?: CheckboxSize;
  /** Disabled state for all */
  disabled?: boolean;
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

export function CheckboxGroup({
  value,
  onChange,
  options,
  size,
  disabled,
  style,
}: CheckboxGroupProps) {
  return (
    <View style={[styles.group, style]}>
      {options.map((opt) => (
        <Checkbox
          key={opt.value}
          checked={value.includes(opt.value)}
          onChange={(checked) => {
            if (checked) {
              onChange([...value, opt.value]);
            } else {
              onChange(value.filter((v) => v !== opt.value));
            }
          }}
          label={opt.label}
          description={opt.description}
          size={size}
          disabled={disabled}
        />
      ))}
    </View>
  );
}

/* ── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 4,
  },
  disabled: {
    opacity: 0.5,
  },
  box: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  labelContainer: {
    flex: 1,
  },
  group: {
    gap: 12,
  },
});
