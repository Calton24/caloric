/**
 * DaySelector
 * Horizontal row of 7 circular day buttons (M T W T F S S).
 * Highlights the selected day with a ring/fill.
 */

import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;

interface DaySelectorProps {
  /** 0-indexed selected day (0 = Monday) */
  selectedIndex: number;
  /** Called with 0-6 index */
  onSelect: (index: number) => void;
  /** Days with logged data */
  activeDays?: number[];
}

export function DaySelector({
  selectedIndex,
  onSelect,
  activeDays = [],
}: DaySelectorProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {DAYS.map((day, i) => {
        const isSelected = i === selectedIndex;
        const hasData = activeDays.includes(i);
        return (
          <Pressable
            key={`${day}-${i}`}
            onPress={() => onSelect(i)}
            style={[
              styles.day,
              {
                backgroundColor: isSelected
                  ? theme.colors.primary
                  : "transparent",
                borderColor: isSelected
                  ? theme.colors.primary
                  : hasData
                    ? theme.colors.surfaceElevated
                    : "transparent",
                borderWidth: isSelected || hasData ? 2 : 0,
              },
            ]}
          >
            <TText
              style={[
                styles.dayText,
                {
                  color: isSelected
                    ? theme.colors.textInverse
                    : theme.colors.textSecondary,
                  fontWeight: isSelected ? "700" : "500",
                },
              ]}
            >
              {day}
            </TText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  dayText: {
    fontSize: 14,
  },
});
