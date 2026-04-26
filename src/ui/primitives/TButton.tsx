/**
 * TButton
 * Themed button primitive
 */

import React from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleProp,
    StyleSheet,
    ViewStyle,
} from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TText } from "./TText";

export interface TButtonProps {
  children: React.ReactNode;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function TButton({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  style,
  testID,
}: TButtonProps) {
  const { theme } = useTheme();

  const isDisabled = disabled || loading;

  const backgroundColor =
    variant === "primary"
      ? theme.colors.primary
      : variant === "secondary"
        ? theme.colors.secondary
        : variant === "outline"
          ? "transparent"
          : "transparent";

  const borderColor =
    variant === "outline" ? theme.colors.border : "transparent";

  const textColor =
    variant === "primary" || variant === "secondary"
      ? theme.colors.textInverse
      : theme.colors.text;

  const paddingVertical =
    size === "sm"
      ? theme.spacing.sm
      : size === "md"
        ? theme.spacing.md
        : theme.spacing.lg;

  const paddingHorizontal =
    size === "sm"
      ? theme.spacing.md
      : size === "md"
        ? theme.spacing.lg
        : theme.spacing.xl;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor:
            pressed && !isDisabled && variant === "primary"
              ? theme.colors.primaryPressed
              : backgroundColor,
          borderColor,
          borderWidth: variant === "outline" ? 1 : 0,
          borderRadius: theme.radius.full,
          paddingVertical,
          paddingHorizontal,
          opacity: isDisabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : typeof children === "string" ? (
        <TText
          style={[
            styles.text,
            {
              color: textColor,
              fontSize:
                size === "sm"
                  ? theme.typography.fontSize.sm
                  : size === "md"
                    ? theme.typography.fontSize.base
                    : theme.typography.fontSize.lg,
              fontWeight: theme.typography.fontWeight.semibold,
            },
          ]}
        >
          {children}
        </TText>
      ) : (
        children
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  text: {
    textAlign: "center",
  },
});
