/**
 * Tracking Launcher Hub
 *
 * Central screen for food logging. Shows:
 * - "Guide" pill with example prompts (food terms highlighted in orange)
 * - Three input method buttons: keyboard, mic, camera
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { TrackingPromptCard } from "../../src/ui/components/TrackingPromptCard";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

const PROMPTS = [
  {
    words: [
      { text: "I had" },
      { text: "two eggs", highlight: true },
      { text: "and" },
      { text: "toast", highlight: true },
      { text: "with" },
      { text: "butter", highlight: true },
      { text: "for breakfast" },
    ],
  },
  {
    words: [
      { text: "Just ate a" },
      { text: "chicken salad", highlight: true },
      { text: "with" },
      { text: "avocado", highlight: true },
      { text: "and" },
      { text: "olive oil dressing", highlight: true },
    ],
  },
  {
    words: [
      { text: "Had a" },
      { text: "protein shake", highlight: true },
      { text: "with" },
      { text: "banana", highlight: true },
      { text: "and" },
      { text: "peanut butter", highlight: true },
    ],
  },
];

export default function TrackingLauncherScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </Pressable>
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            {t("tracking.logFood")}
          </TText>
          <View style={{ width: 24 }} />
        </View>

        {/* Guide section */}
        <View style={styles.content}>
          <Animated.View entering={FadeIn.duration(400).delay(100)}>
            <View style={styles.guideHeader}>
              <View
                style={[
                  styles.guidePill,
                  { backgroundColor: theme.colors.primary + "22" },
                ]}
              >
                <Ionicons
                  name="bulb-outline"
                  size={14}
                  color={theme.colors.primary}
                />
                <TText
                  style={[styles.guideLabel, { color: theme.colors.primary }]}
                >
                  {t("tracking.guide")}
                </TText>
              </View>
            </View>
          </Animated.View>

          <TSpacer size="sm" />

          <Animated.View entering={FadeIn.duration(400).delay(150)}>
            <TText
              style={[styles.guideText, { color: theme.colors.textSecondary }]}
            >
              {t("tracking.guideDesc")}
            </TText>
          </Animated.View>

          <TSpacer size="md" />

          {/* Example prompts */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(250)}
            style={styles.prompts}
          >
            {PROMPTS.map((prompt, i) => (
              <TrackingPromptCard
                key={i}
                words={prompt.words}
                onPress={() => router.push("/(modals)/voice-log" as any)}
              />
            ))}
          </Animated.View>
        </View>

        {/* Input method buttons */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(400)}
          style={styles.inputMethods}
        >
          <View style={styles.methodRow}>
            {/* Keyboard */}
            <Pressable
              onPress={() => router.push("/(modals)/manual-log" as any)}
              style={({ pressed }) => [
                styles.methodBtn,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons
                name="keypad-outline"
                size={24}
                color={theme.colors.text}
              />
              <TText
                style={[
                  styles.methodLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("tracking.type")}
              </TText>
            </Pressable>

            {/* Mic — primary CTA */}
            <Pressable
              onPress={() => router.push("/(modals)/voice-log" as any)}
              style={({ pressed }) => [
                styles.micBtn,
                { transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.micGradient}
              >
                <Ionicons
                  name="mic"
                  size={32}
                  color={theme.colors.textInverse}
                />
              </LinearGradient>
            </Pressable>

            {/* Camera */}
            <Pressable
              onPress={() => router.push("/(modals)/camera-log" as any)}
              style={({ pressed }) => [
                styles.methodBtn,
                {
                  backgroundColor: theme.colors.surfaceSecondary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons
                name="camera-outline"
                size={24}
                color={theme.colors.text}
              />
              <TText
                style={[
                  styles.methodLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("tracking.scan")}
              </TText>
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  guideHeader: {
    flexDirection: "row",
  },
  guidePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  guideLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  guideText: {
    fontSize: 14,
    lineHeight: 20,
  },
  prompts: {
    gap: 10,
  },
  inputMethods: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  methodBtn: {
    width: 70,
    height: 70,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  methodLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  micBtn: {
    borderRadius: 36,
    overflow: "hidden",
  },
  micGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
});
