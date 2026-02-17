/**
 * TInput
 * Themed text input primitive
 */

import React, { forwardRef } from "react";
import {
    StyleProp,
    StyleSheet,
    TextInput,
    TextInputProps,
    View,
    ViewStyle,
} from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TText } from "./TText";

export interface TInputProps extends TextInputProps {
  error?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

export const TInput = forwardRef<TextInput, TInputProps>(
  ({ error, containerStyle, style, ...props }, ref) => {
    const { theme } = useTheme();

    return (
      <View style={containerStyle}>
        <TextInput
          ref={ref}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: error ? theme.colors.error : theme.colors.border,
              borderWidth: 1,
              borderRadius: theme.radius.md,
              paddingVertical: theme.spacing.md,
              paddingHorizontal: theme.spacing.md,
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.text,
            },
            style,
          ]}
          placeholderTextColor={theme.colors.textMuted}
          {...props}
        />
        {error && (
          <TText
            style={[
              styles.error,
              {
                color: theme.colors.error,
                fontSize: theme.typography.fontSize.sm,
                marginTop: theme.spacing.xs,
              },
            ]}
          >
            {error}
          </TText>
        )}
      </View>
    );
  }
);

TInput.displayName = "TInput";

const styles = StyleSheet.create({
  input: {
    width: "100%",
  },
  error: {
    marginLeft: 4,
  },
});
