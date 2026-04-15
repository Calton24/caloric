/**
 * LogFoodSheet
 *
 * Bottom sheet content for the "+" FAB on the home screen.
 * Matches the reference design:
 * - Guide pill (top-left) + X close (top-right)
 * - Three example prompt cards with highlighted food terms
 * - Text input bar at bottom with send button
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import { useLoggingFlow } from "../../features/nutrition/use-logging-flow";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";
import { TrackingPromptCard } from "./TrackingPromptCard";

/** Example prompts shown in the sheet */
const PROMPTS = [
  {
    words: [
      { text: '"I ate a' },
      { text: "handful of almonds", highlight: true },
      { text: 'as a snack."' },
    ],
  },
  {
    words: [
      { text: '"I had a' },
      { text: "3 oz chocolate bar", highlight: true },
      { text: '"' },
    ],
  },
  {
    words: [
      { text: '"I grabbed a' },
      { text: "cappuccino and a croissant", highlight: true },
      { text: 'for breakfast"' },
    ],
  },
];

interface LogFoodSheetProps {
  onClose: () => void;
}

export function LogFoodSheet({ onClose }: LogFoodSheetProps) {
  const { theme } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { startFromInput } = useLoggingFlow();

  const handleSubmit = useCallback(async () => {
    const text = query.trim();
    if (!text || isProcessing) return;
    setIsProcessing(true);
    try {
      const ok = await startFromInput(text, "manual");
      if (ok) {
        onClose();
        router.push("/(modals)/confirm-meal" as never);
      }
    } finally {
      setIsProcessing(false);
    }
  }, [query, isProcessing, startFromInput, onClose, router]);

  const openGuide = useCallback(() => {
    onClose();
    router.push("/(modals)/guide" as never);
  }, [onClose, router]);

  return (
    <View style={styles.root}>
      {/* ── Header: Guide pill + close ── */}
      <View style={styles.header}>
        <Pressable
          onPress={openGuide}
          style={({ pressed }) => [
            styles.guidePill,
            {
              backgroundColor: theme.colors.surfaceSecondary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Ionicons name="bulb-outline" size={16} color={theme.colors.text} />
          <TText style={[styles.guideLabel, { color: theme.colors.text }]}>
            Guide
          </TText>
        </Pressable>

        <Pressable
          onPress={onClose}
          hitSlop={12}
          style={({ pressed }) => [
            styles.closeBtn,
            {
              backgroundColor: theme.colors.surfaceSecondary,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      </View>

      {/* ── Example prompt cards ── */}
      <View style={styles.prompts}>
        {PROMPTS.map((prompt, i) => (
          <TrackingPromptCard
            key={i}
            words={prompt.words}
            onPress={() => {
              // Pre-fill the input with the prompt text
              const raw = prompt.words.map((w) => w.text).join(" ");
              // Strip surrounding quotes
              const cleaned = raw.replace(/^"|"$/g, "").trim();
              setQuery(cleaned);
            }}
          />
        ))}
      </View>

      {/* ── Spacer pushes input to bottom ── */}
      <View style={styles.spacer} />

      {/* ── Text input bar ── */}
      <View
        style={[
          styles.inputBar,
          {
            backgroundColor: theme.colors.surfaceSecondary,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="What did you eat?"
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.textInput, { color: theme.colors.text }]}
          multiline
          returnKeyType="send"
          onSubmitEditing={handleSubmit}
          blurOnSubmit
        />
        <Pressable
          onPress={handleSubmit}
          disabled={!query.trim() || isProcessing}
          style={({ pressed }) => ({
            opacity: !query.trim() ? 0.4 : pressed ? 0.8 : 1,
          })}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendBtn}
            >
              <Ionicons
                name="arrow-forward"
                size={20}
                color={theme.colors.textInverse}
              />
            </LinearGradient>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  guidePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  guideLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  prompts: {
    gap: 12,
  },
  spacer: {
    flex: 1,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 26,
    paddingLeft: 18,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 80,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
});
