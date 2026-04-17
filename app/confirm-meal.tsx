/**
 * Meal Confirmation Screen
 *
 * Bridge between food capture (voice/manual/camera) and nutrition store.
 * Shows the detected/entered food items with editable calories & macros.
 * User confirms → meal is saved to nutritionStore.
 *
 * Receives meal data via route params (serialized MealEntry).
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import i18next from "i18next";
import React, { useState } from "react";
import {
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTranslation } from "../src/infrastructure/i18n/useAppTranslation";
import { useNutritionStore } from "../src/stores";
import { useTheme } from "../src/theme/useTheme";
import type { MealEntry } from "../src/types/nutrition";
import { TSpacer } from "../src/ui/primitives/TSpacer";
import { TText } from "../src/ui/primitives/TText";

/** Default meal entry for when params are incomplete */
function createDefaultMeal(params: Record<string, string>): MealEntry {
  return {
    id: params.id ?? `meal_${Date.now()}`,
    title: params.title ?? i18next.t("tracking.unnamedMeal"),
    calories: Number(params.calories) || 0,
    protein: Number(params.protein) || 0,
    carbs: Number(params.carbs) || 0,
    fat: Number(params.fat) || 0,
    source: (params.source as MealEntry["source"]) ?? "manual",
    loggedAt: params.loggedAt ?? new Date().toISOString(),
  };
}

export default function ConfirmMealScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();
  const addMeal = useNutritionStore((s) => s.addMeal);

  const [meal, setMeal] = useState<MealEntry>(() =>
    createDefaultMeal(params as Record<string, string>)
  );

  const updateField = <K extends keyof MealEntry>(
    key: K,
    value: MealEntry[K]
  ) => {
    setMeal((prev) => ({ ...prev, [key]: value }));
  };

  const handleConfirm = () => {
    addMeal(meal);
    // Navigate back to dashboard (dismiss tracking modal stack)
    router.dismissAll();
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            {t("tracking.confirmMeal")}
          </TText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Meal preview card */}
          <Animated.View
            entering={FadeIn.duration(400)}
            style={[
              styles.previewCard,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <TText style={styles.mealIcon}>🍽️</TText>
            <TSpacer size="sm" />
            <TextInput
              value={meal.title}
              onChangeText={(t) => updateField("title", t)}
              style={[styles.titleInput, { color: theme.colors.text }]}
              placeholderTextColor={theme.colors.textMuted}
              placeholder={t("tracking.mealNamePlaceholder")}
            />
            <TSpacer size="xs" />
            <View style={styles.sourceRow}>
              <Ionicons
                name={
                  meal.source === "voice"
                    ? "mic"
                    : meal.source === "camera"
                      ? "camera"
                      : "keypad"
                }
                size={14}
                color={theme.colors.textMuted}
              />
              <TText
                style={[styles.sourceLabel, { color: theme.colors.textMuted }]}
              >
                {meal.source === "voice"
                  ? t("tracking.voiceLogged")
                  : meal.source === "camera"
                    ? t("tracking.cameraDetected")
                    : t("tracking.manuallyEntered")}
              </TText>
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* Nutrition editor */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <TText
              style={[
                styles.sectionLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t("tracking.nutritionEstimate")}
            </TText>
            <TSpacer size="sm" />

            <View
              style={[
                styles.nutritionCard,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              {/* Calories */}
              <NutrientRow
                label={t("tracking.calories")}
                value={meal.calories}
                unit={t("tracking.cal")}
                color={theme.colors.primary}
                onChange={(v) => updateField("calories", v)}
              />

              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />

              {/* Protein */}
              <NutrientRow
                label={t("tracking.protein")}
                value={meal.protein}
                unit={t("tracking.g")}
                color="#60A5FA"
                onChange={(v) => updateField("protein", v)}
              />

              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />

              {/* Carbs */}
              <NutrientRow
                label={t("tracking.carbs")}
                value={meal.carbs}
                unit={t("tracking.g")}
                color="#FBBF24"
                onChange={(v) => updateField("carbs", v)}
              />

              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />

              {/* Fat */}
              <NutrientRow
                label={t("tracking.fat")}
                value={meal.fat}
                unit={t("tracking.g")}
                color="#F87171"
                onChange={(v) => updateField("fat", v)}
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* Helpful hint */}
          <Animated.View entering={FadeIn.duration(400).delay(200)}>
            <View
              style={[
                styles.hintCard,
                { backgroundColor: theme.colors.info + "15" },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={theme.colors.info}
              />
              <TText
                style={[styles.hintText, { color: theme.colors.textSecondary }]}
              >
                {t("tracking.adjustHint")}
              </TText>
            </View>
          </Animated.View>

          <TSpacer size="xxl" />
        </ScrollView>

        {/* Confirm button */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(300)}
          style={styles.bottomAction}
        >
          <Pressable
            onPress={handleConfirm}
            style={({ pressed }) => [
              styles.confirmBtn,
              {
                opacity: pressed ? 0.9 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.confirmGradient}
            >
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={theme.colors.textInverse}
              />
              <TText
                style={[
                  styles.confirmText,
                  { color: theme.colors.textInverse },
                ]}
              >
                {t("tracking.confirm")}
              </TText>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ─── Nutrient Row ──────────────────────────────────────────
function NutrientRow({
  label,
  value,
  unit,
  color,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  onChange: (value: number) => void;
}) {
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(value));

  const handleEndEditing = () => {
    const parsed = parseFloat(text);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(Math.round(parsed));
    } else {
      setText(String(value));
    }
    setEditing(false);
  };

  return (
    <View style={styles.nutrientRow}>
      <View style={[styles.nutrientDot, { backgroundColor: color }]} />
      <TText style={[styles.nutrientLabel, { color: theme.colors.text }]}>
        {label}
      </TText>
      <Pressable onPress={() => setEditing(true)} style={styles.nutrientValue}>
        {editing ? (
          <TextInput
            value={text}
            onChangeText={setText}
            onEndEditing={handleEndEditing}
            onBlur={handleEndEditing}
            keyboardType="numeric"
            autoFocus
            style={[styles.nutrientInput, { color: theme.colors.text }]}
          />
        ) : (
          <TText style={[styles.nutrientNumber, { color: theme.colors.text }]}>
            {value}
          </TText>
        )}
        <TText style={[styles.nutrientUnit, { color: theme.colors.textMuted }]}>
          {unit}
        </TText>
      </Pressable>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  previewCard: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  mealIcon: {
    fontSize: 48,
  },
  titleInput: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    minWidth: 200,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sourceLabel: {
    fontSize: 13,
    fontWeight: "400",
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  nutritionCard: {
    borderRadius: 14,
    padding: 4,
  },
  nutrientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  nutrientDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nutrientLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  nutrientValue: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  nutrientNumber: {
    fontSize: 18,
    fontWeight: "700",
  },
  nutrientInput: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 50,
    textAlign: "right",
    borderBottomWidth: 1,
    borderBottomColor: "#60A5FA",
    paddingBottom: 2,
  },
  nutrientUnit: {
    fontSize: 13,
    fontWeight: "400",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  hintCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    padding: 14,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  bottomAction: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  confirmBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  confirmText: {
    fontSize: 17,
    fontWeight: "700",
  },
});
