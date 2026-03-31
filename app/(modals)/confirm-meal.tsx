/**
 * Meal Confirmation Screen
 *
 * Bridge between food capture (voice/manual/camera) and nutrition store.
 * Shows the detected/entered food items with editable calories & macros.
 * User confirms → draft is saved as a real MealEntry to nutritionStore.
 *
 * Reads meal data from the draft store (set by logging flow hook).
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    getLastScanEventId,
    markScanConfirmed,
    recordScanEvent,
    submitScanCorrection,
    type ScanSource,
} from "../../src/features/feedback/scan-feedback.service";

import { useNutritionDraftStore } from "../../src/features/nutrition/nutrition.draft.store";

import {
    detectMealTime,
    type MealTime,
} from "../../src/features/nutrition/mealtime";
import {
    captureOriginalEstimate,
    clearOriginalEstimate,
    trackCorrection,
} from "../../src/features/nutrition/memory/correction-tracker";
import { displayName } from "../../src/features/nutrition/nutrition-pipeline";
import { getMealsForDate } from "../../src/features/nutrition/nutrition.selectors";
import { useLoggingFlow } from "../../src/features/nutrition/use-logging-flow";
import {
    useRetentionEngine,
    useRetentionStore,
} from "../../src/features/retention";
import {
    ShareMilestoneModal,
    useShareMilestone,
} from "../../src/features/share";
import { usePaywallTrigger } from "../../src/features/subscription/usePaywallTrigger";
import { useGoalsStore, useNutritionStore } from "../../src/stores";
import { useTheme } from "../../src/theme/useTheme";
import { PostLogCelebration } from "../../src/ui/components/PostLogCelebration";
import { ReportFoodSheet } from "../../src/ui/feedback/ReportFoodSheet";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { useBottomSheet } from "../../src/ui/sheets/useBottomSheet";

export default function ConfirmMealScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const {
    draft,
    updateDraft,
    saveDraftAsMeal,
    saveDraftWithoutNav,
    navigateAfterSave,
    clearDraft,
  } = useLoggingFlow();
  const logDate = useNutritionDraftStore((s) => s.logDate);
  const setLogDate = useNutritionDraftStore((s) => s.setLogDate);
  const { open: openSheet } = useBottomSheet();

  // Share milestone system
  const shareMilestone = useShareMilestone();
  const recordFirstMeal = useRetentionStore((s) => s.recordFirstMeal);
  const retention = useRetentionEngine();
  const paywallTrigger = usePaywallTrigger();

  // Post-log celebration state
  const [celebration, setCelebration] = useState<{
    message: string;
    sub: string;
    emoji: string;
  } | null>(null);

  // Calorie budget & today's consumed
  const calorieBudget = useGoalsStore((s) => s.plan?.calorieBudget ?? 2000);
  const allMeals = useNutritionStore((s) => s.meals);
  const targetDate = logDate ?? new Date().toISOString().slice(0, 10);
  const consumedToday = getMealsForDate(allMeals, targetDate).reduce(
    (sum, m) => sum + m.calories,
    0
  );

  // More menu visibility
  const [showMenu, setShowMenu] = useState(false);

  // Track scan event ID for linking reports/corrections
  const scanEventIdRef = useRef<string | null>(null);

  // Initialize mealtime from draft or auto-detect
  const [mealTime] = useState<MealTime>(
    () => draft?.mealTime ?? detectMealTime()
  );

  // Sync mealTime changes back to draft
  useEffect(() => {
    if (draft && !draft.mealTime) {
      updateDraft({ mealTime: mealTime });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Capture the pipeline's original estimate when screen loads
  // and record a scan event for the feedback loop
  const hasCaptured = useRef(false);
  useEffect(() => {
    if (draft && !hasCaptured.current) {
      captureOriginalEstimate(draft);
      hasCaptured.current = true;

      // Fire-and-forget: record this scan for the feedback loop
      recordScanEvent({
        source: (draft.source ?? "text") as ScanSource,
        rawInput: draft.rawInput,
        matchedResult: draft.estimatedItems?.[0]
          ? {
              matchedName: draft.estimatedItems[0].matchedName,
              matchSource: draft.estimatedItems[0].matchSource,
              matchId: draft.estimatedItems[0].matchId,
            }
          : undefined,
        finalFoodName: draft.title,
        finalCalories: draft.calories,
        finalProtein: draft.protein,
        finalCarbs: draft.carbs,
        finalFat: draft.fat,
        confidence: draft.confidence,
      }).then((id) => {
        scanEventIdRef.current = id;
      });
    }
    return () => {
      // If user dismisses without confirming, clear the snapshot
      if (hasCaptured.current) clearOriginalEstimate();
    };
  }, [draft]);

  const handleConfirm = useCallback(() => {
    // Track any corrections before saving
    const correction = draft ? trackCorrection(draft) : null;

    // Persist confirmation + corrections to Supabase (fire-and-forget)
    const eventId = scanEventIdRef.current ?? getLastScanEventId();
    if (eventId) {
      markScanConfirmed(eventId, correction?.wasEdited ?? false, {
        foodName: draft?.title ?? "",
        calories: draft?.calories ?? 0,
        protein: draft?.protein ?? 0,
        carbs: draft?.carbs ?? 0,
        fat: draft?.fat ?? 0,
      });

      // If user edited values, store the correction as ground truth
      if (correction?.wasEdited) {
        submitScanCorrection({
          scanEventId: eventId,
          originalFoodName: correction.original.title,
          originalMacros: {
            calories: correction.original.calories,
            protein: correction.original.protein,
            carbs: correction.original.carbs,
            fat: correction.original.fat,
          },
          correctedFoodName: correction.confirmed.title,
          correctedMacros: {
            calories: correction.confirmed.calories,
            protein: correction.confirmed.protein,
            carbs: correction.confirmed.carbs,
            fat: correction.confirmed.fat,
          },
        });
      }
    }

    saveDraftWithoutNav();

    // Record first meal for retention engine
    recordFirstMeal();

    // Get after-log celebration content from the day journey
    const afterLog = retention.getAfterLogContent();
    setCelebration({
      message: afterLog.message,
      sub: afterLog.sub,
      emoji: afterLog.emoji,
    });
  }, [saveDraftWithoutNav, draft, retention]);

  /** Called when the celebration overlay dismisses (auto or tap) */
  const handleCelebrationDismiss = useCallback(() => {
    setCelebration(null);

    // Check for share milestone then navigate
    setTimeout(() => {
      const triggered = shareMilestone.check();
      if (!triggered) {
        navigateAfterSave();
      }
    }, 50);
  }, [shareMilestone, navigateAfterSave]);

  /** Open the Report Food bottom sheet */
  const handleReportFood = useCallback(() => {
    setShowMenu(false);
    openSheet(
      <ReportFoodSheet
        scanEventId={scanEventIdRef.current ?? undefined}
        foodName={draft?.title}
      />,
      { snapPoints: ["65%"] }
    );
  }, [openSheet, draft?.title]);

  /** Delete food and dismiss */
  const handleDeleteFood = useCallback(() => {
    setShowMenu(false);
    clearDraft();
    router.dismiss();
  }, [clearDraft, router]);

  /**
   * Remove a single item and recalculate totals.
   */
  const handleItemRemove = useCallback(
    (index: number) => {
      if (!draft?.estimatedItems) return;

      const updatedItems = draft.estimatedItems.filter((_, i) => i !== index);

      const totals = updatedItems.reduce(
        (acc, item) => ({
          calories: acc.calories + item.nutrients.calories,
          protein: Math.round((acc.protein + item.nutrients.protein) * 10) / 10,
          carbs: Math.round((acc.carbs + item.nutrients.carbs) * 10) / 10,
          fat: Math.round((acc.fat + item.nutrients.fat) * 10) / 10,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      // Update title
      const title =
        updatedItems.length > 0
          ? updatedItems
              .map((i) => {
                const qty =
                  (i.parsed?.quantity ?? 1) !== 1
                    ? `${i.parsed?.quantity} `
                    : "";
                return `${qty}${displayName(i)}`;
              })
              .join(", ")
          : draft.title;

      updateDraft({
        estimatedItems: updatedItems,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        title,
      });
    },
    [draft?.estimatedItems, draft?.title, updateDraft]
  );

  if (!draft) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.emptyState}>
            <TText
              variant="heading"
              style={[styles.emptyTitle, { color: theme.colors.text }]}
            >
              No draft meal found
            </TText>
            <TSpacer size="md" />
            <Pressable
              onPress={() => router.dismiss()}
              style={[
                styles.emptyBtn,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <TText
                style={[styles.emptyBtnText, { color: theme.colors.primary }]}
              >
                Go Back
              </TText>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Safety guard: camera drafts with all zeros indicate analysis didn't complete
  const isEmptyCameraDraft =
    draft.source === "camera" &&
    draft.calories === 0 &&
    draft.protein === 0 &&
    draft.carbs === 0 &&
    draft.fat === 0 &&
    !draft.estimatedItems?.length &&
    !draft.imageAnalysis;

  if (isEmptyCameraDraft) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          <View style={styles.emptyState}>
            <TText
              variant="heading"
              style={[styles.emptyTitle, { color: theme.colors.text }]}
            >
              Analysis incomplete
            </TText>
            <TSpacer size="sm" />
            <TText
              style={[
                {
                  fontSize: 14,
                  textAlign: "center",
                  color: theme.colors.textMuted,
                },
              ]}
            >
              The image analysis didn{"'"}t produce results. Try again or log
              manually.
            </TText>
            <TSpacer size="md" />
            <Pressable
              onPress={() => {
                clearDraft();
                router.dismiss();
              }}
              style={[
                styles.emptyBtn,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <TText
                style={[styles.emptyBtnText, { color: theme.colors.primary }]}
              >
                Go Back
              </TText>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const hasItems = draft.estimatedItems && draft.estimatedItems.length > 0;

  // ── No database match guard ──────────────────────────────────────────────
  // When every item is a generic fallback (matchId "unknown"), the nutrition
  // data is meaningless — show a simple retry screen instead.
  const allItemsUnmatched =
    hasItems && draft.estimatedItems!.every((i) => i.matchId === "unknown");

  if (allItemsUnmatched) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              onPress={() => {
                clearDraft();
                router.dismiss();
              }}
              hitSlop={12}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={theme.colors.text}
              />
            </Pressable>
            <TText
              variant="heading"
              style={[styles.headerTitle, { color: theme.colors.text }]}
            >
              No Match
            </TText>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.emptyState}>
            <View
              style={[
                styles.noMatchIcon,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={40}
                color={theme.colors.textMuted}
              />
            </View>
            <TSpacer size="md" />

            <TText
              variant="heading"
              style={[styles.emptyTitle, { color: theme.colors.text }]}
            >
              No match found
            </TText>
            <TSpacer size="sm" />

            <TText
              style={{
                fontSize: 15,
                textAlign: "center",
                color: theme.colors.textMuted,
                lineHeight: 22,
                paddingHorizontal: 16,
              }}
            >
              We couldn{"'"}t find{" "}
              <TText style={{ fontWeight: "600", color: theme.colors.text }}>
                {"\u201C"}
                {draft.rawInput || draft.title}
                {"\u201D"}
              </TText>{" "}
              in our database. Try again or type it in.
            </TText>

            <TSpacer size="lg" />

            {/* Retry (voice) */}
            <Pressable
              onPress={() => {
                clearDraft();
                router.dismiss();
                setTimeout(() => {
                  router.push("/(modals)/voice-log" as any);
                }, 100);
              }}
              style={[
                styles.noMatchBtn,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="mic-outline"
                size={20}
                color={theme.colors.primary}
              />
              <TText
                style={[styles.noMatchBtnText, { color: theme.colors.primary }]}
              >
                Try Again with Voice
              </TText>
            </Pressable>

            <TSpacer size="sm" />

            {/* Type it in */}
            <Pressable
              onPress={() => {
                clearDraft();
                router.dismiss();
                setTimeout(() => {
                  router.push("/(modals)/manual-log" as any);
                }, 100);
              }}
              style={[
                styles.noMatchBtn,
                {
                  backgroundColor: theme.colors.primary,
                },
              ]}
            >
              <Ionicons name="create-outline" size={20} color="#FFF" />
              <TText style={[styles.noMatchBtnText, { color: "#FFF" }]}>
                Type It In
              </TText>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // Progress bar computation
  const projectedTotal = consumedToday + draft.calories;
  const progressPct = Math.min((projectedTotal / calorieBudget) * 100, 100);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Header: Guide pill + X close */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <Pressable
            onPress={handleReportFood}
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
            <TText style={[styles.guideLabel, { color: theme.colors.primary }]}>
              Guide
            </TText>
          </Pressable>
          <Pressable
            onPress={() => {
              clearDraft();
              router.dismiss();
            }}
            hitSlop={12}
          >
            <Ionicons name="close" size={24} color={theme.colors.textMuted} />
          </Pressable>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Food title */}
          <Animated.View entering={FadeIn.duration(400).delay(50)}>
            <TText
              variant="heading"
              style={[styles.foodTitle, { color: theme.colors.text }]}
              numberOfLines={2}
            >
              {draft.title}
            </TText>
          </Animated.View>

          {/* Date chip — shown when logging for a non-today date */}
          {logDate && (
            <Animated.View entering={FadeIn.duration(300).delay(100)}>
              <Pressable
                onPress={() => setLogDate(null)}
                style={[
                  styles.dateChip,
                  { backgroundColor: theme.colors.primary + "1A" },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={theme.colors.primary}
                />
                <TText
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: theme.colors.primary,
                  }}
                >
                  {new Date(logDate + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </TText>
                <Ionicons
                  name="close-circle"
                  size={14}
                  color={theme.colors.primary}
                />
              </Pressable>
            </Animated.View>
          )}

          <TSpacer size="md" />

          {/* Main card */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={[
              styles.mainCard,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            {/* Hero calories + info */}
            <View style={styles.heroRow}>
              <TText
                style={[styles.heroCalories, { color: theme.colors.text }]}
              >
                {draft.calories} kcal
              </TText>
              <Pressable
                onPress={() => setShowMenu(true)}
                hitSlop={12}
                style={[
                  styles.infoBtn,
                  { backgroundColor: theme.colors.border + "80" },
                ]}
              >
                <Ionicons
                  name="help"
                  size={14}
                  color={theme.colors.textMuted}
                />
              </Pressable>
            </View>

            {/* More menu (dropdown) */}
            <Modal
              visible={showMenu}
              transparent
              animationType="fade"
              onRequestClose={() => setShowMenu(false)}
            >
              <Pressable
                style={styles.menuOverlay}
                onPress={() => setShowMenu(false)}
              >
                <View
                  style={[
                    styles.menuDropdown,
                    {
                      backgroundColor: theme.colors.surface,
                      shadowColor: "#000",
                    },
                  ]}
                >
                  <Pressable style={styles.menuItem} onPress={handleReportFood}>
                    <Ionicons
                      name="flag-outline"
                      size={18}
                      color={theme.colors.text}
                    />
                    <TText
                      style={[
                        styles.menuItemText,
                        { color: theme.colors.text },
                      ]}
                    >
                      Report Food
                    </TText>
                  </Pressable>
                  <View
                    style={[
                      styles.menuDivider,
                      { backgroundColor: theme.colors.border },
                    ]}
                  />
                  <Pressable style={styles.menuItem} onPress={handleDeleteFood}>
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={theme.colors.error}
                    />
                    <TText
                      style={[
                        styles.menuItemText,
                        { color: theme.colors.error },
                      ]}
                    >
                      Delete Food
                    </TText>
                  </Pressable>
                </View>
              </Pressable>
            </Modal>

            <TSpacer size="md" />

            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: theme.colors.border + "40" },
                ]}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${progressPct}%` }]}
                />
                <View style={styles.progressLabelContainer}>
                  <TText style={styles.progressLabel}>
                    {projectedTotal} / {calorieBudget} kcal
                  </TText>
                </View>
              </View>
            </View>

            <TSpacer size="lg" />

            {/* Food items */}
            {hasItems ? (
              draft.estimatedItems!.map((item, index) => (
                <View
                  key={`${item.parsed?.name ?? item.matchedName ?? "item"}-${index}`}
                  style={styles.foodItemSection}
                >
                  <View style={styles.foodItemRow}>
                    <TText style={styles.foodItemEmoji}>
                      {item.emoji ?? draft.emoji ?? "🍽️"}
                    </TText>
                    <View style={styles.foodItemInfo}>
                      <TText
                        style={[
                          styles.foodItemName,
                          { color: theme.colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {item.matchedName ?? displayName(item)}
                      </TText>
                    </View>
                    {draft.estimatedItems!.length > 1 && (
                      <Pressable
                        onPress={() => handleItemRemove(index)}
                        hitSlop={8}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={theme.colors.textMuted}
                        />
                      </Pressable>
                    )}
                    {draft.estimatedItems!.length === 1 && (
                      <Pressable onPress={handleDeleteFood} hitSlop={8}>
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={theme.colors.textMuted}
                        />
                      </Pressable>
                    )}
                  </View>

                  {/* Editable pills */}
                  <View style={styles.pillRow}>
                    <View
                      style={[
                        styles.pill,
                        { backgroundColor: theme.colors.background },
                      ]}
                    >
                      <TText
                        style={[
                          styles.pillText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {(item.parsed?.quantity ?? 1) !== 1
                          ? `${item.parsed?.quantity} × `
                          : ""}
                        {item.parsed?.unit ?? "serving"}
                      </TText>
                      <Ionicons
                        name="pencil"
                        size={12}
                        color={theme.colors.textMuted}
                      />
                    </View>
                    <View
                      style={[
                        styles.pill,
                        { backgroundColor: theme.colors.background },
                      ]}
                    >
                      <TText
                        style={[
                          styles.pillText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {item.nutrients.calories} kcal
                      </TText>
                      <Ionicons
                        name="pencil"
                        size={12}
                        color={theme.colors.textMuted}
                      />
                    </View>
                  </View>

                  {index < draft.estimatedItems!.length - 1 && (
                    <View
                      style={[
                        styles.itemDivider,
                        { backgroundColor: theme.colors.border + "40" },
                      ]}
                    />
                  )}
                </View>
              ))
            ) : (
              /* Single item (no pipeline items) */
              <View style={styles.foodItemSection}>
                <View style={styles.foodItemRow}>
                  <TText style={styles.foodItemEmoji}>
                    {draft.emoji ?? "🍽️"}
                  </TText>
                  <View style={styles.foodItemInfo}>
                    <TText
                      style={[
                        styles.foodItemName,
                        { color: theme.colors.text },
                      ]}
                      numberOfLines={1}
                    >
                      {draft.title}
                    </TText>
                  </View>
                  <Pressable onPress={handleDeleteFood} hitSlop={8}>
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={theme.colors.textMuted}
                    />
                  </Pressable>
                </View>
                <View style={styles.pillRow}>
                  <View
                    style={[
                      styles.pill,
                      { backgroundColor: theme.colors.background },
                    ]}
                  >
                    <TText
                      style={[
                        styles.pillText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {draft.calories} kcal
                    </TText>
                    <Ionicons
                      name="pencil"
                      size={12}
                      color={theme.colors.textMuted}
                    />
                  </View>
                </View>
              </View>
            )}

            <TSpacer size="lg" />

            {/* Track Calories button */}
            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.trackBtn,
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <TText style={styles.trackBtnText}>Track Calories</TText>
            </Pressable>
          </Animated.View>

          <TSpacer size="lg" />

          {/* Hint text */}
          <Animated.View entering={FadeIn.duration(400).delay(200)}>
            <TText style={[styles.hintText, { color: theme.colors.text }]}>
              Need to adjust calories? Just ask!
            </TText>
          </Animated.View>

          <TSpacer size="xxl" />
        </ScrollView>

        {/* Bottom input bar */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(300)}
          style={styles.inputMethods}
        >
          <View style={styles.methodRow}>
            <Pressable
              onPress={() => {
                clearDraft();
                router.dismiss();
                setTimeout(() => {
                  router.push("/tracking/manual" as any);
                }, 100);
              }}
              style={[
                styles.methodBtn,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="keypad-outline"
                size={24}
                color={theme.colors.text}
              />
            </Pressable>

            <Pressable
              onPress={() => {
                clearDraft();
                router.dismiss();
                setTimeout(() => {
                  router.push("/(modals)/voice-log" as any);
                }, 100);
              }}
              style={styles.micBtn}
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

            <Pressable
              onPress={() => {
                clearDraft();
                router.dismiss();
                setTimeout(() => {
                  router.push("/tracking/camera" as any);
                }, 100);
              }}
              style={[
                styles.methodBtn,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="camera-outline"
                size={24}
                color={theme.colors.text}
              />
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>

      {/* Share milestone celebration modal */}
      {shareMilestone.milestone && (
        <ShareMilestoneModal
          visible={shareMilestone.visible}
          milestone={shareMilestone.milestone}
          day={shareMilestone.day}
          streak={shareMilestone.streak}
          mealsLogged={shareMilestone.mealsLogged}
          challengeDays={shareMilestone.challengeDays}
          onClose={() => {
            shareMilestone.dismiss();
            navigateAfterSave();
          }}
        />
      )}

      {/* Post-log celebration overlay (auto-dismisses after 2.5s) */}
      <PostLogCelebration
        visible={!!celebration}
        message={celebration?.message ?? ""}
        sub={celebration?.sub ?? ""}
        emoji={celebration?.emoji ?? ""}
        onDismiss={handleCelebrationDismiss}
      />
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
  guidePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  guideLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  foodTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  dateChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 8,
  },
  // ── Main card ──
  mainCard: {
    borderRadius: 20,
    padding: 20,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  heroCalories: {
    fontSize: 36,
    fontWeight: "800",
  },
  infoBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Progress bar ──
  progressContainer: {
    width: "100%",
  },
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
  // ── Food item ──
  foodItemSection: {
    gap: 10,
  },
  foodItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  foodItemEmoji: {
    fontSize: 28,
  },
  foodItemInfo: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 15,
    fontWeight: "600",
  },
  // ── Editable pills ──
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  pillText: {
    fontSize: 13,
    fontWeight: "500",
  },
  itemDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
  // ── Track button ──
  trackBtn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  trackBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  // ── Hint ──
  hintText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  // ── Bottom input bar ──
  inputMethods: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  methodBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
  // ── Menu ──
  menuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: 20,
  },
  menuDropdown: {
    borderRadius: 14,
    paddingVertical: 6,
    minWidth: 180,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: "500",
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
  // ── Empty / error states ──
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  emptyBtn: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  emptyBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  noMatchIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  noMatchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
  },
  noMatchBtnText: {
    fontSize: 16,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
});
