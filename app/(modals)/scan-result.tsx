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
  const isMounted = useRef(true);

  // Stop animations and mark unmounted to prevent state updates on dead component
  React.useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      scaleAnim.stopAnimation();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (confirming || !isMounted.current) return;
    setConfirming(true);

    // Button micro-bounce — fire-and-forget, safe with useNativeDriver
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
    ]).start(() => {
      // Callback fires after animation; guard against unmount during bounce
      if (!isMounted.current) return;
      saveDraftWithoutNav();
      recordFirstMeal();
      resetScan();
      toast.show(`${mealCalories} kcal logged`, "success");
      navigateAfterSave();
    });
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
        {/* ── Header ───────────────────────────────────────────────── */}
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

        {/* ── Image ────────────────────────────────────────────────── */}
        {imageUri ? (
          <View style={styles.imageWrapper}>
            <Image
              source={{ uri: imageUri }}
              style={styles.foodImage}
              contentFit="cover"
            />
          </View>
        ) : (
          <View style={styles.imageWrapper}>
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
          </View>
        )}

        {/* ── Title + confidence ────────────────────────────────────── */}
        <View style={styles.titleRow}>
          <TText
            style={[styles.mealTitle, { color: theme.colors.text }]}
            numberOfLines={2}
          >
            {draft.title}
          </TText>
          <ConfidenceLabel confidence={confidence} />
        </View>

        {/* ── Main card (matches confirm-meal design) ───────────────── */}
        <View
          style={[
            styles.mainCard,
            { backgroundColor: theme.colors.surfaceSecondary },
          ]}
        >
          {/* Calories row */}
          <View style={styles.heroRow}>
            <TText style={[styles.heroCalories, { color: theme.colors.text }]}>
              {Math.round(mealCalories)}
            </TText>
            <TText style={[styles.heroUnit, { color: theme.colors.textMuted }]}>
              kcal
            </TText>
            <View style={{ flex: 1 }} />
          </View>

          {/* Progress pill */}
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
            <View style={styles.progressLabelContainer}>
              <TText style={styles.progressLabel}>
                {Math.round(todayTotals.calories + mealCalories)} /{" "}
                {calorieBudget} kcal today
              </TText>
            </View>
          </View>

          {/* Food item row */}
          <View style={styles.foodRow}>
            <TText style={styles.foodEmoji}>{draft.emoji ?? "🍽️"}</TText>
            <TText
              style={[styles.foodName, { color: theme.colors.text }]}
              numberOfLines={2}
            >
              {draft.title}
            </TText>
          </View>

          {/* Macro pills */}
          <View style={styles.macroPills}>
            <MacroPill
              label="P"
              value={draft.protein}
              color="#60A5FA"
              bg={theme.colors.border}
            />
            <MacroPill
              label="C"
              value={draft.carbs}
              color="#FBBF24"
              bg={theme.colors.border}
            />
            <MacroPill
              label="F"
              value={draft.fat}
              color="#F87171"
              bg={theme.colors.border}
            />
          </View>

          {/* Primary CTA */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
              onPress={handlePrimary}
              disabled={confirming}
              style={[
                styles.trackBtn,
                { backgroundColor: isLowConfidence ? primaryColor : "#FFFFFF" },
              ]}
            >
              {confirming ? (
                <Ionicons
                  name="checkmark"
                  size={22}
                  color={isLowConfidence ? "#fff" : "#1C1C1E"}
                />
              ) : (
                <TText
                  style={[
                    styles.trackBtnText,
                    { color: isLowConfidence ? "#fff" : "#1C1C1E" },
                  ]}
                >
                  {primaryLabel}
                </TText>
              )}
            </Pressable>
          </Animated.View>
        </View>

        <View style={{ flex: 1 }} />

        {/* Framing hint */}
        <TText
          style={[
            styles.framingSubtitle,
            { color: theme.colors.textSecondary },
          ]}
          numberOfLines={1}
        >
          {framing.subtitle}
        </TText>

        <View style={styles.bottomSpacer} />
      </SafeAreaView>
    </View>
  );
}

// ─── Macro pill (compact chip) ───────────────────────────────────────────────

function MacroPill({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: number;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.macroPill, { backgroundColor: bg }]}>
      <TText style={[styles.macroPillValue, { color }]}>
        {Math.round(value)}g
      </TText>
      <TText style={styles.macroPillLabel}>{label}</TText>
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
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
  },
  imagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Title
  titleRow: {
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 3,
  },
  mealTitle: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  confidenceLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  // Main card (matches confirm-meal mainCard)
  mainCard: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    gap: 12,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  heroCalories: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heroUnit: {
    fontSize: 15,
    fontWeight: "500",
  },
  // Progress pill (matches confirm-meal progressTrack)
  progressTrack: {
    height: 40,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
  },
  progressFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 12,
  },
  progressLabelContainer: {
    paddingHorizontal: 14,
  },
  progressLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Food item row
  foodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  foodEmoji: {
    fontSize: 28,
  },
  foodName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 20,
  },
  // Macro pills
  macroPills: {
    flexDirection: "row",
    gap: 8,
  },
  macroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  macroPillValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  macroPillLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#888",
  },
  // Track button (matches confirm-meal trackBtn)
  trackBtn: {
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  trackBtnText: {
    fontSize: 17,
    fontWeight: "700",
  },
  // Framing hint
  framingSubtitle: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 10,
  },
  bottomSpacer: { height: 8 },
});
