/**
 * ListItem
 * Tappable row with optional leading icon, label, subtitle, chevron.
 * Token-driven spacing and colors.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

export interface ListItemProps {
  label: string;
  subtitle?: string;
  /** Ionicons name for leading icon */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Custom leading element (overrides icon) */
  leading?: React.ReactNode;
  /** Custom trailing element (overrides chevron) */
  trailing?: React.ReactNode;
  /** Show chevron indicator (default true when onPress provided) */
  chevron?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ListItem({
  label,
  subtitle,
  icon,
  leading,
  trailing,
  chevron,
  onPress,
  disabled = false,
  style,
}: ListItemProps) {
  const { theme } = useTheme();

  const showChevron = chevron ?? !!onPress;

  const leadingElement = leading ?? (icon ? (
    <View
      style={[
        styles.iconWrapper,
        {
          backgroundColor: theme.colors.surfaceSecondary,
          borderRadius: theme.radius.md,
          width: 36,
          height: 36,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={theme.colors.primary}
      />
    </View>
  ) : null);

  const content = (
    <View
      style={[
        styles.container,
        {
          paddingVertical: theme.spacing.md,
          borderBottomColor: theme.colors.divider,
          borderBottomWidth: StyleSheet.hairlineWidth,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {leadingElement && <View style={styles.leading}>{leadingElement}</View>}

      <View style={styles.content}>
        <TText numberOfLines={1}>{label}</TText>
        {subtitle && (
          <TText
            color="secondary"
            variant="caption"
            numberOfLines={2}
            style={{ marginTop: 2 }}
          >
            {subtitle}
          </TText>
        )}
      </View>

      {trailing ?? (showChevron && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.colors.textMuted}
        />
      ))}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  leading: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
});
