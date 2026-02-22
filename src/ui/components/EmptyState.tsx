/**
 * EmptyState
 * Placeholder for empty list/screen states.
 * Icon + title + subtitle + optional CTA button.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TButton } from "../primitives/TButton";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

export interface EmptyStateProps {
  /** Ionicons name */
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon = "file-tray-outline",
  title,
  subtitle,
  actionLabel,
  onAction,
  style,
}: EmptyStateProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: theme.colors.surfaceSecondary,
            width: 72,
            height: 72,
            borderRadius: 36,
          },
        ]}
      >
        <Ionicons name={icon} size={32} color={theme.colors.textMuted} />
      </View>
      <TSpacer size="md" />
      <TText variant="subheading" style={styles.title}>
        {title}
      </TText>
      {subtitle && (
        <>
          <TSpacer size="xs" />
          <TText color="secondary" style={styles.subtitle}>
            {subtitle}
          </TText>
        </>
      )}
      {actionLabel && onAction && (
        <>
          <TSpacer size="lg" />
          <TButton onPress={onAction} variant="outline" size="sm">
            {actionLabel}
          </TButton>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  iconCircle: {
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 20,
  },
});
