/**
 * AuthHeader
 * Reusable header for auth screens
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../../theme/useTheme";
import { TSpacer } from "../../../ui/primitives/TSpacer";
import { TText } from "../../../ui/primitives/TText";

interface AuthHeaderProps {
  title: string;
  subtitle?: string;
}

export function AuthHeader({ title, subtitle }: AuthHeaderProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <TText
        variant="heading"
        style={{
          color: theme.colors.text,
          textAlign: "center",
        }}
      >
        {title}
      </TText>
      {subtitle && (
        <>
          <TSpacer size="sm" />
          <TText
            color="secondary"
            style={{
              textAlign: "center",
              fontSize: theme.typography.fontSize.base,
            }}
          >
            {subtitle}
          </TText>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    width: "100%",
  },
});
