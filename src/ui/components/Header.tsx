/**
 * Header
 * Reusable screen header with title, optional subtitle, and trailing action.
 */

import React from "react";
import {
    Pressable,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

export interface HeaderProps {
  title: string;
  subtitle?: string;
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
  subtitle,
  trailing,
  leading,
  onTrailingPress,
  align = "left",
  style,
}: HeaderProps) {
  const { theme } = useTheme();

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
            {title}
          </TText>
          {subtitle && (
            <TText color="secondary" style={{ marginTop: theme.spacing.xs }}>
              {subtitle}
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
