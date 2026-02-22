/**
 * GlassHeader
 * Blur-backed header bar with title, optional subtitle, left/right action slots.
 * Uses expo-blur via GlassSurface for the glass effect.
 *
 * Usage:
 *   <GlassHeader title="Settings" />
 *   <GlassHeader
 *     title="Profile"
 *     subtitle="Edit your info"
 *     left={<BackButton />}
 *     right={<Ionicons name="ellipsis-horizontal" />}
 *   />
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
    Pressable,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../glass/GlassSurface";
import { TText } from "../primitives/TText";

export interface GlassHeaderProps {
  /** Primary title */
  title: string;
  /** Optional subtitle line */
  subtitle?: string;
  /** Left slot (e.g. back button) */
  left?: React.ReactNode;
  /** Right slot (e.g. action icons) */
  right?: React.ReactNode;
  /** Show back arrow that calls onBack */
  onBack?: () => void;
  /** Large title style */
  large?: boolean;
  /** Glass blur intensity */
  intensity?: "light" | "medium" | "strong";
  /** Hide bottom border */
  noBorder?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function GlassHeader({
  title,
  subtitle,
  left,
  right,
  onBack,
  large = false,
  intensity = "medium",
  noBorder = false,
  style,
}: GlassHeaderProps) {
  const { theme } = useTheme();

  const leftSlot =
    left ??
    (onBack ? (
      <Pressable
        onPress={onBack}
        hitSlop={8}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
      </Pressable>
    ) : null);

  return (
    <GlassSurface
      intensity={intensity}
      style={[
        styles.container,
        {
          borderBottomWidth: noBorder ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.divider,
          paddingTop: large ? 8 : 12,
          paddingBottom: large ? 12 : 12,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {/* Left */}
        <View style={styles.side}>{leftSlot}</View>

        {/* Center / Full-width */}
        <View style={[styles.center, large && styles.centerLarge]}>
          <TText
            style={[
              large ? styles.titleLarge : styles.title,
              { color: theme.colors.text },
            ]}
            numberOfLines={1}
          >
            {title}
          </TText>
          {subtitle ? (
            <TText
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {subtitle}
            </TText>
          ) : null}
        </View>

        {/* Right */}
        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  side: {
    width: 44,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  sideRight: {
    alignItems: "flex-end",
  },
  center: {
    flex: 1,
    alignItems: "center",
  },
  centerLarge: {
    alignItems: "flex-start",
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  titleLarge: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 1,
  },
});
