/**
 * FormField
 * Labeled form field with input and error handling
 */

import React, { forwardRef } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TInput, TInputProps } from "../primitives/TInput";
import { TText } from "../primitives/TText";

export interface FormFieldProps extends TInputProps {
  label?: string;
  required?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

export const FormField = forwardRef<any, FormFieldProps>(
  ({ label, required, error, containerStyle, ...inputProps }, ref) => {
    const { theme } = useTheme();

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <TText
            style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.text,
              marginBottom: theme.spacing.xs,
            }}
          >
            {label}
            {required && (
              <TText style={{ color: theme.colors.error }}> *</TText>
            )}
          </TText>
        )}
        <TInput ref={ref} error={error} {...inputProps} />
      </View>
    );
  }
);

FormField.displayName = "FormField";

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
});
