/**
 * DashboardCard
 *
 * The base "Liquid Glass" card primitive used across the Progress dashboard.
 * Single source of truth for: radius (2xl), padding, soft border, shadow,
 * matte tint, and inner spacing slots.
 *
 * Variants:
 *   - "default" (matte surface)
 *   - "tinted"  (subtle brand tint — used for hero / insight banners)
 *   - "glass"   (translucent — used for top summary cards)
 */

import React from "react";
import {
  ColorValue,
  StyleProp,
  StyleSheet,
  View,
  ViewProps,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../../theme/useTheme";

type Variant = "default" | "tinted" | "glass";

interface DashboardCardProps extends ViewProps {
  variant?: Variant;
  padding?: number;
  radius?: number;
  borderColor?: ColorValue;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

export function DashboardCard({
  variant = "default",
  padding = 16,
  radius = 24,
  borderColor,
  style,
  children,
  ...rest
}: DashboardCardProps) {
  const { theme } = useTheme();

  const bg =
    variant === "tinted"
      ? theme.colors.glassSelected
      : variant === "glass"
        ? theme.colors.glassBackground
        : theme.colors.surfaceElevated;

  const border =
    borderColor ??
    (variant === "tinted"
      ? theme.colors.glassSelectedBorder
      : variant === "glass"
        ? theme.colors.glassBorderHighlight
        : theme.colors.border);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: bg,
          borderRadius: radius,
          borderColor: border,
          padding,
          shadowColor: theme.colors.glassShadow,
        },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 3,
  },
});
