/**
 * Meal Analysis Results Screen
 *
 * Shows AI-decomposed meal components from gpt-4o-mini analysis.
 * Each food item is editable — user can adjust portions, swap items,
 * remove components, or add missing ones before confirming.
 *
 * State machine: analyzing → completed → editing → confirmed
 *
 * Design principles:
 *   - Results appear only when analysis is complete (no partial states)
 *   - Every detected component is editable inline
 *   - Confidence indicators guide user attention to uncertain items
 *   - Confirm button logs the meal and returns home
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import type {
    ConfidenceBand,
    ResolvedFoodItem,
} from "../../src/features/meal-analysis/meal-analysis.types";
import { useMealAnalysis } from "../../src/features/meal-analysis/use-meal-analysis";
import { useTheme } from "../../src/theme/useTheme";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

// ─── Stage Labels ───────────────────────────────────────────────────────────

const ANALYSIS_STAGES = [
  "Uploading photo…",
  "Identifying food components…",
  "Estimating portions…",
  "Looking up nutrition…",
];

// ─── Pulsing Image ──────────────────────────────────────────────────────────

function PulsingImage({ uri }: { uri: string }) {
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 900 }),
        withTiming(1, { duration: 900 })
      ),
      -1,
      true
    );
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <Image
        source={{ uri }}
        style={styles.analyzingImage}
        contentFit="cover"
      />
    </Animated.View>
  );
}

// ─── Confidence Badge ───────────────────────────────────────────────────────

function ConfidenceBadge({ band }: { band: ConfidenceBand }) {
  const color =
    band === "high" ? "#34C759" : band === "medium" ? "#FF9500" : "#FF3B30";
  const label =
    band === "high"
      ? "High confidence"
      : band === "medium"
        ? "Review suggested"
        : "Low confidence";

  return (
    <View style={[styles.confBadge, { backgroundColor: color + "1A" }]}>
      <View style={[styles.confDot, { backgroundColor: color }]} />
      <TText style={[styles.confLabel, { color }]}>{label}</TText>
    </View>
  );
}

// ─── Food Item Card ─────────────────────────────────────────────────────────

function FoodItemCard({
  item,
  index,
  onUpdateGrams,
  onUpdateName,
  onRemove,
  theme,
}: {
  item: ResolvedFoodItem;
  index: number;
  onUpdateGrams: (index: number, grams: number) => void;
  onUpdateName: (index: number, name: string) => void;
  onRemove: (index: number) => void;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const [editingGrams, setEditingGrams] = useState(false);
  const [gramsText, setGramsText] = useState(
    String(item.detected.portion.grams)
  );
  const [editingName, setEditingName] = useState(false);
  const [nameText, setNameText] = useState(item.resolvedName);

  const handleNameSubmit = () => {
    const trimmed = nameText.trim();
    if (trimmed && trimmed !== item.resolvedName) {
      onUpdateName(index, trimmed);
    } else {
      setNameText(item.resolvedName);
    }
    setEditingName(false);
  };

  const handleGramsSubmit = () => {
    const parsed = parseFloat(gramsText);
    if (!isNaN(parsed) && parsed > 0) {
      onUpdateGrams(index, parsed);
    } else {
      setGramsText(String(item.detected.portion.grams));
    }
    setEditingGrams(false);
  };

  const confColor =
    item.confidence.overall >= 0.7
      ? "#34C759"
      : item.confidence.overall >= 0.45
        ? "#FF9500"
        : "#FF3B30";

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(300)}
      style={[
        styles.itemCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: item.needsReview
            ? "#FF9500" + "40"
            : theme.colors.border,
        },
      ]}
    >
      {/* Header: name + remove */}
      <View style={styles.itemHeader}>
        <View style={styles.itemNameRow}>
          <View style={[styles.itemConfDot, { backgroundColor: confColor }]} />
          {editingName ? (
            <TextInput
              value={nameText}
              onChangeText={setNameText}
              onBlur={handleNameSubmit}
              onSubmitEditing={handleNameSubmit}
              autoFocus
              style={[
                styles.nameInput,
                {
                  color: theme.colors.text,
                  borderColor: theme.colors.primary,
                },
              ]}
            />
          ) : (
            <Pressable onPress={() => setEditingName(true)} style={{ flex: 1 }}>
              <TText
                style={[styles.itemName, { color: theme.colors.text }]}
                numberOfLines={2}
              >
                {item.resolvedName}
              </TText>
            </Pressable>
          )}
        </View>
        <Pressable
          onPress={() => onRemove(index)}
          hitSlop={12}
          style={styles.removeBtn}
        >
          <Ionicons
            name="close-circle"
            size={20}
            color={theme.colors.textMuted}
          />
        </Pressable>
      </View>

      {/* Portion row */}
      <View style={styles.portionRow}>
        <Ionicons
          name="scale-outline"
          size={14}
          color={theme.colors.textMuted}
        />
        {editingGrams ? (
          <TextInput
            value={gramsText}
            onChangeText={setGramsText}
            onBlur={handleGramsSubmit}
            onSubmitEditing={handleGramsSubmit}
            keyboardType="numeric"
            autoFocus
            style={[
              styles.gramsInput,
              {
                color: theme.colors.text,
                borderColor: theme.colors.primary,
              },
            ]}
          />
        ) : (
          <Pressable onPress={() => setEditingGrams(true)}>
            <TText
              style={[
                styles.portionText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {item.detected.portion.humanReadable} (
              {item.detected.portion.grams}g)
            </TText>
          </Pressable>
        )}
        <Pressable
          onPress={() => setEditingGrams(true)}
          hitSlop={8}
          style={styles.editPortionBtn}
        >
          <Ionicons name="pencil" size={12} color={theme.colors.primary} />
        </Pressable>
      </View>

      {/* Macros row */}
      <View style={styles.macrosRow}>
        <MacroPill
          label="Cal"
          value={item.nutrients.calories}
          unit=""
          color={theme.colors.primary}
          bgColor={theme.colors.primary + "15"}
        />
        <MacroPill
          label="P"
          value={item.nutrients.protein}
          unit="g"
          color="#FF6B6B"
          bgColor="#FF6B6B15"
        />
        <MacroPill
          label="C"
          value={item.nutrients.carbs}
          unit="g"
          color="#4ECDC4"
          bgColor="#4ECDC415"
        />
        <MacroPill
          label="F"
          value={item.nutrients.fat}
          unit="g"
          color="#FFD93D"
          bgColor="#FFD93D15"
        />
      </View>

      {/* Confidence indicators */}
      {item.needsReview && (
        <View style={styles.reviewRow}>
          <Ionicons name="alert-circle-outline" size={12} color="#FF9500" />
          <TText style={styles.reviewText}>
            {item.reviewReason ?? "Review suggested"}
          </TText>
        </View>
      )}
      <View style={styles.confBreakdownRow}>
        <ConfidenceDot score={item.confidence.detection} label="ID" />
        <ConfidenceDot score={item.confidence.portion} label="Qty" />
        <ConfidenceDot score={item.confidence.nutritionMatch} label="DB" />
      </View>
    </Animated.View>
  );
}

// ─── Confidence Dot (per-dimension) ─────────────────────────────────────────

function ConfidenceDot({ score, label }: { score: number; label: string }) {
  const color =
    score >= 0.7 ? "#34C759" : score >= 0.45 ? "#FF9500" : "#FF3B30";
  return (
    <View style={styles.confDotItem}>
      <View style={[styles.confDotMini, { backgroundColor: color }]} />
      <TText style={[styles.confDotLabel, { color: "#999" }]}>{label}</TText>
    </View>
  );
}

// ─── Macro Pill ─────────────────────────────────────────────────────────────

function MacroPill({
  label,
  value,
  unit,
  color,
  bgColor,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
  bgColor: string;
}) {
  return (
    <View style={[styles.macroPill, { backgroundColor: bgColor }]}>
      <TText style={[styles.macroPillLabel, { color }]}>{label}</TText>
      <TText style={[styles.macroPillValue, { color }]}>
        {Math.round(value)}
        {unit}
      </TText>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function MealAnalysisScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    imageUri: string;
    userHint?: string;
  }>();

  const {
    state,
    result,
    error,
    imageUri,
    analyze,
    updateItem,
    removeItem,
    addItem,
    confirm,
    reset,
    retry,
  } = useMealAnalysis();

  const [stageIndex, setStageIndex] = useState(0);

  // Auto-start analysis when screen mounts
  const hasStarted = useRef(false);
  useEffect(() => {
    if (!hasStarted.current && params.imageUri) {
      hasStarted.current = true;
      analyze(params.imageUri, params.userHint);
    }
  }, [params.imageUri, params.userHint, analyze]);

  // Cycle stage labels
  useEffect(() => {
    if (state !== "uploading" && state !== "analyzing") return;
    setStageIndex(0);
    const interval = setInterval(() => {
      setStageIndex((i) => (i + 1) % ANALYSIS_STAGES.length);
    }, 2200);
    return () => clearInterval(interval);
  }, [state]);

  const handleUpdateGrams = useCallback(
    (index: number, grams: number) => {
      updateItem(index, { grams });
    },
    [updateItem]
  );

  const handleUpdateName = useCallback(
    (index: number, name: string) => {
      updateItem(index, { name });
    },
    [updateItem]
  );

  // ── Add Item State ──
  const [showAddItem, setShowAddItem] = useState(false);
  const [addItemName, setAddItemName] = useState("");
  const [addItemGrams, setAddItemGrams] = useState("");

  const handleAddItemSubmit = useCallback(() => {
    const name = addItemName.trim();
    const grams = parseFloat(addItemGrams);
    if (!name || isNaN(grams) || grams <= 0) return;
    addItem(name, grams);
    setAddItemName("");
    setAddItemGrams("");
    setShowAddItem(false);
  }, [addItemName, addItemGrams, addItem]);

  const handleRemove = useCallback(
    (index: number) => {
      Alert.alert("Remove Item", "Remove this food from the meal?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeItem(index),
        },
      ]);
    },
    [removeItem]
  );

  const handleConfirm = useCallback(() => {
    confirm();
  }, [confirm]);

  const handleBack = useCallback(() => {
    reset();
    router.back();
  }, [reset, router]);

  // ── Analyzing State ──

  if (state === "uploading" || state === "analyzing" || state === "resolving") {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background, paddingTop: insets.top },
        ]}
      >
        <View style={styles.headerWide}>
          <Pressable onPress={handleBack} hitSlop={16} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
          </Pressable>
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            Analyzing
          </TText>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.centeredContent}>
          {params.imageUri && (
            <Animated.View entering={FadeIn.duration(300)}>
              <PulsingImage uri={params.imageUri} />
            </Animated.View>
          )}
          <TSpacer size="xl" />
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <TSpacer size="md" />
          <Animated.View key={stageIndex} entering={FadeIn.duration(300)}>
            <TText
              style={[styles.analyzingText, { color: theme.colors.textMuted }]}
            >
              {ANALYSIS_STAGES[stageIndex]}
            </TText>
          </Animated.View>
          <TSpacer size="xl" />
          <View style={styles.dotsRow}>
            {ANALYSIS_STAGES.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      i <= stageIndex
                        ? theme.colors.primary
                        : theme.colors.border,
                  },
                ]}
              />
            ))}
          </View>
        </View>
      </View>
    );
  }

  // ── Error State ──

  if (state === "error") {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background, paddingTop: insets.top },
        ]}
      >
        <View style={styles.headerWide}>
          <Pressable onPress={handleBack} hitSlop={16} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
          </Pressable>
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            Analysis Failed
          </TText>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.centeredContent}>
          {params.imageUri && (
            <Image
              source={{ uri: params.imageUri }}
              style={styles.errorImage}
              contentFit="cover"
            />
          )}
          <TSpacer size="lg" />
          <Ionicons
            name="alert-circle-outline"
            size={40}
            color={theme.colors.warning ?? "#F59E0B"}
          />
          <TSpacer size="md" />
          <TText style={[styles.errorTitle, { color: theme.colors.text }]}>
            {error || "Something went wrong"}
          </TText>
          <TSpacer size="xl" />
          <View style={styles.errorBtnRow}>
            <Pressable
              onPress={retry}
              style={[
                styles.errorBtn,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
              <TText style={styles.errorBtnText}>Try Again</TText>
            </Pressable>
            <Pressable
              onPress={handleBack}
              style={[
                styles.errorBtn,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons name="camera" size={18} color={theme.colors.text} />
              <TText
                style={[styles.errorBtnText, { color: theme.colors.text }]}
              >
                Retake
              </TText>
            </Pressable>
          </View>
          <TSpacer size="md" />
          <Pressable
            onPress={() => {
              router.back();
              // Navigate to text search flow
              setTimeout(() => {
                router.push("/(tabs)" as never);
              }, 100);
            }}
            style={styles.manualSearchBtn}
          >
            <Ionicons
              name="search-outline"
              size={16}
              color={theme.colors.textSecondary}
            />
            <TText
              style={[
                styles.manualSearchText,
                { color: theme.colors.textSecondary },
              ]}
            >
              Search manually instead
            </TText>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Results State (completed / editing) ──

  if (!result) return null;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <View style={styles.headerWide}>
        <Pressable onPress={handleBack} hitSlop={16} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color={theme.colors.text} />
        </Pressable>
        <TText
          variant="heading"
          style={[styles.headerTitle, { color: theme.colors.text }]}
        >
          Meal Breakdown
        </TText>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Image + summary */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.summarySection}
        >
          {imageUri && (
            <Image
              source={{ uri: imageUri }}
              style={styles.resultImage}
              contentFit="cover"
            />
          )}
          <View style={styles.summaryText}>
            <TText
              style={[styles.mealTitle, { color: theme.colors.text }]}
              numberOfLines={2}
            >
              {result.decomposition.mealSummary}
            </TText>
            <TSpacer size="xs" />
            <ConfidenceBadge band={result.confidenceBand} />
          </View>
        </Animated.View>

        <TSpacer size="md" />

        {/* Totals bar */}
        <Animated.View
          entering={FadeInUp.delay(200).duration(300)}
          style={[styles.totalsBar, { backgroundColor: theme.colors.surface }]}
        >
          <TotalItem
            label="Calories"
            value={result.totals.calories}
            unit=""
            color={theme.colors.primary}
          />
          <View
            style={[
              styles.totalsDivider,
              { backgroundColor: theme.colors.border },
            ]}
          />
          <TotalItem
            label="Protein"
            value={result.totals.protein}
            unit="g"
            color="#FF6B6B"
          />
          <View
            style={[
              styles.totalsDivider,
              { backgroundColor: theme.colors.border },
            ]}
          />
          <TotalItem
            label="Carbs"
            value={result.totals.carbs}
            unit="g"
            color="#4ECDC4"
          />
          <View
            style={[
              styles.totalsDivider,
              { backgroundColor: theme.colors.border },
            ]}
          />
          <TotalItem
            label="Fat"
            value={result.totals.fat}
            unit="g"
            color="#FFD93D"
          />
        </Animated.View>

        <TSpacer size="md" />

        {/* Items header */}
        <View style={styles.sectionHeader}>
          <TText
            style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}
          >
            {result.items.length} item{result.items.length !== 1 ? "s" : ""}{" "}
            detected
          </TText>
          <TText style={[styles.editHint, { color: theme.colors.textMuted }]}>
            Tap to edit
          </TText>
        </View>

        <TSpacer size="sm" />

        {/* Food items */}
        {result.items.map((item, i) => (
          <FoodItemCard
            key={`${item.detected.label}-${i}`}
            item={item}
            index={i}
            onUpdateGrams={handleUpdateGrams}
            onUpdateName={handleUpdateName}
            onRemove={handleRemove}
            theme={theme}
          />
        ))}

        {/* Add Item */}
        {showAddItem ? (
          <Animated.View
            entering={FadeInDown.duration(200)}
            style={[
              styles.addItemForm,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <TextInput
              value={addItemName}
              onChangeText={setAddItemName}
              placeholder="Food name (e.g. rice)"
              placeholderTextColor={theme.colors.textMuted}
              autoFocus
              style={[
                styles.addItemInput,
                { color: theme.colors.text, borderColor: theme.colors.border },
              ]}
            />
            <View style={styles.addItemRow}>
              <TextInput
                value={addItemGrams}
                onChangeText={setAddItemGrams}
                placeholder="Grams"
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="numeric"
                style={[
                  styles.addItemGramsInput,
                  {
                    color: theme.colors.text,
                    borderColor: theme.colors.border,
                  },
                ]}
              />
              <Pressable
                onPress={handleAddItemSubmit}
                style={[
                  styles.addItemConfirmBtn,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
                <Ionicons name="checkmark" size={18} color="#fff" />
                <TText style={styles.addItemConfirmText}>Add</TText>
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowAddItem(false);
                  setAddItemName("");
                  setAddItemGrams("");
                }}
                hitSlop={8}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={theme.colors.textMuted}
                />
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <Pressable
            onPress={() => setShowAddItem(true)}
            style={[styles.addItemBtn, { borderColor: theme.colors.border }]}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color={theme.colors.primary}
            />
            <TText
              style={[styles.addItemBtnText, { color: theme.colors.primary }]}
            >
              Add missing food
            </TText>
          </Pressable>
        )}

        {/* Caveats */}
        {result.caveats.length > 0 && (
          <>
            <TSpacer size="md" />
            <View
              style={[
                styles.caveatBox,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={theme.colors.textMuted}
              />
              <View style={styles.caveatTexts}>
                {result.caveats.map((c, i) => (
                  <TText
                    key={i}
                    style={[
                      styles.caveatText,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {c}
                  </TText>
                ))}
              </View>
            </View>
          </>
        )}

        {/* Latency info (subtle) */}
        <TSpacer size="sm" />
        <TText style={[styles.latencyText, { color: theme.colors.textMuted }]}>
          Analysis took {(result.totalLatencyMs / 1000).toFixed(1)}s
        </TText>

        <TSpacer size="xl" />
        <TSpacer size="xl" />
      </ScrollView>

      {/* Confirm button (fixed at bottom) */}
      <SafeAreaView edges={["bottom"]} style={styles.confirmBar}>
        <Pressable
          onPress={handleConfirm}
          style={({ pressed }) => [
            styles.confirmBtn,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.confirmGradient}
          >
            <Ionicons name="checkmark-circle" size={22} color="#fff" />
            <TText style={styles.confirmText}>
              Log Meal · {result.totals.calories} cal
            </TText>
          </LinearGradient>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

// ─── Total Item Component ───────────────────────────────────────────────────

function TotalItem({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View style={styles.totalItem}>
      <TText style={[styles.totalValue, { color }]}>
        {Math.round(value)}
        {unit}
      </TText>
      <TText style={styles.totalLabel}>{label}</TText>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWide: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  analyzingImage: { width: 180, height: 180, borderRadius: 24 },
  analyzingText: { fontSize: 15, fontWeight: "500", textAlign: "center" },
  dotsRow: { flexDirection: "row", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Error
  errorImage: {
    width: 140,
    height: 140,
    borderRadius: 20,
    opacity: 0.7,
  },
  errorTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  errorBtnRow: { flexDirection: "row", gap: 12, paddingHorizontal: 24 },
  errorBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  errorBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  manualSearchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    gap: 6,
  },
  manualSearchText: { fontSize: 14, fontWeight: "500" },

  // Results
  scrollContent: { flex: 1 },
  scrollContainer: { paddingHorizontal: 16 },
  summarySection: { flexDirection: "row", alignItems: "center", gap: 16 },
  resultImage: { width: 80, height: 80, borderRadius: 16 },
  summaryText: { flex: 1 },
  mealTitle: { fontSize: 18, fontWeight: "700", lineHeight: 24 },

  // Confidence badge
  confBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confDot: { width: 6, height: 6, borderRadius: 3 },
  confLabel: { fontSize: 12, fontWeight: "600" },

  // Totals bar
  totalsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    padding: 16,
    borderRadius: 16,
  },
  totalsDivider: { width: 1, height: 32 },
  totalItem: { alignItems: "center", gap: 2 },
  totalValue: { fontSize: 20, fontWeight: "800" },
  totalLabel: { fontSize: 11, fontWeight: "500", color: "#999" },

  // Section
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: 14, fontWeight: "600" },
  editHint: { fontSize: 12 },

  // Item card
  itemCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemNameRow: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1 },
  itemConfDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  itemName: { fontSize: 16, fontWeight: "600", flex: 1 },
  removeBtn: { padding: 4 },

  // Portion
  portionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  portionText: { fontSize: 13 },
  gramsInput: {
    fontSize: 14,
    fontWeight: "600",
    borderBottomWidth: 2,
    paddingBottom: 2,
    paddingHorizontal: 4,
    minWidth: 50,
  },
  editPortionBtn: { padding: 4, marginLeft: 2 },
  nameInput: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
    borderBottomWidth: 2,
    paddingBottom: 2,
    paddingHorizontal: 4,
  },

  // Macros
  macrosRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  macroPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  macroPillLabel: { fontSize: 11, fontWeight: "700" },
  macroPillValue: { fontSize: 13, fontWeight: "600" },

  // Review
  reviewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(150,150,150,0.2)",
  },
  reviewText: { fontSize: 12, color: "#FF9500" },

  // Confidence breakdown
  confBreakdownRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
  },
  confDotItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  confDotMini: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  confDotLabel: {
    fontSize: 10,
    fontWeight: "500",
  },

  // Caveats
  caveatBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    alignItems: "flex-start",
  },
  caveatTexts: { flex: 1, gap: 4 },
  caveatText: { fontSize: 12, lineHeight: 16 },

  // Latency
  latencyText: { fontSize: 11, textAlign: "center" },

  // Add Item
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: 10,
  },
  addItemBtnText: { fontSize: 14, fontWeight: "600" },
  addItemForm: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    gap: 10,
  },
  addItemInput: {
    fontSize: 15,
    fontWeight: "500",
    borderBottomWidth: 1,
    paddingBottom: 6,
    paddingHorizontal: 4,
  },
  addItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  addItemGramsInput: {
    fontSize: 15,
    fontWeight: "500",
    borderBottomWidth: 1,
    paddingBottom: 6,
    paddingHorizontal: 4,
    width: 80,
  },
  addItemConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    flex: 1,
    justifyContent: "center",
  },
  addItemConfirmText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // Confirm
  confirmBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  confirmBtn: { borderRadius: 16, overflow: "hidden" },
  confirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  confirmText: { fontSize: 17, fontWeight: "800", color: "#fff" },
});
