/**
 * GlassSurface
 * Core blur/translucent wrapper - uses BlurView on iOS, fallback elsewhere
 */

import { BlurView } from "expo-blur";
import React from "react";
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { glassIntensity, GlassIntensity, glassStyles } from "./glassStyles";

interface GlassSurfaceProps {
  children?: React.ReactNode;
  intensity?: GlassIntensity;
  style?: StyleProp<ViewStyle>;
  tint?: "light" | "dark" | "default";
}

export function GlassSurface({
  children,
  intensity = "medium",
  style,
  tint = "default",
}: GlassSurfaceProps) {
  const { theme } = useTheme();

  // Extract borderRadius from style, default to theme.radius.lg
  const flatStyle = StyleSheet.flatten(style);
  const borderRadius = flatStyle?.borderRadius ?? theme.radius.lg;

  // Use BlurView on iOS
  if (Platform.OS === "ios") {
    // In light mode, use systemMaterial or extraLight for better visibility
    const blurTint =
      tint === "default"
        ? theme.mode === "light"
          ? "extraLight"
          : "dark"
        : tint;

    return (
      <BlurView
        intensity={glassIntensity[intensity]}
        tint={blurTint}
        style={[
          glassStyles.glassContainer,
          {
            overflow: "hidden",
            borderRadius,
            borderColor: theme.colors.glassBorder,
            borderWidth: StyleSheet.hairlineWidth,
          },
          style,
        ]}
      >
        {children}
      </BlurView>
    );
  }

  // Fallback for Android, web
  return (
    <View
      style={[
        glassStyles.glassContainer,
        {
          backgroundColor: theme.colors.glassBackground,
          borderColor: theme.colors.glassBorder,
          borderWidth: StyleSheet.hairlineWidth,
          overflow: "hidden",
          borderRadius,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
