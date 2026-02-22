/**
 * TBadge
 * Small status indicator / count badge. Token-driven.
 *
 * Usage:
 *   <TBadge label="3" tone="error" />
 *   <TBadge label="NEW" tone="success" size="lg" />
 *   <TBadge dot tone="warning" />
 */

import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TText } from "./TText";

type Tone =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "muted";

export type TBadgeSize = "sm" | "md" | "lg";

export interface TBadgeProps {
  /** Text label (ignored when dot=true) */
  label?: string;
  /** Semantic color tone */
  tone?: Tone;
  /** Size preset */
  size?: TBadgeSize;
  /** Dot-only mode (no label) */
  dot?: boolean;
  /** Outline variant instead of filled */
  outline?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SIZE_MAP: Record<
  TBadgeSize,
  { h: number; px: number; fontSize: number; dotSize: number }
> = {
  sm: { h: 18, px: 6, fontSize: 10, dotSize: 8 },
  md: { h: 22, px: 8, fontSize: 12, dotSize: 10 },
  lg: { h: 28, px: 10, fontSize: 14, dotSize: 12 },
};

export function TBadge({
  label,
  tone = "primary",
  size = "md",
  dot = false,
  outline = false,
  style,
}: TBadgeProps) {
  const { theme } = useTheme();

  const toneColor: Record<Tone, string> = {
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error,
    info: theme.colors.info,
    muted: theme.colors.textMuted,
  };

  const color = toneColor[tone];
  const s = SIZE_MAP[size];

  if (dot) {
    return (
      <View
        style={[
          {
            width: s.dotSize,
            height: s.dotSize,
            borderRadius: s.dotSize / 2,
            backgroundColor: outline ? "transparent" : color,
            borderWidth: outline ? 1.5 : 0,
            borderColor: color,
          },
          style,
        ]}
        accessibilityRole="none"
      />
    );
  }

  return (
    <View
      style={[
        styles.badge,
        {
          minHeight: s.h,
          paddingHorizontal: s.px,
          borderRadius: s.h / 2,
          backgroundColor: outline ? "transparent" : color + "18",
          borderWidth: outline ? 1 : 0,
          borderColor: color,
        },
        style,
      ]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <TText
        style={[
          styles.label,
          {
            fontSize: s.fontSize,
            fontWeight: "600",
            color,
          },
        ]}
      >
        {label}
      </TText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  label: {
    textAlign: "center",
    includeFontPadding: false,
  },
});
