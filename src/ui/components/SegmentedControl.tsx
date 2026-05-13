/**
 * SegmentedControl
 * Week / Month / Year toggle with animated indicator.
 */

import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../glass/GlassSurface";
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
  const isDark = theme.mode === "dark";
  const selectedSegmentBg = isDark
    ? "rgba(255,255,255,0.22)"
    : "rgba(255,255,255,0.95)";

  return (
    <GlassSurface variant="card" intensity="light" style={styles.container}>
      {segments.map((segment, i) => {
        const isSelected = i === selectedIndex;
        return (
          <Pressable
            key={segment}
            onPress={() => onSelect(i)}
            style={[
              styles.segment,
              isSelected && { backgroundColor: selectedSegmentBg },
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
    </GlassSurface>
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
