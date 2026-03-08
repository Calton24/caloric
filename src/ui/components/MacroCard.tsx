/**
 * MacroCard
 * Displays a single macro nutrient with progress bar.
 * Shows consumed/target grams and a colored mini progress bar.
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
  const progress = Math.min(consumedG / targetG, 1);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surfaceSecondary },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <TText style={[styles.label, { color: theme.colors.textSecondary }]}>
          {label}
        </TText>
      </View>
      <TText style={[styles.value, { color: theme.colors.text }]}>
        {Math.round(consumedG * 10) / 10}
        <TText style={[styles.unit, { color: theme.colors.textMuted }]}>
          /{targetG}g
        </TText>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
  },
  unit: {
    fontSize: 13,
    fontWeight: "400",
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  fill: {
    height: 4,
    borderRadius: 2,
  },
});
