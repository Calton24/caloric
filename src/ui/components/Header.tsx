/**
 * Header
 * Reusable screen header with title, optional subtitle, and trailing action.
 *
 * Supports both raw strings and i18n keys via `titleKey`/`subtitleKey`.
 * Prefer the key-based props for new code.
 */

import React from "react";
import {
    Pressable,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

export interface HeaderProps {
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
  /** Render a trailing element (icon button, badge, etc.) */
  trailing?: React.ReactNode;
  /** Render a leading element (back button, icon, etc.) */
  leading?: React.ReactNode;
  onTrailingPress?: () => void;
  align?: "left" | "center";
  style?: StyleProp<ViewStyle>;
}

export function Header({
  title,
  titleKey,
  subtitle,
  subtitleKey,
  i18nParams,
  trailing,
  leading,
  onTrailingPress,
  align = "left",
  style,
}: HeaderProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  const resolvedTitle = titleKey
    ? t(titleKey, i18nParams as any)
    : (title ?? "");
  const resolvedSubtitle = subtitleKey
    ? t(subtitleKey, i18nParams as any)
    : subtitle;

  const trailingElement = trailing ? (
    onTrailingPress ? (
      <Pressable
        onPress={onTrailingPress}
        hitSlop={8}
        style={styles.trailingTouchable}
      >
        {trailing}
      </Pressable>
    ) : (
      <View style={styles.trailingTouchable}>{trailing}</View>
    )
  ) : null;

  return (
    <View
      style={[styles.container, { paddingBottom: theme.spacing.md }, style]}
    >
      <View style={styles.row}>
        {leading && <View style={styles.leading}>{leading}</View>}
        <View
          style={[styles.titles, align === "center" && styles.titlesCenter]}
        >
          <TText variant="heading" style={styles.title}>
            {resolvedTitle}
          </TText>
          {resolvedSubtitle && (
            <TText color="secondary" style={{ marginTop: theme.spacing.xs }}>
              {resolvedSubtitle}
            </TText>
          )}
        </View>
        {trailingElement}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  leading: {
    marginRight: 12,
  },
  titles: {
    flex: 1,
  },
  titlesCenter: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
  },
  trailingTouchable: {
    marginLeft: 12,
  },
});
