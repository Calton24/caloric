/**
 * Manual / Keyboard Logging Screen
 *
 * Search-based food logging with text input.
 * Type food descriptions to log meals.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLoggingFlow } from "../../src/features/nutrition/use-logging-flow";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

const QUICK_FOODS = [
  { icon: "🥚", labelKey: "manualLog.eggs", cal: 155 },
  { icon: "🍌", labelKey: "manualLog.banana", cal: 105 },
  { icon: "🥗", labelKey: "manualLog.salad", cal: 150 },
  { icon: "🍗", labelKey: "manualLog.chicken", cal: 335 },
  { icon: "🍚", labelKey: "manualLog.rice", cal: 206 },
  { icon: "🥛", labelKey: "manualLog.yogurt", cal: 100 },
];

export default function ManualLoggingScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { startFromInput } = useLoggingFlow();

  const handleLog = useCallback(async () => {
    if (!query.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      await startFromInput(query, "manual");
    } finally {
      setIsProcessing(false);
    }
  }, [query, startFromInput, isProcessing]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoiding}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20}
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
              {t("manualLog.title")}
            </TText>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.content}>
            {/* Search input */}
            <Animated.View entering={FadeIn.duration(400)}>
              <View
                style={[
                  styles.searchBox,
                  {
                    backgroundColor: theme.colors.surfaceSecondary,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="search"
                  size={20}
                  color={theme.colors.textMuted}
                />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t("manualLog.placeholder")}
                  placeholderTextColor={theme.colors.textMuted}
                  style={[styles.searchInput, { color: theme.colors.text }]}
                  multiline
                  autoFocus
                />
              </View>
            </Animated.View>

            <TSpacer size="lg" />

            {/* Quick add */}
            <Animated.View entering={FadeInUp.duration(400).delay(200)}>
              <TText
                style={[
                  styles.sectionLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("manualLog.quickAdd")}
              </TText>
              <TSpacer size="sm" />
              <View style={styles.quickGrid}>
                {QUICK_FOODS.map((food) => (
                  <Pressable
                    key={food.labelKey}
                    onPress={() =>
                      setQuery((q) =>
                        q ? `${q}, ${t(food.labelKey)}` : t(food.labelKey)
                      )
                    }
                    style={[
                      styles.quickItem,
                      { backgroundColor: theme.colors.surfaceSecondary },
                    ]}
                  >
                    <TText style={styles.quickEmoji}>{food.icon}</TText>
                    <TText
                      style={[styles.quickLabel, { color: theme.colors.text }]}
                    >
                      {t(food.labelKey)}
                    </TText>
                    <TText
                      style={[
                        styles.quickCal,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {food.cal} {t("tracking.cal")}
                    </TText>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          </View>

          {/* Log button */}
          {query.length > 0 && (
            <Animated.View
              entering={FadeInUp.duration(300)}
              style={styles.bottomAction}
            >
              <Pressable
                onPress={handleLog}
                disabled={isProcessing}
                style={({ pressed }) => [
                  styles.logBtn,
                  { opacity: isProcessing ? 0.6 : pressed ? 0.9 : 1 },
                ]}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.logGradient}
                >
                  {isProcessing ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textInverse}
                    />
                  ) : (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={theme.colors.textInverse}
                    />
                  )}
                  <TText
                    style={[
                      styles.logText,
                      { color: theme.colors.textInverse },
                    ]}
                  >
                    {isProcessing
                      ? t("common.processing")
                      : t("manualLog.logFood")}
                  </TText>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoiding: {
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
  searchBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    minHeight: 100,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickItem: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 4,
  },
  quickEmoji: {
    fontSize: 28,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  quickCal: {
    fontSize: 11,
    fontWeight: "400",
  },
  bottomAction: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 8,
  },
  logBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  logGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
  },
  logText: {
    fontSize: 17,
    fontWeight: "700",
  },
});
