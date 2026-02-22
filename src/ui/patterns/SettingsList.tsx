/**
 * SettingsList
 * Grouped settings rows with toggle, navigation, and value variants.
 * Follows iOS Settings.app pattern with token-driven styling.
 *
 * Usage:
 *   <SettingsGroup title="General">
 *     <SettingsRow label="Notifications" icon="notifications-outline" type="toggle" value={true} onToggle={fn} />
 *     <SettingsRow label="Language" icon="globe-outline" type="navigate" value="English" onPress={fn} />
 *     <SettingsRow label="Clear Cache" icon="trash-outline" type="action" destructive onPress={fn} />
 *   </SettingsGroup>
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

/* ─── SettingsRow ────────────────────────────────────────────── */

export type SettingsRowType = "navigate" | "toggle" | "action" | "value";

export interface SettingsRowProps {
  /** Row label */
  label: string;
  /** Optional description below label */
  description?: string;
  /** Leading Ionicon name */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Icon background color */
  iconBg?: string;
  /** Row variant */
  type?: SettingsRowType;
  /** Current value (shown on right for "navigate" / "value") */
  value?: string | boolean;
  /** Toggle handler (for type="toggle") */
  onToggle?: (val: boolean) => void;
  /** Press handler (for type="navigate" / "action") */
  onPress?: () => void;
  /** Destructive styling */
  destructive?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom trailing element */
  trailing?: React.ReactNode;
}

export function SettingsRow({
  label,
  description,
  icon,
  iconBg,
  type = "navigate",
  value,
  onToggle,
  onPress,
  destructive = false,
  disabled = false,
  trailing,
}: SettingsRowProps) {
  const { theme } = useTheme();

  const textColor = destructive
    ? theme.colors.error
    : disabled
      ? theme.colors.textMuted
      : theme.colors.text;

  const content = (
    <View style={[styles.row, { opacity: disabled ? 0.5 : 1 }]}>
      {/* Icon */}
      {icon && (
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: iconBg ?? theme.colors.primary + "15",
              borderRadius: theme.radius.sm + 2,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={iconBg ? "#fff" : theme.colors.primary}
          />
        </View>
      )}

      {/* Label + desc */}
      <View style={styles.labelCol}>
        <TText style={[styles.label, { color: textColor }]}>{label}</TText>
        {description ? (
          <TText
            style={[styles.description, { color: theme.colors.textMuted }]}
          >
            {description}
          </TText>
        ) : null}
      </View>

      {/* Trailing */}
      {trailing ?? (
        <>
          {type === "toggle" && typeof value === "boolean" && (
            <Switch
              value={value}
              onValueChange={disabled ? undefined : onToggle}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.primary,
              }}
              disabled={disabled}
            />
          )}
          {(type === "navigate" || type === "value") &&
            typeof value === "string" && (
              <TText
                style={[styles.valueText, { color: theme.colors.textMuted }]}
                numberOfLines={1}
              >
                {value}
              </TText>
            )}
          {type === "navigate" && (
            <Ionicons
              name="chevron-forward"
              size={18}
              color={theme.colors.textMuted}
              style={{ marginLeft: 4 }}
            />
          )}
        </>
      )}
    </View>
  );

  if (type === "toggle" || type === "value") {
    return content;
  }

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
    >
      {content}
    </Pressable>
  );
}

/* ─── SettingsGroup ──────────────────────────────────────────── */

export interface SettingsGroupProps {
  /** Group title */
  title?: string;
  /** Group footer text */
  footer?: string;
  children: React.ReactNode;
}

export function SettingsGroup({ title, footer, children }: SettingsGroupProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.group}>
      {title ? (
        <TText style={[styles.groupTitle, { color: theme.colors.textMuted }]}>
          {title.toUpperCase()}
        </TText>
      ) : null}
      <View
        style={[
          styles.groupCard,
          {
            backgroundColor: theme.colors.surface,
            borderRadius: theme.radius.lg,
            borderColor: theme.colors.borderSecondary,
          },
        ]}
      >
        {React.Children.map(children, (child, i) => (
          <>
            {i > 0 && (
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.divider, marginLeft: 52 },
                ]}
              />
            )}
            {child}
          </>
        ))}
      </View>
      {footer ? (
        <TText style={[styles.groupFooter, { color: theme.colors.textMuted }]}>
          {footer}
        </TText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  /* Row */
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  iconBox: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  labelCol: {
    flex: 1,
  },
  label: {
    fontSize: 16,
  },
  description: {
    fontSize: 13,
    marginTop: 1,
  },
  valueText: {
    fontSize: 15,
    maxWidth: 140,
  },
  /* Group */
  group: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginLeft: 16,
  },
  groupCard: {
    borderWidth: 1,
    overflow: "hidden",
  },
  groupFooter: {
    fontSize: 13,
    marginTop: 6,
    marginLeft: 16,
    lineHeight: 18,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
});
