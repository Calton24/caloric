/**
 * MacroCard
 * Displays a single macro nutrient with a thick rounded progress bar.
 * Shows label, thick bar, and consumed/target grams.
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

interface MacroCardProps {
  label: string;
  consumedG: number;
  targetG: number;
  color: string;
}

export function MacroCard({
  label,
  consumedG,
  targetG,
  color,
}: MacroCardProps) {
  const { theme } = useTheme();
  const progress =
    targetG > 0 ? Math.min(consumedG / targetG, 1) : consumedG > 0 ? 1 : 0;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surfaceSecondary },
      ]}
    >
      <TText style={[styles.label, { color: theme.colors.textSecondary }]}>
        {label}
      </TText>
      <View
        style={[
          styles.track,
          { backgroundColor: theme.colors.surfaceElevated },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              backgroundColor: color,
              width: `${progress * 100}%`,
            },
          ]}
        />
      </View>
      <TText style={[styles.value, { color: theme.colors.text }]}>
        {Math.round(consumedG * 10) / 10}
        <TText style={[styles.unit, { color: theme.colors.textMuted }]}>
          /{targetG}g
        </TText>
      </TText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  track: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
  },
  fill: {
    height: 10,
    borderRadius: 5,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
  },
  unit: {
    fontSize: 13,
    fontWeight: "400",
  },
});
