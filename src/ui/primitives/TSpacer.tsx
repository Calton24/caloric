/**
 * TSpacer
 * Spacer component for consistent spacing
 */

import React from "react";
import { StyleProp, View, ViewStyle } from "react-native";
import { useTheme } from "../../theme/useTheme";

export interface TSpacerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
  horizontal?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function TSpacer({
  size = "md",
  horizontal = false,
  style,
}: TSpacerProps) {
  const { theme } = useTheme();

  const space = theme.spacing[size];

  return (
    <View
      style={[
        {
          width: horizontal ? space : undefined,
          height: horizontal ? undefined : space,
        },
        style,
      ]}
    />
  );
}
