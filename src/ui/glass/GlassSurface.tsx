/**
 * GlassSurface
 * Core blur/translucent wrapper.
 * Uses BlurView on iOS, tinted View fallback elsewhere or when
 * reduce-transparency / blurEnabled=false is active.
 */

import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { glassIntensity, GlassIntensity } from "./glassStyles";

export type GlassVariant = "card" | "pill" | "circle" | "overlay";

interface GlassSurfaceProps {
  children?: React.ReactNode;
  /** Visual shape preset — sets default borderRadius */
  variant?: GlassVariant;
  /** Named intensity OR raw numeric BlurView intensity */
  intensity?: GlassIntensity | number;
  style?: StyleProp<ViewStyle>;
  tint?: "light" | "dark" | "default";
  /** Explicit borderRadius override (takes precedence over variant) */
  radius?: number;
  /** Inner highlight border for glass thickness effect */
  border?: boolean;
  /** Set false to force solid fallback (e.g., perf budget, reduce transparency) */
  blurEnabled?: boolean;
  /** Simulates reduce-transparency — intended for catalog knobs */
  reduceTransparency?: boolean;
}

export function GlassSurface({
  children,
  variant = "card",
  intensity = "medium",
  style,
  tint = "default",
  radius,
  border = false,
  blurEnabled = true,
  reduceTransparency = false,
}: GlassSurfaceProps) {
  const { theme } = useTheme();

  // Resolve numeric intensity
  const resolvedIntensity =
    typeof intensity === "number" ? intensity : glassIntensity[intensity];

  // Resolve border radius: explicit > variant default > theme
  const flatStyle = StyleSheet.flatten(style);
  const defaultRadius =
    variant === "pill" || variant === "circle"
      ? theme.radius.full
      : theme.radius.lg;
  const borderRadius =
    radius ?? (flatStyle?.borderRadius as number | undefined) ?? defaultRadius;

  // Determine if we should use real blur
  const useBlur = Platform.OS === "ios" && blurEnabled && !reduceTransparency;

  // Tint overlay color for glass depth
  const tintOverlay =
    tint === "dark" || (tint === "default" && theme.mode === "dark")
      ? theme.colors.glassTintDark
      : theme.colors.glassTintLight;

  // Inner highlight border
  const highlightBorder = border
    ? {
        borderColor: theme.colors.glassBorderHighlight,
        borderWidth: StyleSheet.hairlineWidth * 2,
      }
    : {
        borderColor: theme.colors.glassBorder,
        borderWidth: StyleSheet.hairlineWidth,
      };

  // Shadow
  const shadowStyle = {
    shadowColor: theme.colors.glassShadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  };

  const sharedStyle: ViewStyle = {
    overflow: "hidden" as const,
    borderRadius,
    ...highlightBorder,
    ...shadowStyle,
  };

  if (useBlur) {
    const blurTint =
      tint === "default" ? (theme.mode === "light" ? "light" : "dark") : tint;

    return (
      <BlurView
        intensity={resolvedIntensity}
        tint={blurTint}
        style={[sharedStyle, style]}
      >
        {/* Tint overlay for glass depth */}
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: tintOverlay }]}
          pointerEvents="none"
        />
        {children}
      </BlurView>
    );
  }

  // Solid fallback (Android, reduce transparency, blurEnabled=false)
  return (
    <View
      style={[
        sharedStyle,
        { backgroundColor: theme.colors.glassBackground },
        style,
      ]}
    >
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: tintOverlay }]}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}
