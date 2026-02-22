/**
 * GlassCard
 * Card component that composes GlassSurface with padding and styling
 */

import React from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { GlassIntensity } from "./glassStyles";
import { GlassSurface } from "./GlassSurface";

interface GlassCardProps {
  children?: React.ReactNode;
  intensity?: GlassIntensity;
  padding?: "none" | "sm" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
}

export function GlassCard({
  children,
  intensity = "medium",
  padding = "md",
  style,
}: GlassCardProps) {
  const { theme } = useTheme();

  const paddingValue =
    padding === "none"
      ? 0
      : padding === "sm"
        ? theme.spacing.sm
        : padding === "md"
          ? theme.spacing.md
          : theme.spacing.lg;

  return (
    <GlassSurface
      intensity={intensity}
      style={[
        styles.card,
        {
          padding: paddingValue,
          borderRadius: theme.radius.lg,
        },
        style,
      ]}
    >
      {children}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    // Card wrapper
  },
});
