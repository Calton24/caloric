/**
 * DashboardCard
 *
 * Base card shell for the Progress dashboard — matches home coach / macro
 * glass (BlurView + tint on iOS, translucent fallback elsewhere).
 *
 * Variants:
 *   - "default" | "glass" — standard frosted card
 *   - "tinted" — extra brand-tint wash for insight / hero emphasis
 */

import React from "react";
import {
  ColorValue,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../../../theme/useTheme";
import { GlassSurface } from "../../glass/GlassSurface";

type Variant = "default" | "tinted" | "glass";

interface DashboardCardProps {
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
}: DashboardCardProps) {
  const { theme } = useTheme();

  const resolvedBorder =
    borderColor ??
    (variant === "tinted" ? theme.colors.glassSelectedBorder : undefined);

  const showTintedWash = variant === "tinted";

  return (
    <GlassSurface
      variant="card"
      intensity="light"
      style={[
        {
          borderRadius: radius,
          padding,
        },
        resolvedBorder != null ? { borderColor: resolvedBorder } : null,
        style,
      ]}
    >
      {showTintedWash ? (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: radius,
              backgroundColor: theme.colors.glassSelected,
            },
          ]}
        />
      ) : null}
      {children}
    </GlassSurface>
  );
}
