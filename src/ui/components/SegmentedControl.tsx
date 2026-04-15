/**
 * SegmentedControl
 * Week / Month / Year toggle with animated indicator.
 */

import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

interface SegmentedControlProps {
  segments: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}

export function SegmentedControl({
  segments,
  selectedIndex,
  onSelect,
}: SegmentedControlProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surfaceSecondary },
      ]}
    >
      {segments.map((segment, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Pressable
            key={segment}
            onPress={() => onSelect(i)}
            style={[
              styles.segment,
              isSelected && {
                backgroundColor: theme.colors.surfaceElevated,
              },
            ]}
          >
            <TText
              style={[
                styles.label,
                {
                  color: isSelected
                    ? theme.colors.text
                    : theme.colors.textMuted,
                  fontWeight: isSelected ? "600" : "400",
                },
              ]}
            >
              {segment}
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
    borderRadius: 10,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 14,
  },
});
