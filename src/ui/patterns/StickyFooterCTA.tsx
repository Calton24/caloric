/**
 * StickyFooterCTA
 * Pinned bottom bar with primary action button, optional secondary action.
 * Includes safe-area-bottom padding and a subtle top divider.
 *
 * Usage:
 *   <ScreenShell footer={<StickyFooterCTA label="Save Changes" onPress={save} />}>
 *     ...content...
 *   </ScreenShell>
 */

import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../theme/useTheme";
import { TButton } from "../primitives/TButton";
import { TText } from "../primitives/TText";

export interface StickyFooterCTAProps {
  /** Primary button label */
  label: string;
  /** Primary button handler */
  onPress: () => void;
  /** Primary button loading state */
  loading?: boolean;
  /** Primary button disabled */
  disabled?: boolean;
  /** Secondary text link below or beside primary */
  secondaryLabel?: string;
  /** Secondary handler */
  onSecondaryPress?: () => void;
  /** Helper text above the button */
  helperText?: string;
  /** Layout direction */
  layout?: "stacked" | "inline";
  style?: StyleProp<ViewStyle>;
}

export function StickyFooterCTA({
  label,
  onPress,
  loading = false,
  disabled = false,
  secondaryLabel,
  onSecondaryPress,
  helperText,
  layout = "stacked",
  style,
}: StickyFooterCTAProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 16),
          backgroundColor: theme.colors.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: theme.colors.divider,
        },
        style,
      ]}
    >
      {helperText ? (
        <TText style={[styles.helper, { color: theme.colors.textMuted }]}>
          {helperText}
        </TText>
      ) : null}

      {layout === "inline" ? (
        <View style={styles.inline}>
          {secondaryLabel && onSecondaryPress && (
            <TButton
              onPress={onSecondaryPress}
              variant="ghost"
              style={styles.inlineSecondary}
            >
              {secondaryLabel}
            </TButton>
          )}
          <TButton
            onPress={onPress}
            loading={loading}
            disabled={disabled}
            style={styles.inlinePrimary}
          >
            {label}
          </TButton>
        </View>
      ) : (
        <>
          <TButton onPress={onPress} loading={loading} disabled={disabled}>
            {label}
          </TButton>
          {secondaryLabel && onSecondaryPress && (
            <TButton
              onPress={onSecondaryPress}
              variant="ghost"
              size="sm"
              style={styles.secondary}
            >
              {secondaryLabel}
            </TButton>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  helper: {
    fontSize: 13,
    textAlign: "center",
    marginBottom: 8,
  },
  secondary: {
    marginTop: 8,
    alignSelf: "center",
  },
  inline: {
    flexDirection: "row",
    gap: 12,
  },
  inlineSecondary: {
    flex: 0,
  },
  inlinePrimary: {
    flex: 1,
  },
});
