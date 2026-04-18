/**
 * OnboardingBackground
 * 4-layer depth system for onboarding screens:
 *  1. Base color fill
 *  2. Subtle green-tinted linear gradient (top-left → bottom-right)
 *  3. Radial glow blobs for atmospheric depth
 *  4. Atmosphere overlay for glass contrast
 */

import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../src/theme/useTheme";

interface OnboardingBackgroundProps {
  children: React.ReactNode;
}

export function OnboardingBackground({ children }: OnboardingBackgroundProps) {
  const { theme } = useTheme();
  const isLight = theme.mode === "light";

  const gradientStart = isLight
    ? "rgba(34, 197, 94, 0.07)"
    : "rgba(34, 197, 94, 0.10)";

  const atmosphereColor = isLight
    ? "rgba(0, 0, 0, 0.03)"
    : "rgba(0, 0, 0, 0.20)";

  const glowColor = isLight
    ? "rgba(34, 197, 94, 0.06)"
    : "rgba(34, 197, 94, 0.08)";

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Layer 1: Linear gradient wash */}
      <LinearGradient
        colors={[gradientStart, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Layer 2: Radial glow blobs — soft atmospheric depth */}
      <View
        style={[
          styles.glowBlob,
          styles.glowTopRight,
          { backgroundColor: glowColor },
        ]}
        pointerEvents="none"
      />
      <View
        style={[
          styles.glowBlob,
          styles.glowBottomLeft,
          { backgroundColor: glowColor },
        ]}
        pointerEvents="none"
      />

      {/* Layer 3: Atmosphere overlay — ensures glass contrast */}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: atmosphereColor }]}
        pointerEvents="none"
      />

      {/* Layer 4: Content */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glowBlob: {
    position: "absolute",
    borderRadius: 9999,
  },
  glowTopRight: {
    width: 280,
    height: 280,
    top: -60,
    right: -80,
  },
  glowBottomLeft: {
    width: 220,
    height: 220,
    bottom: 80,
    left: -60,
  },
});
