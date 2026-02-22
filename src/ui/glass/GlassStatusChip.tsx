/**
 * GlassStatusChip
 * Small pill with icon + text — neutral/success/warning/danger tones.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";
import { GlassSurface } from "./GlassSurface";

type IconName = React.ComponentProps<typeof Ionicons>["name"];
type Tone = "neutral" | "success" | "warning" | "danger";

interface GlassStatusChipProps {
  icon?: IconName;
  label: string;
  tone?: Tone;
  /** Pass-through to GlassSurface */
  blurEnabled?: boolean;
  reduceTransparency?: boolean;
  intensity?: number;
  tint?: "light" | "dark" | "default";
  style?: StyleProp<ViewStyle>;
}

const TONE_ICONS: Record<Tone, IconName> = {
  neutral: "information-circle-outline",
  success: "checkmark-circle-outline",
  warning: "warning-outline",
  danger: "alert-circle-outline",
};

export function GlassStatusChip({
  icon,
  label,
  tone = "neutral",
  blurEnabled,
  reduceTransparency,
  intensity,
  tint,
  style,
}: GlassStatusChipProps) {
  const { theme } = useTheme();

  const toneColorMap: Record<Tone, string> = {
    neutral: theme.colors.textSecondary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.error,
  };

  const color = toneColorMap[tone];
  const resolvedIcon = icon ?? TONE_ICONS[tone];

  return (
    <GlassSurface
      variant="pill"
      blurEnabled={blurEnabled}
      reduceTransparency={reduceTransparency}
      intensity={intensity}
      tint={tint}
      style={[styles.chip, style]}
    >
      {/* Subtle tone tint overlay */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: color, opacity: 0.08, borderRadius: 9999 },
        ]}
        pointerEvents="none"
      />
      <Ionicons name={resolvedIcon} size={14} color={color} />
      <TText style={[styles.label, { color }]}>{label}</TText>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
  },
});
