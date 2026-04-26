/**
 * QuickLogSection — "Eat Again" panel
 *
 * Shows recent/frequent foods as tappable pills on the home screen.
 * Tap a pill → pre-populate MealDraft → navigate to confirm-meal.
 * Rebuilt from food memory on every render so it stays fresh.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
    type FoodMemoryEntry,
    getFrequentFoods,
    getMemorySize,
    getRecentFoods,
    hasMemory,
} from "../../features/nutrition/memory/food-memory.service";
import { useNutritionDraftStore } from "../../features/nutrition/nutrition.draft.store";
import type { MealDraft } from "../../features/nutrition/nutrition.draft.types";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

type Tab = "recent" | "frequent";

/**
 * Build a MealDraft from a food memory entry for quick re-logging.
 * Uses the user's last-logged values (most accurate to their reality).
 */
function memoryToDraft(entry: FoodMemoryEntry): MealDraft {
  return {
    title: entry.name,
    source: "manual",
    rawInput: entry.name,
    calories: entry.lastCalories,
    protein: entry.lastProtein,
    carbs: entry.lastCarbs,
    fat: entry.lastFat,
    emoji: entry.emoji,
    confidence: 1.0,
    parseMethod: "quick-log",
  };
}

export function QuickLogSection({ isPro = false }: { isPro?: boolean }) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const setDraft = useNutritionDraftStore((s) => s.setDraft);
  const [activeTab, setActiveTab] = useState<Tab>("recent");

  // Use memory size as a cache-buster so lists refresh after new meals
  const memSize = getMemorySize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recentFoods = useMemo(() => getRecentFoods(10), [memSize]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const frequentFoods = useMemo(() => getFrequentFoods(10), [memSize]);

  // Don't render section if user has no food history yet
  if (!hasMemory()) return null;

  const foods = activeTab === "recent" ? recentFoods : frequentFoods;

  function handleQuickLog(entry: FoodMemoryEntry) {
    const draft = memoryToDraft(entry);
    setDraft(draft);
    router.push("/(modals)/confirm-meal" as never);
  }

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(450)}>
      {/* Section header with tab toggle */}
      <View style={styles.header}>
        <TText
          variant="subheading"
          style={[styles.sectionTitle, { color: theme.colors.text }]}
        >
          {t("quickLog.eatAgain")}
        </TText>
        <View style={styles.tabs}>
          <Pressable
            onPress={() => setActiveTab("recent")}
            style={[
              styles.tab,
              {
                backgroundColor:
                  activeTab === "recent"
                    ? theme.colors.primary + "22"
                    : "transparent",
              },
            ]}
          >
            <TText
              style={[
                styles.tabLabel,
                {
                  color:
                    activeTab === "recent"
                      ? theme.colors.primary
                      : theme.colors.textMuted,
                },
              ]}
            >
              {t("quickLog.recent")}
            </TText>
          </Pressable>
          {isPro && (
            <Pressable
              onPress={() => setActiveTab("frequent")}
              style={[
                styles.tab,
                {
                  backgroundColor:
                    activeTab === "frequent"
                      ? theme.colors.primary + "22"
                      : "transparent",
                },
              ]}
            >
              <TText
                style={[
                  styles.tabLabel,
                  {
                    color:
                      activeTab === "frequent"
                        ? theme.colors.primary
                        : theme.colors.textMuted,
                  },
                ]}
              >
                {t("quickLog.frequent")}
              </TText>
            </Pressable>
          )}
        </View>
      </View>

      {/* Horizontally scrollable food pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}
      >
        {foods.map((entry) => (
          <Pressable
            key={entry.name}
            onPress={() => handleQuickLog(entry)}
            style={({ pressed }) => [
              styles.pill,
              {
                backgroundColor: theme.colors.surfaceSecondary,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
          >
            <TText style={styles.pillEmoji}>{entry.emoji ?? "🍽"}</TText>
            <View style={styles.pillContent}>
              <TText
                style={[styles.pillName, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {entry.name}
              </TText>
              <View style={styles.pillMeta}>
                <TText
                  style={[
                    styles.pillCalories,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {entry.lastCalories} {t("tracking.cal")}
                </TText>
                {activeTab === "frequent" && entry.frequency > 1 && (
                  <View style={styles.pillFreq}>
                    <Ionicons
                      name="repeat"
                      size={10}
                      color={theme.colors.textMuted}
                    />
                    <TText
                      style={[
                        styles.pillFreqText,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {entry.frequency}×
                    </TText>
                  </View>
                )}
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  tabs: {
    flexDirection: "row",
    gap: 4,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  pillRow: {
    gap: 10,
    paddingRight: 20,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    gap: 8,
    minWidth: 130,
    maxWidth: 180,
  },
  pillEmoji: {
    fontSize: 22,
  },
  pillContent: {
    flex: 1,
  },
  pillName: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  pillMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  pillCalories: {
    fontSize: 12,
    fontWeight: "400",
  },
  pillFreq: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  pillFreqText: {
    fontSize: 11,
    fontWeight: "400",
  },
});
