/**
 * ListRow
 * Composable list row with icon / subtitle / toggle / chevron / accessory variants.
 * Think of it as the atomic building block for any list in any fork.
 *
 * Usage:
 *   <ListRow title="Profile" icon="person-outline" onPress={fn} />
 *   <ListRow title="Dark Mode" subtitle="System default" trailing={<Switch />} />
 *   <ListRow title="Storage" subtitle="2.4 GB used" accessory={<TBadge label="80%" tone="warning" />} />
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
import { TText } from "../primitives/TText";

export interface ListRowProps {
  /** Primary label */
  title: string;
  /** Secondary line */
  subtitle?: string;
  /** Leading Ionicon */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Leading icon color (default: theme primary) */
  iconColor?: string;
  /** Custom leading element (overrides icon) */
  leading?: React.ReactNode;
  /** Custom trailing element (overrides chevron) */
  trailing?: React.ReactNode;
  /** Small accessory placed between label and trailing */
  accessory?: React.ReactNode;
  /** Show chevron-forward on the right (default: true when onPress provided) */
  showChevron?: boolean;
  /** Press handler */
  onPress?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Compact (less padding) */
  compact?: boolean;
  /** Container style override */
  style?: StyleProp<ViewStyle>;
}

export function ListRow({
  title,
  subtitle,
  icon,
  iconColor,
  leading,
  trailing,
  accessory,
  showChevron,
  onPress,
  disabled = false,
  compact = false,
  style,
}: ListRowProps) {
  const { theme } = useTheme();

  const hasChevron = showChevron ?? (!!onPress && !trailing);

  const inner = (
    <View
      style={[
        styles.row,
        compact && styles.compact,
        { opacity: disabled ? 0.5 : 1 },
        style,
      ]}
    >
      {/* Leading */}
      {leading ??
        (icon ? (
          <View
            style={[styles.iconWrap, { marginRight: theme.spacing.sm + 4 }]}
          >
            <Ionicons
              name={icon}
              size={22}
              color={iconColor ?? theme.colors.primary}
            />
          </View>
        ) : null)}

      {/* Content */}
      <View style={styles.content}>
        <TText
          style={[styles.title, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {title}
        </TText>
        {subtitle ? (
          <TText
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            numberOfLines={2}
          >
            {subtitle}
          </TText>
        ) : null}
      </View>

      {/* Accessory */}
      {accessory && <View style={styles.accessory}>{accessory}</View>}

      {/* Trailing */}
      {trailing && <View style={styles.trailing}>{trailing}</View>}

      {/* Chevron */}
      {hasChevron && (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={theme.colors.textMuted}
          style={{ marginLeft: 4 }}
        />
      )}
    </View>
  );

  if (!onPress || disabled) return inner;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      accessibilityRole="button"
      accessibilityLabel={title}
    >
      {inner}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  compact: {
    paddingVertical: 10,
    minHeight: 40,
  },
  iconWrap: {
    width: 28,
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  accessory: {
    marginLeft: 8,
  },
  trailing: {
    marginLeft: 8,
  },
});
