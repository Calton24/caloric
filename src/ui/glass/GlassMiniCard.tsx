/**
 * GlassMiniCard
 * Small dashboard card with title, value, optional subtitle/delta and icon.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";
import { GlassSurface } from "./GlassSurface";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

interface GlassMiniCardProps {
  title: string;
  value: string;
  subtitle?: string;
  /** e.g. "+12%" or "−3" — auto-colored green/red by prefix */
  delta?: string;
  icon?: IconName;
  /** Pass-through to GlassSurface */
  blurEnabled?: boolean;
  reduceTransparency?: boolean;
  intensity?: number;
  tint?: "light" | "dark" | "default";
  style?: StyleProp<ViewStyle>;
}

export function GlassMiniCard({
  title,
  value,
  subtitle,
  delta,
  icon,
  blurEnabled,
  reduceTransparency,
  intensity,
  tint,
  style,
}: GlassMiniCardProps) {
  const { theme } = useTheme();

  // Determine delta color from prefix
  const deltaColor = delta
    ? delta.startsWith("+")
      ? theme.colors.success
      : delta.startsWith("-") || delta.startsWith("−")
        ? theme.colors.error
        : theme.colors.textSecondary
    : undefined;

  return (
    <GlassSurface
      variant="card"
      border
      blurEnabled={blurEnabled}
      reduceTransparency={reduceTransparency}
      intensity={intensity}
      tint={tint}
      style={[styles.card, style]}
    >
      {/* Header row: title + optional icon */}
      <View style={styles.header}>
        <TText
          color="secondary"
          style={styles.title}
          numberOfLines={1}
        >
          {title}
        </TText>
        {icon && (
          <Ionicons
            name={icon}
            size={16}
            color={theme.colors.textMuted}
          />
        )}
      </View>

      {/* Value */}
      <TText variant="heading" style={styles.value} numberOfLines={1}>
        {value}
      </TText>

      {/* Subtitle / Delta row */}
      {(subtitle || delta) && (
        <View style={styles.footer}>
          {subtitle && (
            <TText color="muted" style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </TText>
          )}
          {delta && (
            <TText style={[styles.delta, { color: deltaColor }]}>
              {delta}
            </TText>
          )}
        </View>
      )}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    minWidth: 140,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 2,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 11,
  },
  delta: {
    fontSize: 11,
    fontWeight: "600",
  },
});
