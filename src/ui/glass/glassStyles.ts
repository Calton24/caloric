/**
 * Glass Styles
 * Shared styles for glass morphism effects
 */

import { StyleSheet } from "react-native";

export const glassStyles = StyleSheet.create({
  glassContainer: {
    // Container for glass effect
  },
  glassContent: {
    flex: 1,
  },
  fallbackGlass: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
});

export const glassIntensity = {
  light: 50,
  medium: 80,
  strong: 100,
} as const;

export type GlassIntensity = keyof typeof glassIntensity;
