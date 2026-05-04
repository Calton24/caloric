/**
 * TText
 * Themed text primitive
 */

import React from "react";
import { StyleSheet, Text, TextProps } from "react-native";
import { useTheme } from "../../theme/useTheme";

export interface TTextProps extends TextProps {
  variant?: "body" | "heading" | "subheading" | "caption";
  color?: "primary" | "secondary" | "muted" | "inverse";
}

export function TText({
  variant = "body",
  color,
  style,
  ...props
}: TTextProps) {
  const { theme } = useTheme();

  const textColor =
    color === "primary"
      ? theme.colors.text
      : color === "secondary"
        ? theme.colors.textSecondary
        : color === "muted"
          ? theme.colors.textMuted
          : color === "inverse"
            ? theme.colors.textInverse
            : undefined;

  const variantStyle =
    variant === "heading"
      ? styles.heading
      : variant === "subheading"
        ? styles.subheading
        : variant === "caption"
          ? styles.caption
          : styles.body;

  const fontFamily =
    variant === "heading"
      ? theme.typography.fontFamily.extrabold
      : variant === "subheading"
        ? theme.typography.fontFamily.semibold
        : theme.typography.fontFamily.regular;

  return (
    <Text
      style={[
        variantStyle,
        {
          fontFamily,
          color: textColor || theme.colors.text,
          fontSize:
            variant === "heading"
              ? theme.typography.fontSize.xxl
              : variant === "subheading"
                ? theme.typography.fontSize.lg
                : variant === "caption"
                  ? theme.typography.fontSize.sm
                  : theme.typography.fontSize.base,
        },
        style,
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  body: {
    fontWeight: "400",
  },
  heading: {
    fontWeight: "700",
  },
  subheading: {
    fontWeight: "600",
  },
  caption: {
    fontWeight: "400",
  },
});
