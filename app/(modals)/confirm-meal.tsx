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
import {
    Modal,
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
import {
    getLastScanEventId,
    markScanConfirmed,
    recordScanEvent,
    submitScanCorrection,
    type ScanSource,
} from "../../src/features/feedback/scan-feedback.service";
import { calculatePortionNutrients } from "../../src/features/image-analysis";
import type {
    ImageAnalysisResult,
    PortionOption,
} from "../../src/features/image-analysis/types";
import {
    CONFIDENCE_HIGH,
    CONFIDENCE_NEEDS_REVIEW,
} from "../../src/features/nutrition/estimation/confidence.service";
import type { EstimatedFoodItem } from "../../src/features/nutrition/estimation/estimation.types";
import {
    MEALTIME_ICONS,
    MEALTIME_LABELS,
    detectMealTime,
    type MealTime,
} from "../../src/features/nutrition/mealtime";
import {
    captureOriginalEstimate,
    clearOriginalEstimate,
    trackCorrection,
} from "../../src/features/nutrition/memory/correction-tracker";
import { displayName } from "../../src/features/nutrition/nutrition-pipeline";
import { useLoggingFlow } from "../../src/features/nutrition/use-logging-flow";
import { useTheme } from "../../src/theme/useTheme";
import { ReportFoodSheet } from "../../src/ui/feedback/ReportFoodSheet";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { useBottomSheet } from "../../src/ui/sheets/useBottomSheet";

export default function ConfirmMealScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { draft, updateDraft, saveDraftAsMeal, clearDraft } = useLoggingFlow();
  const { open: openSheet } = useBottomSheet();

  // More menu visibility
  const [showMenu, setShowMenu] = useState(false);

  // Track scan event ID for linking reports/corrections
  const scanEventIdRef = useRef<string | null>(null);

  // Initialize mealtime from draft or auto-detect
  const [mealTime, setMealTime] = useState<MealTime>(
    () => draft?.mealTime ?? detectMealTime()
  );

  // Sync mealTime changes back to draft
  const handleMealTimeChange = useCallback(
    (mt: MealTime) => {
      setMealTime(mt);
      updateDraft({ mealTime: mt });
    },
    [updateDraft]
  );

  // Set mealTime on draft if not already set
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

    saveDraftAsMeal();
  }, [saveDraftAsMeal, draft]);

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
   * Update a single item's nutrients and recalculate totals.
   */
  const handleItemUpdate = useCallback(
    (
      index: number,
      field: "calories" | "protein" | "carbs" | "fat",
      value: number
    ) => {
      if (!draft?.estimatedItems) return;

      const updatedItems = draft.estimatedItems.map((item, i) => {
        if (i !== index) return item;
        return {
          ...item,
          nutrients: { ...item.nutrients, [field]: value },
        };
      });

      // Recalculate totals from individual items
      const totals = updatedItems.reduce(
        (acc, item) => ({
          calories: acc.calories + item.nutrients.calories,
          protein: Math.round((acc.protein + item.nutrients.protein) * 10) / 10,
          carbs: Math.round((acc.carbs + item.nutrients.carbs) * 10) / 10,
          fat: Math.round((acc.fat + item.nutrients.fat) * 10) / 10,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      updateDraft({
        estimatedItems: updatedItems,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
      });
    },
    [draft?.estimatedItems, updateDraft]
  );

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

  /**
   * Handle portion selection for image analysis (packaged product) drafts.
   */
  const handlePortionSelect = useCallback(
    (option: PortionOption) => {
      const ia = draft?.imageAnalysis;
      if (!ia) return;

      const newNutrients = calculatePortionNutrients(ia.product, option.grams);

      updateDraft({
        calories: newNutrients.calories,
        protein: newNutrients.protein,
        carbs: newNutrients.carbs,
        fat: newNutrients.fat,
        imageAnalysis: {
          ...ia,
          selectedPortion: option,
          nutrients: newNutrients,
        },
      });
    },
    [draft?.imageAnalysis, updateDraft]
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
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            Confirm Meal
          </TText>
          <Pressable onPress={() => setShowMenu(true)} hitSlop={12}>
            <Ionicons
              name="ellipsis-horizontal"
              size={22}
              color={theme.colors.text}
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
                  style={[styles.menuItemText, { color: theme.colors.text }]}
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
                  style={[styles.menuItemText, { color: theme.colors.error }]}
                >
                  Delete Food
                </TText>
              </Pressable>
            </View>
          </Pressable>
        </Modal>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Meal preview card */}
          <Animated.View
            entering={FadeIn.duration(400)}
            style={[
              styles.previewCard,
              {
                backgroundColor: theme.colors.surfaceSecondary,
                shadowColor: theme.colors.primary,
              },
            ]}
          >
            <View
              style={[
                styles.emojiBubble,
                { backgroundColor: theme.colors.primary + "14" },
              ]}
            >
              <TText style={styles.mealIcon}>{draft.emoji ?? "🍽️"}</TText>
            </View>
            <TSpacer size="md" />
            <TextInput
              value={draft.title}
              onChangeText={(t) => updateDraft({ title: t })}
              style={[styles.titleInput, { color: theme.colors.text }]}
              placeholderTextColor={theme.colors.textMuted}
              placeholder="Meal name..."
            />
            <TSpacer size="xs" />
            <View style={styles.sourceRow}>
              <View
                style={[
                  styles.sourcePill,
                  { backgroundColor: theme.colors.primary + "14" },
                ]}
              >
                <Ionicons
                  name={
                    draft.source === "voice"
                      ? "mic"
                      : draft.source === "camera"
                        ? "camera"
                        : "keypad"
                  }
                  size={12}
                  color={theme.colors.primary}
                />
                <TText
                  style={[styles.sourceLabel, { color: theme.colors.primary }]}
                >
                  {draft.source === "voice"
                    ? "Voice"
                    : draft.source === "camera"
                      ? "Camera"
                      : "Manual"}
                </TText>
              </View>

              {/* AI Vision badge when image analysis was used */}
              {draft.source === "camera" && draft.imageAnalysis && (
                <View
                  style={[
                    styles.sourcePill,
                    { backgroundColor: "#8B5CF6" + "14" },
                  ]}
                >
                  <Ionicons name="eye" size={12} color="#8B5CF6" />
                  <TText style={[styles.sourceLabel, { color: "#8B5CF6" }]}>
                    AI Vision
                  </TText>
                </View>
              )}

              {/* Data source summary badge */}
              {draft.estimatedItems && draft.estimatedItems.length > 0 && (
                <View
                  style={[
                    styles.sourcePill,
                    { backgroundColor: "#10B981" + "14" },
                  ]}
                >
                  <Ionicons name="server-outline" size={12} color="#10B981" />
                  <TText style={[styles.sourceLabel, { color: "#10B981" }]}>
                    {getDataSources(draft.estimatedItems)}
                  </TText>
                </View>
              )}
            </View>
            <TSpacer size="sm" />
            {/* Mealtime selector */}
            <View style={styles.mealtimeRow}>
              {(["breakfast", "lunch", "dinner", "snack"] as const).map(
                (mt) => (
                  <Pressable
                    key={mt}
                    onPress={() => handleMealTimeChange(mt)}
                    style={[
                      styles.mealtimePill,
                      {
                        backgroundColor:
                          mealTime === mt
                            ? theme.colors.primary + "22"
                            : theme.colors.surfaceElevated,
                      },
                    ]}
                  >
                    <Ionicons
                      name={MEALTIME_ICONS[mt] as any}
                      size={14}
                      color={
                        mealTime === mt
                          ? theme.colors.primary
                          : theme.colors.textMuted
                      }
                    />
                    <TText
                      style={[
                        styles.mealtimeLabel,
                        {
                          color:
                            mealTime === mt
                              ? theme.colors.primary
                              : theme.colors.textMuted,
                        },
                      ]}
                    >
                      {MEALTIME_LABELS[mt]}
                    </TText>
                  </Pressable>
                )
              )}
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* Confidence indicator — only shown for pipeline drafts */}
          {draft.confidence !== undefined && (
            <Animated.View entering={FadeIn.duration(400).delay(100)}>
              <ConfidenceBadge
                confidence={draft.confidence}
                insight={
                  hasItems
                    ? buildMealInsight(draft.estimatedItems!, draft.confidence)
                    : undefined
                }
              />
              <TSpacer size="md" />
            </Animated.View>
          )}

          {/* Per-item editing — shown when pipeline items are available */}
          {draft.imageAnalysis ? (
            <PackagedProductSection
              analysis={draft.imageAnalysis}
              onPortionSelect={handlePortionSelect}
              calories={draft.calories}
              protein={draft.protein}
              carbs={draft.carbs}
              fat={draft.fat}
            />
          ) : hasItems ? (
            <Animated.View entering={FadeInDown.duration(400).delay(120)}>
              <TText
                style={[
                  styles.sectionLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Items Detected ({draft.estimatedItems!.length})
              </TText>
              <TSpacer size="sm" />

              {draft.estimatedItems!.map((item, index) => (
                <React.Fragment
                  key={`${item.parsed?.name ?? item.matchedName ?? "item"}-${index}`}
                >
                  <EditableFoodItemCard
                    item={item}
                    index={index}
                    onUpdate={handleItemUpdate}
                    onRemove={handleItemRemove}
                    showRemove={draft.estimatedItems!.length > 1}
                  />
                  {index < draft.estimatedItems!.length - 1 && (
                    <TSpacer size="sm" />
                  )}
                </React.Fragment>
              ))}

              <TSpacer size="md" />

              {/* Totals summary */}
              <View
                style={[
                  styles.totalsCard,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <View style={styles.totalsHeader}>
                  <TText
                    style={[
                      styles.totalsLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Meal Total
                  </TText>
                </View>
                <View style={styles.totalsHero}>
                  <TText
                    style={[
                      styles.totalsCaloriesHero,
                      { color: theme.colors.text },
                    ]}
                  >
                    {draft.calories}
                  </TText>
                  <TText
                    style={[
                      styles.totalsCalUnit,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    cal
                  </TText>
                </View>
                <TSpacer size="md" />
                <View style={styles.macroBarRow}>
                  <MacroBar
                    label="Protein"
                    value={draft.protein}
                    unit="g"
                    color="#60A5FA"
                    total={draft.protein + draft.carbs + draft.fat || 1}
                  />
                  <MacroBar
                    label="Carbs"
                    value={draft.carbs}
                    unit="g"
                    color="#FBBF24"
                    total={draft.protein + draft.carbs + draft.fat || 1}
                  />
                  <MacroBar
                    label="Fat"
                    value={draft.fat}
                    unit="g"
                    color="#F87171"
                    total={draft.protein + draft.carbs + draft.fat || 1}
                  />
                </View>
              </View>

              <TSpacer size="sm" />
              {draft.parseMethod && (
                <TText
                  style={[styles.sourceHint, { color: theme.colors.textMuted }]}
                >
                  Parsed with {draft.parseMethod} • matched against{" "}
                  {getDataSources(draft.estimatedItems!)}
                </TText>
              )}
            </Animated.View>
          ) : (
            /* Fallback: totals-only editor (legacy drafts without items) */
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <TText
                style={[
                  styles.sectionLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Nutrition Estimate
              </TText>
              <TSpacer size="sm" />

              <View
                style={[
                  styles.nutritionCard,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <NutrientRow
                  label="Calories"
                  value={draft.calories}
                  unit="cal"
                  color={theme.colors.primary}
                  onChange={(v) => updateDraft({ calories: v })}
                />
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <NutrientRow
                  label="Protein"
                  value={draft.protein}
                  unit="g"
                  color="#60A5FA"
                  onChange={(v) => updateDraft({ protein: v })}
                />
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <NutrientRow
                  label="Carbs"
                  value={draft.carbs}
                  unit="g"
                  color="#FBBF24"
                  onChange={(v) => updateDraft({ carbs: v })}
                />
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <NutrientRow
                  label="Fat"
                  value={draft.fat}
                  unit="g"
                  color="#F87171"
                  onChange={(v) => updateDraft({ fat: v })}
                />
              </View>
            </Animated.View>
          )}

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
                Tap any value to adjust. These are estimates—close enough is
                good enough!
              </TText>
            </View>
          </Animated.View>

          <TSpacer size="xxl" />
        </ScrollView>

        {/* Bottom action bar */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(300)}
          style={styles.bottomAction}
        >
          <View style={styles.bottomActionRow}>
            {/* Fix Issue */}
            <Pressable
              onPress={handleReportFood}
              style={({ pressed }) => [
                styles.fixIssueBtn,
                {
                  borderColor: theme.colors.border,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={theme.colors.text}
              />
              <TText
                style={[styles.fixIssueText, { color: theme.colors.text }]}
              >
                Fix Issue
              </TText>
            </Pressable>

            {/* Confirm & Log */}
            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.confirmBtn,
                styles.confirmBtnFlex,
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
                <TText
                  style={[
                    styles.confirmText,
                    { color: theme.colors.textInverse },
                  ]}
                >
                  Done
                </TText>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ─── Packaged Product Section ──────────────────────────────
function PackagedProductSection({
  analysis,
  onPortionSelect,
  calories,
  protein,
  carbs,
  fat,
}: {
  analysis: ImageAnalysisResult;
  onPortionSelect: (option: PortionOption) => void;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  const { theme } = useTheme();
  const { product, evidence, portionOptions, selectedPortion, alternatives } =
    analysis;

  const routeLabels: Record<string, { label: string; icon: string }> = {
    barcode_lookup: { label: "Barcode", icon: "barcode-outline" },
    packaged_product_search: { label: "Product Match", icon: "search" },
    nutrition_label_direct: { label: "Label Read", icon: "document-text" },
    description_only: { label: "Description", icon: "text" },
    generic_meal_pipeline: { label: "Estimate", icon: "restaurant" },
  };

  const routeInfo = routeLabels[evidence.route] ?? {
    label: evidence.route,
    icon: "help-circle",
  };

  const sourceLabels: Record<string, string> = {
    openfoodfacts: "Open Food Facts",
    usda: "USDA",
    ocr_label: "Label",
    "local-fallback": "Estimate",
  };

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(120)}>
      {/* Product identity */}
      <View
        style={[
          pkgStyles.productCard,
          { backgroundColor: theme.colors.surfaceSecondary },
        ]}
      >
        <View style={pkgStyles.productNameRow}>
          {product.brand && (
            <TText
              style={[pkgStyles.productBrand, { color: theme.colors.primary }]}
            >
              {product.brand}
            </TText>
          )}
          <TText
            style={[pkgStyles.productName, { color: theme.colors.text }]}
            numberOfLines={2}
          >
            {product.name}
          </TText>
        </View>

        <View style={pkgStyles.badgeRow}>
          {/* Source badge */}
          <View
            style={[
              pkgStyles.badge,
              { backgroundColor: theme.colors.primary + "14" },
            ]}
          >
            <Ionicons
              name={routeInfo.icon as any}
              size={12}
              color={theme.colors.primary}
            />
            <TText
              style={[pkgStyles.badgeText, { color: theme.colors.primary }]}
            >
              {routeInfo.label}
            </TText>
          </View>

          {/* Data source badge */}
          <View
            style={[
              pkgStyles.badge,
              { backgroundColor: theme.colors.info + "14" },
            ]}
          >
            <Ionicons
              name="server-outline"
              size={12}
              color={theme.colors.info}
            />
            <TText style={[pkgStyles.badgeText, { color: theme.colors.info }]}>
              {sourceLabels[product.source] ?? product.source}
            </TText>
          </View>

          {/* Match score */}
          <View
            style={[
              pkgStyles.badge,
              {
                backgroundColor:
                  (product.matchScore >= 0.7
                    ? (theme.colors.success ?? "#34D399")
                    : "#FBBF24") + "14",
              },
            ]}
          >
            <TText
              style={[
                pkgStyles.badgeText,
                {
                  color:
                    product.matchScore >= 0.7
                      ? (theme.colors.success ?? "#34D399")
                      : "#FBBF24",
                },
              ]}
            >
              {Math.round(product.matchScore * 100)}% match
            </TText>
          </View>
        </View>

        {/* Match reasons */}
        {product.matchReasons.length > 0 && (
          <TText
            style={[pkgStyles.matchReasons, { color: theme.colors.textMuted }]}
          >
            {product.matchReasons.join(" • ")}
          </TText>
        )}
      </View>

      <TSpacer size="md" />

      {/* Evidence chips — OCR tokens */}
      {evidence.ocrTokens.length > 0 && (
        <>
          <TText
            style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}
          >
            Detected Text
          </TText>
          <TSpacer size="xs" />
          <View style={pkgStyles.chipRow}>
            {evidence.ocrTokens.slice(0, 8).map((token, i) => (
              <View
                key={`${token}-${i}`}
                style={[
                  pkgStyles.chip,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <TText
                  style={[pkgStyles.chipText, { color: theme.colors.text }]}
                >
                  {token}
                </TText>
              </View>
            ))}
          </View>
          <TSpacer size="md" />
        </>
      )}

      {/* Portion selector */}
      <TText
        style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}
      >
        Quantity
      </TText>
      <TSpacer size="xs" />
      <View style={pkgStyles.portionGrid}>
        {portionOptions
          .filter((o) => o.preset !== "custom")
          .map((option) => {
            const isSelected =
              selectedPortion.preset === option.preset &&
              selectedPortion.grams === option.grams;
            return (
              <Pressable
                key={option.preset + option.grams}
                onPress={() => onPortionSelect(option)}
                style={[
                  pkgStyles.portionBtn,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.surfaceSecondary,
                    borderColor: isSelected
                      ? theme.colors.primary
                      : theme.colors.border,
                  },
                ]}
              >
                <TText
                  style={[
                    pkgStyles.portionBtnLabel,
                    {
                      color: isSelected
                        ? theme.colors.textInverse
                        : theme.colors.text,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </TText>
                <TText
                  style={[
                    pkgStyles.portionBtnCal,
                    {
                      color: isSelected
                        ? theme.colors.textInverse + "CC"
                        : theme.colors.textMuted,
                    },
                  ]}
                >
                  {option.calories} cal
                </TText>
              </Pressable>
            );
          })}
      </View>

      <TSpacer size="lg" />

      {/* Hero calories + macro bars */}
      <View
        style={[
          styles.totalsCard,
          { backgroundColor: theme.colors.surfaceSecondary },
        ]}
      >
        <View style={styles.totalsHeader}>
          <TText
            style={[styles.totalsLabel, { color: theme.colors.textSecondary }]}
          >
            {selectedPortion.label}
          </TText>
        </View>
        <View style={styles.totalsHero}>
          <TText
            style={[styles.totalsCaloriesHero, { color: theme.colors.text }]}
          >
            {calories}
          </TText>
          <TText
            style={[styles.totalsCalUnit, { color: theme.colors.textMuted }]}
          >
            cal
          </TText>
        </View>
        <TSpacer size="md" />
        <View style={styles.macroBarRow}>
          <MacroBar
            label="Protein"
            value={protein}
            unit="g"
            color="#60A5FA"
            total={protein + carbs + fat || 1}
          />
          <MacroBar
            label="Carbs"
            value={carbs}
            unit="g"
            color="#FBBF24"
            total={protein + carbs + fat || 1}
          />
          <MacroBar
            label="Fat"
            value={fat}
            unit="g"
            color="#F87171"
            total={protein + carbs + fat || 1}
          />
        </View>
      </View>

      {/* Per-100g context */}
      <TSpacer size="sm" />
      <TText style={[pkgStyles.per100g, { color: theme.colors.textMuted }]}>
        Per 100g: {product.nutrientsPer100g.calories} cal • P{" "}
        {product.nutrientsPer100g.protein}g • C {product.nutrientsPer100g.carbs}
        g • F {product.nutrientsPer100g.fat}g
      </TText>

      {/* Match explanation */}
      {evidence.matchExplanation && (
        <>
          <TSpacer size="sm" />
          <TText
            style={[pkgStyles.explanation, { color: theme.colors.textMuted }]}
          >
            {evidence.matchExplanation}
          </TText>
        </>
      )}

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <>
          <TSpacer size="lg" />
          <TText
            style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}
          >
            Other Matches ({alternatives.length})
          </TText>
          <TSpacer size="xs" />
          {alternatives.slice(0, 3).map((alt, i) => (
            <View
              key={`alt-${i}`}
              style={[
                pkgStyles.altCard,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <View style={pkgStyles.altInfo}>
                {alt.brand && (
                  <TText
                    style={[
                      pkgStyles.altBrand,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {alt.brand}
                  </TText>
                )}
                <TText
                  style={[pkgStyles.altName, { color: theme.colors.text }]}
                  numberOfLines={1}
                >
                  {alt.name}
                </TText>
              </View>
              <TText
                style={[pkgStyles.altCal, { color: theme.colors.textMuted }]}
              >
                {alt.nutrientsPer100g.calories} cal/100g
              </TText>
            </View>
          ))}
        </>
      )}
    </Animated.View>
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

// ─── Confidence Badge ──────────────────────────────────────
function ConfidenceBadge({
  confidence,
  insight,
}: {
  confidence: number;
  insight?: { summary: string; issues: string[]; needsClarification: boolean };
}) {
  const { theme } = useTheme();

  const pct = Math.round(confidence * 100);
  let color: string;
  let icon: "checkmark-circle" | "alert-circle" | "warning";
  let label: string;

  if (confidence >= CONFIDENCE_HIGH) {
    color = theme.colors.success ?? "#34D399";
    icon = "checkmark-circle";
    label = insight?.summary
      ? `${insight.summary} (${pct}%)`
      : `High confidence (${pct}%)`;
  } else if (confidence >= CONFIDENCE_NEEDS_REVIEW) {
    color = "#FBBF24";
    icon = "alert-circle";
    label = insight?.summary
      ? `${insight.summary} (${pct}%)`
      : `Review suggested (${pct}%)`;
  } else {
    color = "#F87171";
    icon = "warning";
    label = insight?.summary
      ? `${insight.summary} (${pct}%)`
      : `Low confidence — please verify (${pct}%)`;
  }

  return (
    <View style={[styles.confidenceBadge, { backgroundColor: color + "18" }]}>
      <Ionicons name={icon} size={16} color={color} />
      <TText style={[styles.confidenceText, { color }]}>{label}</TText>
    </View>
  );
}

// ─── Source Badge ──────────────────────────────────────────
const SOURCE_BADGE_CONFIG: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  dataset: { label: "USDA DB", icon: "server", color: "#10B981" },
  usda: { label: "USDA API", icon: "cloud", color: "#3B82F6" },
  openfoodfacts: { label: "OFF", icon: "globe", color: "#F59E0B" },
  edamam: { label: "Edamam", icon: "nutrition", color: "#8B5CF6" },
  "local-fallback": {
    label: "Local",
    icon: "phone-portrait",
    color: "#6B7280",
  },
  "recipe-template": { label: "Recipe", icon: "book", color: "#EC4899" },
  "personal-history": { label: "History", icon: "time", color: "#14B8A6" },
  branded: { label: "Branded", icon: "pricetag", color: "#F97316" },
};

function SourceBadge({ matchSource }: { matchSource: string }) {
  const { theme } = useTheme();
  const config = SOURCE_BADGE_CONFIG[matchSource] ?? {
    label: matchSource,
    icon: "help-circle",
    color: theme.colors.textMuted,
  };

  return (
    <View
      style={[styles.itemSourceBadge, { backgroundColor: config.color + "14" }]}
    >
      <Ionicons name={config.icon as any} size={10} color={config.color} />
      <TText style={[styles.itemSourceText, { color: config.color }]}>
        {config.label}
      </TText>
    </View>
  );
}

// ─── Editable Food Item Card ───────────────────────────────
function EditableFoodItemCard({
  item,
  index,
  onUpdate,
  onRemove,
  showRemove,
}: {
  item: EstimatedFoodItem;
  index: number;
  onUpdate: (
    index: number,
    field: "calories" | "protein" | "carbs" | "fat",
    value: number
  ) => void;
  onRemove: (index: number) => void;
  showRemove: boolean;
}) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const isLowConfidence = item.confidence < CONFIDENCE_NEEDS_REVIEW;
  const confidencePct = Math.round(item.confidence * 100);

  const confidenceColor =
    item.confidence >= CONFIDENCE_HIGH
      ? (theme.colors.success ?? "#34D399")
      : item.confidence >= CONFIDENCE_NEEDS_REVIEW
        ? "#FBBF24"
        : "#F87171";

  return (
    <View
      style={[
        styles.itemCard,
        {
          backgroundColor: theme.colors.surfaceSecondary,
          borderLeftColor: confidenceColor,
        },
      ]}
    >
      {/* Item header — tap to expand */}
      <Pressable
        onPress={() => setExpanded(!expanded)}
        style={styles.itemCardHeader}
      >
        <View style={styles.itemCardLeft}>
          <TText style={styles.itemEmoji}>{item.emoji ?? "🍽️"}</TText>
          <View style={styles.itemCardInfo}>
            <TText
              style={[styles.foodItemName, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {(item.parsed?.quantity ?? 1) !== 1
                ? `${item.parsed?.quantity} `
                : ""}
              {displayName(item)}
              {item.parsed?.preparation ? ` (${item.parsed.preparation})` : ""}
            </TText>
            <TText
              style={[styles.itemCardSub, { color: theme.colors.textMuted }]}
            >
              {item.insight?.summary
                ? `${item.insight.summary} (${confidencePct}%)`
                : `${confidencePct}% confidence`}{" "}
              • {item.matchedName}
            </TText>
            <View style={styles.sourceBadgeRow}>
              <SourceBadge matchSource={item.matchSource} />
            </View>
          </View>
        </View>
        <View style={styles.itemCardRight}>
          <TText
            style={[styles.foodItemCalories, { color: theme.colors.primary }]}
          >
            {item.nutrients.calories} cal
          </TText>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.colors.textMuted}
          />
        </View>
      </Pressable>

      {/* Ambiguity warning */}
      {isLowConfidence && item.ambiguityReason && (
        <View
          style={[
            styles.itemWarningBanner,
            { backgroundColor: "#FBBF24" + "15" },
          ]}
        >
          <Ionicons name="alert-circle" size={14} color="#FBBF24" />
          <TText style={[styles.itemWarningText, { color: "#FBBF24" }]}>
            {item.ambiguityReason}
          </TText>
        </View>
      )}

      {/* Confidence issues from layered analysis */}
      {item.insight && item.insight.issues.length > 0 && !isLowConfidence && (
        <View
          style={[
            styles.itemWarningBanner,
            { backgroundColor: "#FBBF24" + "10" },
          ]}
        >
          <Ionicons
            name="information-circle-outline"
            size={14}
            color="#FBBF24"
          />
          <TText style={[styles.itemWarningText, { color: "#FBBF24" }]}>
            {item.insight.issues[0]}
          </TText>
        </View>
      )}

      {/* Assumption label (e.g., "Assuming black coffee") */}
      {item.assumptionLabel && (
        <View
          style={[
            styles.itemWarningBanner,
            { backgroundColor: theme.colors.info + "15" },
          ]}
        >
          <Ionicons
            name="information-circle"
            size={14}
            color={theme.colors.info}
          />
          <TText style={[styles.itemWarningText, { color: theme.colors.info }]}>
            {item.assumptionLabel}
          </TText>
        </View>
      )}

      {/* Expanded: per-item nutrient editing */}
      {expanded && (
        <View style={styles.itemCardExpanded}>
          <View
            style={[styles.divider, { backgroundColor: theme.colors.border }]}
          />
          <ItemNutrientRow
            label="Calories"
            value={item.nutrients.calories}
            unit="cal"
            color={theme.colors.primary}
            onChange={(v) => onUpdate(index, "calories", v)}
          />
          <ItemNutrientRow
            label="Protein"
            value={item.nutrients.protein}
            unit="g"
            color="#60A5FA"
            onChange={(v) => onUpdate(index, "protein", v)}
          />
          <ItemNutrientRow
            label="Carbs"
            value={item.nutrients.carbs}
            unit="g"
            color="#FBBF24"
            onChange={(v) => onUpdate(index, "carbs", v)}
          />
          <ItemNutrientRow
            label="Fat"
            value={item.nutrients.fat}
            unit="g"
            color="#F87171"
            onChange={(v) => onUpdate(index, "fat", v)}
          />

          {showRemove && (
            <>
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <Pressable
                onPress={() => onRemove(index)}
                style={styles.removeBtn}
              >
                <Ionicons name="trash-outline" size={16} color="#F87171" />
                <TText style={styles.removeBtnText}>Remove item</TText>
              </Pressable>
            </>
          )}
        </View>
      )}

      {/* Collapsed: compact macro summary */}
      {!expanded && (
        <TText
          style={[styles.itemCardMacros, { color: theme.colors.textMuted }]}
        >
          P {item.nutrients.protein}g • C {item.nutrients.carbs}g • F{" "}
          {item.nutrients.fat}g
        </TText>
      )}
    </View>
  );
}

// ─── Item Nutrient Row (compact editing row) ───────────────
function ItemNutrientRow({
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
      onChange(Math.round(parsed * 10) / 10);
    } else {
      setText(String(value));
    }
    setEditing(false);
  };

  return (
    <View style={styles.itemNutrientRow}>
      <View style={[styles.itemNutrientDot, { backgroundColor: color }]} />
      <TText style={[styles.itemNutrientLabel, { color: theme.colors.text }]}>
        {label}
      </TText>
      <Pressable
        onPress={() => {
          setText(String(value));
          setEditing(true);
        }}
        style={styles.itemNutrientValue}
      >
        {editing ? (
          <TextInput
            value={text}
            onChangeText={setText}
            onEndEditing={handleEndEditing}
            onBlur={handleEndEditing}
            keyboardType="numeric"
            autoFocus
            style={[styles.itemNutrientInput, { color: theme.colors.text }]}
          />
        ) : (
          <TText
            style={[styles.itemNutrientNumber, { color: theme.colors.text }]}
          >
            {value}
          </TText>
        )}
        <TText
          style={[styles.itemNutrientUnit, { color: theme.colors.textMuted }]}
        >
          {unit}
        </TText>
      </Pressable>
    </View>
  );
}

// ─── Helpers ───────────────────────────────────────────────

// ─── Macro Bar (visual breakdown) ──────────────────────────
function MacroBar({
  label,
  value,
  unit,
  color,
  total,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  total: number;
}) {
  const { theme } = useTheme();
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;

  return (
    <View style={styles.macroBarItem}>
      <View style={styles.macroBarLabelRow}>
        <View style={[styles.macroBarDot, { backgroundColor: color }]} />
        <TText
          style={[styles.macroBarLabel, { color: theme.colors.textMuted }]}
        >
          {label}
        </TText>
      </View>
      <TText style={[styles.macroBarValue, { color: theme.colors.text }]}>
        {value}
        <TText style={[styles.macroBarUnit, { color: theme.colors.textMuted }]}>
          {unit}
        </TText>
      </TText>
      <View style={[styles.macroBarTrack, { backgroundColor: color + "20" }]}>
        <View
          style={[
            styles.macroBarFill,
            { backgroundColor: color, width: `${Math.min(pct, 100)}%` },
          ]}
        />
      </View>
    </View>
  );
}

function getDataSources(items: EstimatedFoodItem[]): string {
  const sources = new Set(items.map((i) => i.matchSource));
  const labels: Record<string, string> = {
    usda: "USDA",
    openfoodfacts: "Open Food Facts",
    edamam: "Edamam",
    dataset: "USDA Dataset",
    "local-fallback": "local estimates",
    "recipe-template": "recipes",
    "personal-history": "history",
    branded: "branded",
  };
  return Array.from(sources)
    .map((s) => labels[s] ?? s)
    .join(" & ");
}

function buildMealInsight(
  items: EstimatedFoodItem[],
  overallConfidence: number
): { summary: string; issues: string[]; needsClarification: boolean } {
  // Aggregate issues from all items
  const allIssues: string[] = [];
  let needsClarification = false;

  for (const item of items) {
    if (item.insight) {
      allIssues.push(...item.insight.issues);
      if (item.insight.needsClarification) needsClarification = true;
    }
  }

  // Deduplicate issues
  const uniqueIssues = [...new Set(allIssues)];

  // Build meal-level summary
  const itemNames = items
    .map((i) => {
      const n = displayName(i);
      return n.charAt(0).toUpperCase() + n.slice(1);
    })
    .join(", ");

  let summary: string;
  if (overallConfidence >= 0.75) {
    summary = `${items.length} item${items.length > 1 ? "s" : ""} detected`;
  } else if (uniqueIssues.length > 0) {
    summary = uniqueIssues[0]; // show the most important issue
  } else {
    summary = `${itemNames} — review suggested`;
  }

  return { summary, issues: uniqueIssues, needsClarification };
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
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  emojiBubble: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  mealIcon: {
    fontSize: 36,
  },
  titleInput: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    minWidth: 200,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  sourcePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourceLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  mealtimeRow: {
    flexDirection: "row",
    gap: 6,
  },
  mealtimePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  mealtimeLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
  bottomActionRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  fixIssueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  fixIssueText: {
    fontSize: 14,
    fontWeight: "600",
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
  confirmBtnFlex: {
    flex: 1,
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
  // More menu
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
  // ── No-match screen ──
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
  // ── Confidence badge ──
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  confidenceText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // ── Per-item editable card ──
  itemCard: {
    borderRadius: 14,
    borderLeftWidth: 3,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  itemCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  itemCardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemEmoji: {
    fontSize: 24,
  },
  itemCardInfo: {
    flex: 1,
    gap: 2,
  },
  itemCardSub: {
    fontSize: 11,
    fontWeight: "400",
  },
  sourceBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 3,
  },
  itemSourceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemSourceText: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  itemCardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: 8,
  },
  itemCardExpanded: {
    paddingBottom: 4,
  },
  itemCardMacros: {
    fontSize: 12,
    fontWeight: "400",
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginLeft: 18,
  },
  itemWarningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 12,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  itemWarningText: {
    fontSize: 11,
    fontWeight: "500",
  },
  // ── Item nutrient row (compact) ──
  itemNutrientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 10,
  },
  itemNutrientDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemNutrientLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  itemNutrientValue: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  itemNutrientNumber: {
    fontSize: 16,
    fontWeight: "700",
  },
  itemNutrientInput: {
    fontSize: 16,
    fontWeight: "700",
    minWidth: 44,
    textAlign: "right",
    borderBottomWidth: 1,
    borderBottomColor: "#60A5FA",
    paddingBottom: 2,
  },
  itemNutrientUnit: {
    fontSize: 12,
    fontWeight: "400",
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  removeBtnText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#F87171",
  },
  // ── Totals card ──
  totalsCard: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  totalsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  totalsLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  totalsHero: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 4,
  },
  totalsCaloriesHero: {
    fontSize: 36,
    fontWeight: "800",
  },
  totalsCalUnit: {
    fontSize: 16,
    fontWeight: "500",
  },
  totalsCalories: {
    fontSize: 18,
    fontWeight: "700",
  },
  totalsMacros: {
    fontSize: 12,
    fontWeight: "400",
    marginTop: 4,
  },
  macroBarRow: {
    flexDirection: "row",
    gap: 12,
  },
  macroBarItem: {
    flex: 1,
    gap: 4,
  },
  macroBarLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  macroBarDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroBarLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  macroBarValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  macroBarUnit: {
    fontSize: 12,
    fontWeight: "400",
  },
  macroBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  macroBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  foodItemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  foodItemCalories: {
    fontSize: 15,
    fontWeight: "700",
  },
  sourceHint: {
    fontSize: 11,
    fontWeight: "400",
    textAlign: "center",
  },
});

// ─── Packaged Product Styles ───────────────────────────────
const pkgStyles = StyleSheet.create({
  productCard: {
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  productNameRow: {
    gap: 2,
  },
  productBrand: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 17,
    fontWeight: "600",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  matchReasons: {
    fontSize: 11,
    fontWeight: "400",
    fontStyle: "italic",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  portionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  portionBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    minWidth: "30%",
    alignItems: "center",
  },
  portionBtnLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  portionBtnCal: {
    fontSize: 11,
    fontWeight: "400",
    marginTop: 2,
  },
  per100g: {
    fontSize: 11,
    fontWeight: "400",
    textAlign: "center",
  },
  explanation: {
    fontSize: 11,
    fontWeight: "400",
    textAlign: "center",
    fontStyle: "italic",
  },
  altCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 6,
  },
  altInfo: {
    flex: 1,
    gap: 1,
  },
  altBrand: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  altName: {
    fontSize: 14,
    fontWeight: "500",
  },
  altCal: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 8,
  },
});
