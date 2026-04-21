/**
 * Scan Result Screen
 *
 * AI-first review screen for the camera scan path.
 * One screen, no scroll. The confirm button is the dominant element.
 * Everything else is supporting context, not information to inspect.
 *
 * Happy path principle:
 *   capture → background analyze → glance → one-tap confirm.
 *
 * Confidence thresholds:
 *   > 0.85  → no label; CTA = framing.cta
 *   0.65–0.85 → subtle "AI estimate" label near title
 *   < 0.65  → "Check before logging" label; CTA = "Review first" → Adjust
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBackgroundScanStore } from "../../src/features/camera/background-scan.store";
import { useGoalsStore } from "../../src/features/goals/goals.store";
import { useNutritionDraftStore } from "../../src/features/nutrition/nutrition.draft.store";
import {
    getMealsForDate,
    getNutritionTotals,
} from "../../src/features/nutrition/nutrition.selectors";
import { useNutritionStore } from "../../src/features/nutrition/nutrition.store";
import { useLoggingFlow } from "../../src/features/nutrition/use-logging-flow";
import { useRetentionStore } from "../../src/features/retention/retention.store";
import { resolveScanFraming } from "../../src/features/scan-framing/scan-framing.service";
import { useStreakStore } from "../../src/features/streak/streak.store";
import { toISODate } from "../../src/lib/utils/date";
import { useTheme } from "../../src/theme/useTheme";
import { useToast } from "../../src/ui/components/Toast";
import { TText } from "../../src/ui/primitives/TText";

// ─── Confidence label (inline, no pill box) ───────────────────────────────────

function ConfidenceLabel({ confidence }: { confidence: number }) {
  const { theme } = useTheme();
  if (confidence > 0.85) return null;
  const isLow = confidence < 0.65;
  const label = isLow ? "Check before logging" : "AI estimate";
  const color = isLow
    ? theme.colors.warning
    : (theme.colors.info ?? theme.colors.primary);
  return <TText style={[styles.confidenceLabel, { color }]}>{label}</TText>;
}

// ─── Tint color resolver ──────────────────────────────────────────────────────

function useTintColor(
  tint: "success" | "warning" | "error" | "primary" | "info"
) {
  const { theme } = useTheme();
  switch (tint) {
    case "success":
      return theme.colors.success;
    case "warning":
      return theme.colors.warning;
    case "error":
      return theme.colors.error;
    case "info":
      return theme.colors.info ?? theme.colors.primary;
    default:
      return theme.colors.primary;
  }
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function ScanResultScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const toast = useToast();

  // Confirm button feedback
  const [confirming, setConfirming] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Data sources
  const draft = useNutritionDraftStore((s) => s.draft);
  const imageUri = useBackgroundScanStore((s) => s.job?.imageUri ?? null);
  const resetScan = useBackgroundScanStore((s) => s.resetScan);
  const plan = useGoalsStore((s) => s.plan);
  const allMeals = useNutritionStore((s) => s.meals);
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const recordFirstMeal = useRetentionStore((s) => s.recordFirstMeal);
  const { saveDraftWithoutNav, navigateAfterSave } = useLoggingFlow();

  const todayISO = toISODate(new Date());
  const calorieBudget = plan?.calorieBudget ?? 2000;
  const proteinTarget = plan?.macros.protein ?? 150;

  const todayMeals = useMemo(
    () => getMealsForDate(allMeals, todayISO),
    [allMeals, todayISO]
  );
  const todayTotals = useMemo(
    () => getNutritionTotals(todayMeals),
    [todayMeals]
  );

  const confidence = draft?.confidence ?? 0;
  const mealCalories = draft?.calories ?? 0;

  const framing = useMemo(() => {
    if (!draft) return null;
    return resolveScanFraming({
      consumedCalories: todayTotals.calories,
      calorieBudget,
      mealCalories,
      currentStreak,
      consumedProtein: todayTotals.protein,
      proteinTarget,
      hourOfDay: new Date().getHours(),
    });
  }, [
    draft,
    todayTotals,
    calorieBudget,
    mealCalories,
    currentStreak,
    proteinTarget,
  ]);

  const tintColor = useTintColor(framing?.tintColor ?? "primary");

  const progressValue =
    calorieBudget > 0
      ? Math.min((todayTotals.calories + mealCalories) / calorieBudget, 1.15)
      : 0;

  if (!draft || !framing) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </Pressable>
          </View>
          <View style={styles.centeredEmpty}>
            <TText style={{ color: theme.colors.textMuted }}>
              Nothing to review.
            </TText>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleConfirm() {
    if (confirming) return;
    setConfirming(true);

    // Button micro-bounce
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();

    // Store cleared before navigation so AnalyzingCard disappears cleanly.
    saveDraftWithoutNav();
    recordFirstMeal();
    resetScan();
    toast.show(`${mealCalories} kcal logged`, "success");
    navigateAfterSave();
  }

  const isLowConfidence = confidence < 0.65;
  const primaryLabel = isLowConfidence ? "Review first" : framing.cta;
  const primaryColor = isLowConfidence ? theme.colors.warning : tintColor;

  function handlePrimary() {
    if (isLowConfidence) {
      router.push("/(modals)/confirm-meal" as never);
    } else {
      handleConfirm();
    }
  }

  function handleAdjust() {
    router.push("/(modals)/confirm-meal" as never);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* ── Header: minimal — just a back button ──────────────── */}
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              resetScan();
              router.back();
            }}
            hitSlop={16}
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={handleAdjust}
            hitSlop={16}
            style={styles.adjustLink}
          >
            <TText
              style={[styles.adjustLinkText, { color: theme.colors.primary }]}
            >
              Adjust
            </TText>
          </Pressable>
        </View>

        {/* ── Image (dominant) ─────────────────────────────────── */}
        <View style={styles.imageWrapper}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.foodImage}
              contentFit="cover"
            />
          ) : (
            <View
              style={[
                styles.foodImage,
                styles.imagePlaceholder,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Ionicons
                name="restaurant-outline"
                size={40}
                color={theme.colors.textMuted}
              />
            </View>
          )}
        </View>

        {/* ── Meal name + confidence label ─────────────────────── */}
        <View style={styles.nameRow}>
          <TText
            style={[styles.mealTitle, { color: theme.colors.text }]}
            numberOfLines={2}
          >
            {draft.title}
          </TText>
          <ConfidenceLabel confidence={confidence} />
        </View>

        {/* ── Macro strip (calories prominent, macros secondary) ── */}
        <View style={styles.macroStrip}>
          <View style={styles.calBlock}>
            <TText style={[styles.calValue, { color: theme.colors.text }]}>
              {Math.round(mealCalories)}
            </TText>
            <TText style={[styles.calUnit, { color: theme.colors.textMuted }]}>
              kcal
            </TText>
          </View>
          <View
            style={[
              styles.macroDivider,
              { backgroundColor: theme.colors.border },
            ]}
          />
          <MacroStat label="P" value={draft.protein} color="#60A5FA" />
          <MacroStat label="C" value={draft.carbs} color="#FBBF24" />
          <MacroStat label="F" value={draft.fat} color="#F87171" />
        </View>

        {/* ── Progress bar: today + this meal ─────────────────── */}
        <View style={styles.progressRow}>
          <View
            style={[
              styles.progressTrack,
              { backgroundColor: theme.colors.border },
            ]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width:
                    `${Math.min(progressValue * 100, 100)}%` as `${number}%`,
                  backgroundColor:
                    progressValue > 1.0 ? theme.colors.error : tintColor,
                },
              ]}
            />
          </View>
          <TText
            style={[styles.progressLabel, { color: theme.colors.textMuted }]}
          >
            {Math.round(todayTotals.calories + mealCalories)} / {calorieBudget}{" "}
            kcal today
          </TText>
        </View>

        <View style={{ flex: 1 }} />

        {/* ── Framing context line (subtle, above CTA) ─────────── */}
        <TText
          style={[
            styles.framingSubtitle,
            { color: theme.colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          {framing.subtitle}
        </TText>

        {/* ── Primary CTA ──────────────────────────────────────── */}
        <Animated.View
          style={[styles.confirmWrapper, { transform: [{ scale: scaleAnim }] }]}
        >
          <Pressable
            onPress={handlePrimary}
            disabled={confirming}
            style={[styles.confirmBtn, { backgroundColor: primaryColor }]}
          >
            {confirming ? (
              <Ionicons name="checkmark" size={22} color="#fff" />
            ) : (
              <TText style={styles.confirmBtnText}>{primaryLabel}</TText>
            )}
          </Pressable>
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </SafeAreaView>
    </View>
  );
}

// ─── Macro stat (compact inline) ─────────────────────────────────────────────

function MacroStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.macroStat}>
      <TText style={[styles.macroStatValue, { color }]}>
        {Math.round(value)}g
      </TText>
      <TText style={[styles.macroStatLabel, { color: theme.colors.textMuted }]}>
        {label}
      </TText>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  centeredEmpty: { flex: 1, alignItems: "center", justifyContent: "center" },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  adjustLink: { paddingVertical: 4, paddingLeft: 12 },
  adjustLinkText: { fontSize: 15, fontWeight: "600" },
  // Image
  imageWrapper: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  foodImage: {
    width: "100%",
    height: 180,
    borderRadius: 16,
    overflow: "hidden",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Name
  nameRow: {
    paddingHorizontal: 20,
    marginBottom: 4,
    gap: 2,
  },
  mealTitle: {
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 28,
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  // Macro strip
  macroStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 10,
    gap: 12,
  },
  calBlock: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  calValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  calUnit: {
    fontSize: 13,
    fontWeight: "500",
  },
  macroDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 2,
  },
  macroStat: {
    alignItems: "center",
    flex: 1,
  },
  macroStatValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  macroStatLabel: {
    fontSize: 11,
  },
  // Progress
  progressRow: {
    paddingHorizontal: 20,
    marginTop: 14,
    gap: 5,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 5,
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    textAlign: "right",
  },
  // Framing
  framingSubtitle: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  // CTA
  confirmWrapper: {
    paddingHorizontal: 20,
  },
  confirmBtn: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  bottomSpacer: { height: 8 },
});
