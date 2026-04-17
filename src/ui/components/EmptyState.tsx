/**
 * EmptyState
 * Placeholder for empty list/screen states.
 * Icon + title + subtitle + optional CTA button.
 *
 * Supports both raw strings and i18n keys via `titleKey`/`subtitleKey`/`actionLabelKey`.
 * Prefer the key-based props for new code.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { TButton } from "../primitives/TButton";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

export interface EmptyStateProps {
  /** Ionicons name */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Raw title string (prefer titleKey for new code) */
  title?: string;
  /** Translation key for title */
  titleKey?: string;
  /** Raw subtitle (prefer subtitleKey for new code) */
  subtitle?: string;
  /** Translation key for subtitle */
  subtitleKey?: string;
  /** Interpolation params for titleKey/subtitleKey */
  i18nParams?: Record<string, string | number>;
  /** Raw action label (prefer actionLabelKey for new code) */
  actionLabel?: string;
  /** Translation key for action button */
  actionLabelKey?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({
  icon = "file-tray-outline",
  title,
  titleKey,
  subtitle,
  subtitleKey,
  i18nParams,
  actionLabel,
  actionLabelKey,
  onAction,
  style,
}: EmptyStateProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  const resolvedTitle = titleKey ? t(titleKey, i18nParams as any) : title;
  const resolvedSubtitle = subtitleKey
    ? t(subtitleKey, i18nParams as any)
    : subtitle;
  const resolvedAction = actionLabelKey ? t(actionLabelKey) : actionLabel;

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
        {resolvedTitle}
      </TText>
      {resolvedSubtitle && (
        <>
          <TSpacer size="xs" />
          <TText color="secondary" style={styles.subtitle}>
            {resolvedSubtitle}
          </TText>
        </>
      )}
      {resolvedAction && onAction && (
        <>
          <TSpacer size="lg" />
          <TButton onPress={onAction} variant="outline" size="sm">
            {resolvedAction}
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
