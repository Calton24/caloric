/**
 * TrackingPromptCard
 * Card showing food term examples with highlighted keywords.
 * Used in the tracking launcher hub to show example inputs.
 */

import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

interface HighlightedWord {
  text: string;
  highlight?: boolean;
}

interface TrackingPromptCardProps {
  /** Array of word segments, some highlighted */
  words: HighlightedWord[];
  /** Accent color for highlighted words */
  accentColor?: string;
  onPress?: () => void;
}

export function TrackingPromptCard({
  words,
  accentColor,
  onPress,
}: TrackingPromptCardProps) {
  const { theme } = useTheme();
  const accent = accentColor ?? theme.colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.colors.surfaceSecondary,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.textRow}>
        {words.map((w, i) => (
          <TText
            key={i}
            style={[
              styles.word,
              {
                color: w.highlight ? accent : theme.colors.textSecondary,
                fontWeight: w.highlight ? "600" : "400",
              },
            ]}
          >
            {w.text}
          </TText>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
  },
  textRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
  },
  word: {
    fontSize: 15,
    lineHeight: 22,
  },
});
