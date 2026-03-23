/**
 * Home Dashboard (Today Screen)
 *
 * Main tab screen showing:
 * - Day selector (M T W T F S S)
 * - Calorie ring with remaining count
 * - Macro cards (Protein, Carbs, Fat)
 * - Meals list
 * - Floating "+" button to tracking launcher
 */

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getOverLimitColor,
  useOverLimitColor,
} from "../../hooks/useOverLimitColor";
import { useUnits } from "../../hooks/useUnits";
import { useHomeData } from "../../src/features/home/use-home-data";
import type { MealTime } from "../../src/features/nutrition/mealtime";
import {
  MEALTIME_ICONS,
  MEALTIME_LABELS,
  mealTimeFromISO,
} from "../../src/features/nutrition/mealtime";
import {
  type FoodMemoryEntry,
  getFrequentFoods,
  hasMemory,
} from "../../src/features/nutrition/memory/food-memory.service";
import { useNutritionDraftStore } from "../../src/features/nutrition/nutrition.draft.store";
import type { MealDraft } from "../../src/features/nutrition/nutrition.draft.types";
import { useNutritionStore } from "../../src/features/nutrition/nutrition.store";
import { useProfileStore } from "../../src/features/profile/profile.store";
import { useStreakStore } from "../../src/features/streak/streak.store";
import { haptics } from "../../src/infrastructure/haptics";
import { useTheme } from "../../src/theme/useTheme";
import { DaySelector } from "../../src/ui/components/DaySelector";
import { EditMealSheet } from "../../src/ui/components/EditMealSheet";
import { ManualLogSheet } from "../../src/ui/components/ManualLogSheet";
import { VoiceLogSheet } from "../../src/ui/components/VoiceLogSheet";
import { MacroCard } from "../../src/ui/components/MacroCard";
import { MealCard } from "../../src/ui/components/MealCard";
import { MonthlyView } from "../../src/ui/components/MonthlyView";
import { ProgressRing } from "../../src/ui/components/ProgressRing";
import { WaterCard } from "../../src/ui/components/WaterCard";
import { WeeklyView } from "../../src/ui/components/WeeklyView";
import { GlassSegmentedControl } from "../../src/ui/glass/GlassSegmentedControl";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { useBottomSheet } from "../../src/ui/sheets/useBottomSheet";

/** Macro accent colors */
const MACRO_COLORS = {
  protein: "#60A5FA",
  carbs: "#FBBF24",
  fat: "#F87171",
};

/** Build a MealDraft from a food memory entry for quick re-logging */
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

/** D/W/M segment options */
const VIEW_MODE_OPTIONS = [
  { key: "D", label: "D" },
  { key: "W", label: "W" },
  { key: "M", label: "M" },
] as const;

type ViewMode = "D" | "W" | "M";

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const units = useUnits();
  const [viewMode, setViewMode] = useState<ViewMode>("D");
  const [waterMl, setWaterMl] = useState(0);
  const { open: openSheet, close: closeSheet } = useBottomSheet();
  const WATER_INCREMENT = 250; // ml per tap
  const WATER_GOAL = 2500; // ml

  // ── Derived data from stores ──
  const {
    selectedDate,
    setSelectedDate,
    selectedDayIndex,
    handleDaySelect,
    weekDays,
    weekPages,
    weekPagesProgress,
    activeDays,
    dayProgress,
    dayProgressRaw,
    dateHeader,
    isToday,
    goToNextWeek,
    goToPrevWeek,
    latestWeight,
    calorieBudget,
    dailySummary,
    calorieProgress,
    proteinTarget,
    carbsTarget,
    fatTarget,
    monthGrid,
    monthProgress,
    monthProgressRaw,
    weekSummary,
  } = useHomeData();

  const removeMeal = useNutritionStore((s) => s.removeMeal);
  const goalWeightLbs = useProfileStore((s) => s.profile.goalWeightLbs);
  const currentStreak = useStreakStore((s) => s.currentStreak);

  const todayMeals = dailySummary.meals;

  // Group meals by category in display order
  const MEAL_ORDER: MealTime[] = ["breakfast", "lunch", "dinner", "snack"];
  const groupedMeals = useMemo(() => {
    const groups: Record<MealTime, typeof todayMeals> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const meal of todayMeals) {
      const mt = meal.mealTime ?? mealTimeFromISO(meal.loggedAt);
      groups[mt].push(meal);
    }
    return groups;
  }, [todayMeals]);

  const totals = {
    calories: dailySummary.totalCalories,
    protein: dailySummary.totalProtein,
    carbs: dailySummary.totalCarbs,
    fat: dailySummary.totalFat,
  };
  const targetCalories = calorieBudget;
  const displayWeight = latestWeight ?? 0;
  const weightTrending = (latestWeight ?? 0) <= (goalWeightLbs ?? Infinity);

  // Over-limit severity color (animated green → yellow → orange → red)
  const overLimit = useOverLimitColor(calorieProgress);

  // Per-day severity colors for DaySelector progress arcs
  const dayProgressColors = dayProgressRaw.map((p) =>
    getOverLimitColor(p, theme.colors.primary)
  );

  // Per-day severity colors for MonthlyView arcs
  const monthDayColors = useMemo(() => {
    const colorMap = new Map<string, string>();
    for (const [key, raw] of monthProgressRaw) {
      colorMap.set(key, getOverLimitColor(raw, theme.colors.primary));
    }
    return colorMap;
  }, [monthProgressRaw, theme.colors.primary]);

  /* ── Content swipe gesture for day navigation ── */
  const SCREEN_W = Dimensions.get("window").width;
  const SWIPE_THRESHOLD = SCREEN_W * 0.15;
  const SWIPE_VEL = 400;
  const SLIDE_OUT = SCREEN_W * 0.35;
  const SNAP_EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);

  const contentOffsetX = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  const goToPrevDay = useCallback(() => {
    if (selectedDayIndex > 0) {
      handleDaySelect(selectedDayIndex - 1);
    } else {
      goToPrevWeek();
      setTimeout(() => handleDaySelect(6), 50);
    }
  }, [selectedDayIndex, handleDaySelect, goToPrevWeek]);

  const goToNextDay = useCallback(() => {
    if (selectedDayIndex < 6) {
      handleDaySelect(selectedDayIndex + 1);
    } else {
      goToNextWeek();
      setTimeout(() => handleDaySelect(0), 50);
    }
  }, [selectedDayIndex, handleDaySelect, goToNextWeek]);

  const handleMonthDaySelect = useCallback(
    (isoDate: string) => {
      setSelectedDate(isoDate);
    },
    [setSelectedDate]
  );

  const setDraft = useNutritionDraftStore((s) => s.setDraft);
  const setLogDate = useNutritionDraftStore((s) => s.setLogDate);

  const openManualLog = useCallback(() => {
    setLogDate(isToday ? null : selectedDate);
    openSheet(<ManualLogSheet onClose={closeSheet} />, {
      snapPoints: ["55%"],
      enablePanDownToClose: true,
    });
  }, [openSheet, closeSheet, isToday, selectedDate, setLogDate]);

  const openVoiceLog = useCallback(() => {
    setLogDate(isToday ? null : selectedDate);
    openSheet(<VoiceLogSheet onClose={closeSheet} />, {
      snapPoints: ["55%"],
      enablePanDownToClose: true,
    });
  }, [openSheet, closeSheet, isToday, selectedDate, setLogDate]);

  const openLogSheet = useCallback(() => {
    haptics.impact("light");
    // Set date override for the whole logging session
    setLogDate(isToday ? null : selectedDate);
    const frequentFoods = hasMemory() ? getFrequentFoods(15) : [];

    const handleQuickLog = (entry: FoodMemoryEntry) => {
      closeSheet();
      const draft = memoryToDraft(entry);
      // When logging from a past date, stamp the draft
      if (!isToday) {
        draft.loggedAt = selectedDate;
      }
      setDraft(draft);
      router.push("/(modals)/confirm-meal" as never);
    };

    openSheet(
      <View style={{ flex: 1, paddingTop: 8 }}>
        {/* ── Input method buttons ── */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 28,
            paddingVertical: 20,
            paddingHorizontal: 20,
          }}
        >
          {/* Keyboard */}
          <Pressable
            onPress={() => {
              openManualLog();
            }}
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <MaterialCommunityIcons
              name="keyboard-outline"
              size={24}
              color={theme.colors.textInverse}
            />
          </Pressable>

          {/* Mic — primary CTA with glow */}
          <Pressable
            onPress={() => {
              openVoiceLog();
            }}
            style={({ pressed }) => ({
              alignItems: "center",
              justifyContent: "center",
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Glow ring */}
              <View
                style={{
                  position: "absolute",
                  width: 80,
                  height: 80,
                  borderRadius: 40,
                  backgroundColor: theme.colors.primary + "30",
                }}
              />
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons
                  name="mic"
                  size={30}
                  color={theme.colors.textInverse}
                />
              </LinearGradient>
            </View>
          </Pressable>

          {/* Camera */}
          <Pressable
            onPress={() => {
              closeSheet();
              router.push("/(modals)/camera-log" as any);
            }}
            style={({ pressed }) => ({
              width: 56,
              height: 56,
              borderRadius: 28,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.primary,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.95 : 1 }],
            })}
          >
            <Ionicons
              name="camera"
              size={24}
              color={theme.colors.textInverse}
            />
          </Pressable>
        </View>

        {/* ── Frequently Added header ── */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 12,
          }}
        >
          <TText
            style={{
              fontSize: 15,
              fontWeight: "500",
              color: theme.colors.textSecondary,
            }}
          >
            Frequently Added
          </TText>
          <Pressable
            onPress={() => {
              closeSheet();
              router.push("/(modals)/manual-log" as any);
            }}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: theme.colors.surfaceSecondary,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons
              name="search"
              size={18}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>

        {/* ── Food items list ── */}
        {frequentFoods.length > 0 ? (
          <View style={{ paddingHorizontal: 16, gap: 10, paddingBottom: 40 }}>
            {frequentFoods.map((entry) => (
              <Pressable
                key={entry.name}
                onPress={() => handleQuickLog(entry)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: theme.colors.surfaceSecondary,
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                })}
              >
                <TText style={{ fontSize: 28, marginRight: 14 }}>
                  {entry.emoji ?? "🍽"}
                </TText>
                <View style={{ flex: 1 }}>
                  <TText
                    style={{
                      fontSize: 15,
                      fontWeight: "600",
                      color: theme.colors.text,
                    }}
                    numberOfLines={2}
                  >
                    {entry.name}
                  </TText>
                  <TText
                    style={{
                      fontSize: 13,
                      color: theme.colors.textSecondary,
                      marginTop: 2,
                    }}
                  >
                    {entry.lastCalories} kcal
                  </TText>
                </View>
                <View
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="add" size={18} color={theme.colors.text} />
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 40,
              alignItems: "center",
            }}
          >
            <TText
              style={{
                fontSize: 14,
                color: theme.colors.textMuted,
                textAlign: "center",
              }}
            >
              Log your first meal to see frequently added foods here
            </TText>
          </View>
        )}
      </View>,
      { snapPoints: ["50%", "92%"] }
    );
  }, [
    openSheet,
    closeSheet,
    router,
    theme,
    setDraft,
    setLogDate,
    openManualLog,
    openVoiceLog,
    isToday,
    selectedDate,
  ]);

  const contentSwipe = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      contentOffsetX.value = e.translationX * 0.4;
      // Fade as user drags further
      contentOpacity.value =
        1 - Math.min(Math.abs(e.translationX) / SCREEN_W, 0.4);
    })
    .onEnd((e) => {
      const tx = e.translationX;
      const vx = e.velocityX;
      const swiped =
        tx > SWIPE_THRESHOLD || (tx > 20 && vx > SWIPE_VEL)
          ? 1 // prev day
          : tx < -SWIPE_THRESHOLD || (tx < -20 && vx < -SWIPE_VEL)
            ? -1 // next day
            : 0;

      if (swiped === 0) {
        // Snap back — no day change
        contentOffsetX.value = withTiming(0, {
          duration: 150,
          easing: SNAP_EASING,
        });
        contentOpacity.value = withTiming(1, { duration: 150 });
        return;
      }

      // Slide out in swipe direction
      contentOffsetX.value = withTiming(
        swiped * SLIDE_OUT,
        {
          duration: 120,
          easing: SNAP_EASING,
        },
        (finished) => {
          if (!finished) return;
          // Fire day change
          if (swiped > 0) {
            runOnJS(goToPrevDay)();
          } else {
            runOnJS(goToNextDay)();
          }
          // Instantly jump to opposite side, then slide in
          contentOffsetX.value = -swiped * SLIDE_OUT * 0.6;
          contentOpacity.value = 0.3;
          contentOffsetX.value = withTiming(0, {
            duration: 180,
            easing: SNAP_EASING,
          });
          contentOpacity.value = withTiming(1, { duration: 180 });
        }
      );
      contentOpacity.value = withTiming(0.3, { duration: 120 });
    });

  const contentAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: contentOffsetX.value }],
    opacity: contentOpacity.value,
  }));

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header */}
        <View testID="home-header" style={styles.header}>
          <View style={styles.headerLeft}>
            <TText
              variant="heading"
              numberOfLines={1}
              style={[styles.greeting, { color: theme.colors.text }]}
            >
              {isToday ? "Today" : dateHeader}
            </TText>
          </View>
          <View style={styles.headerRight}>
            <View
              style={[
                styles.streakPill,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
              accessibilityLabel={`${currentStreak} day streak`}
            >
              <TText
                style={[
                  styles.streakFlame,
                  currentStreak === 0 && { opacity: 0.4 },
                ]}
              >
                🔥
              </TText>
              <TText
                style={[
                  styles.streakText,
                  {
                    color:
                      currentStreak > 0
                        ? theme.colors.text
                        : theme.colors.textMuted,
                  },
                ]}
              >
                {currentStreak}
              </TText>
            </View>
            <Pressable
              onPress={() => router.push("/progress" as any)}
              accessibilityLabel={`Current weight ${units.format(displayWeight)}`}
              accessibilityRole="button"
              style={[
                styles.weightPill,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name={weightTrending ? "trending-down" : "trending-up"}
                size={14}
                color={
                  weightTrending ? theme.colors.success : theme.colors.warning
                }
              />
              <TText style={[styles.weightText, { color: theme.colors.text }]}>
                {units.format(displayWeight, 0)}
              </TText>
            </Pressable>
            <Pressable
              onPress={() => router.push("/settings" as any)}
              hitSlop={12}
              accessibilityLabel="Settings"
              accessibilityRole="button"
            >
              <Ionicons
                name="settings-outline"
                size={22}
                color={theme.colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        <ScrollView
          testID="home-scroll"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TSpacer size="sm" />

          {/* D / W / M Segmented Control */}
          <View style={styles.segmentRow}>
            <GlassSegmentedControl
              options={VIEW_MODE_OPTIONS as any}
              value={viewMode}
              onChange={(key) => setViewMode(key as ViewMode)}
            />
          </View>

          <TSpacer size="sm" />

          {/* Day selector — only shown in D mode */}
          {viewMode === "D" && (
            <DaySelector
              selectedIndex={selectedDayIndex}
              onSelect={handleDaySelect}
              weekPages={weekPages}
              weekPagesProgress={weekPagesProgress}
              dayColors={dayProgressColors}
              onPrevWeek={goToPrevWeek}
              onNextWeek={goToNextWeek}
            />
          )}

          {viewMode === "D" && <TSpacer size="md" />}

          {/* ── Daily view ── */}
          {viewMode === "D" && (
            <>
              {/* ── Calorie card (ring + footer) ── */}
              <View
                style={[
                  styles.calorieCard,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                {/* Swipeable ring */}
                <GestureDetector gesture={contentSwipe}>
                  <Animated.View style={styles.ringSection}>
                    <Pressable
                      onPress={goToPrevDay}
                      hitSlop={16}
                      style={styles.ringChevron}
                      accessibilityLabel="Previous day"
                    >
                      <Ionicons
                        name="chevron-back"
                        size={28}
                        color={theme.colors.textMuted}
                      />
                    </Pressable>

                    <Animated.View style={contentAnimStyle}>
                      <ProgressRing
                        consumed={totals.calories}
                        target={targetCalories}
                        size={220}
                        strokeWidth={18}
                        color={overLimit.color}
                        dayLabel={isToday ? "Today" : dateHeader.split(",")[0]}
                        subtitle={`of ${targetCalories.toLocaleString()} cal`}
                      />
                    </Animated.View>

                    <Pressable
                      onPress={goToNextDay}
                      hitSlop={16}
                      style={styles.ringChevron}
                      accessibilityLabel="Next day"
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={28}
                        color={theme.colors.textMuted}
                      />
                    </Pressable>
                  </Animated.View>
                </GestureDetector>

                <TSpacer size="sm" />

                {/* Consumed / Budget footer */}
                <View testID="consumed-budget" style={styles.ringFooter}>
                  <View style={styles.ringFooterItem}>
                    <TText
                      style={[
                        styles.ringFooterValue,
                        { color: theme.colors.text },
                      ]}
                    >
                      {Math.round(totals.calories)}
                    </TText>
                    <TText
                      style={[
                        styles.ringFooterLabel,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      consumed
                    </TText>
                  </View>
                  <View
                    style={[
                      styles.ringDivider,
                      { backgroundColor: theme.colors.border },
                    ]}
                  />
                  <View style={styles.ringFooterItem}>
                    <TText
                      style={[
                        styles.ringFooterValue,
                        { color: theme.colors.text },
                      ]}
                    >
                      {targetCalories}
                    </TText>
                    <TText
                      style={[
                        styles.ringFooterLabel,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      budget
                    </TText>
                  </View>
                </View>
              </View>
              {/* end calorieCard */}

              <TSpacer size="md" />

              {/* Macro cards */}
              <View testID="macro-cards" style={styles.macroRow}>
                <MacroCard
                  label="Protein"
                  consumedG={totals.protein}
                  targetG={proteinTarget}
                  color={MACRO_COLORS.protein}
                />
                <MacroCard
                  label="Carbs"
                  consumedG={totals.carbs}
                  targetG={carbsTarget}
                  color={MACRO_COLORS.carbs}
                />
                <MacroCard
                  label="Fat"
                  consumedG={totals.fat}
                  targetG={fatTarget}
                  color={MACRO_COLORS.fat}
                />
              </View>

              <TSpacer size="md" />

              {/* Water tracker card */}
              <WaterCard
                currentMl={waterMl}
                goalMl={WATER_GOAL}
                incrementMl={WATER_INCREMENT}
                onIncrement={() => {
                  setWaterMl((v) => v + WATER_INCREMENT);
                  haptics.impact("light");
                }}
                onDecrement={() => {
                  setWaterMl((v) => Math.max(0, v - WATER_INCREMENT));
                  haptics.impact("light");
                }}
              />
            </>
          )}
          {viewMode === "W" && (
            <View testID="weekly-view">
              <WeeklyView
                weekDays={weekDays}
                dayProgress={dayProgress}
                dayColors={dayProgressColors}
                selectedDate={selectedDate}
                onSelectDay={handleDaySelect}
                weekSummary={weekSummary}
                calorieBudget={calorieBudget}
              />
            </View>
          )}

          {/* ── Monthly view ── */}
          {viewMode === "M" && (
            <View testID="monthly-view">
              <MonthlyView
                monthGrid={monthGrid}
                monthProgress={monthProgress}
                dayColors={monthDayColors}
                selectedDate={selectedDate}
                onSelectDay={handleMonthDaySelect}
              />
            </View>
          )}

          <TSpacer size="lg" />

          {/* Meals section */}
          <View testID="meals-section">
            <View style={styles.mealsHeader}>
              <TText
                variant="subheading"
                style={[styles.sectionTitle, { color: theme.colors.text }]}
              >
                Meals
              </TText>
              <TText
                style={[
                  styles.mealCount,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {todayMeals.length} logged
              </TText>
            </View>
            <TSpacer size="sm" />
            <View style={styles.mealsList}>
              {todayMeals.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="restaurant-outline"
                    size={48}
                    color={theme.colors.textMuted}
                  />
                  <TText
                    style={[
                      styles.emptyStateTitle,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    No meals logged yet
                  </TText>
                  <TText
                    style={[
                      styles.emptyStateSubtitle,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Tap + to snap, speak, or type your first meal
                  </TText>
                </View>
              ) : (
                MEAL_ORDER.filter((mt) => groupedMeals[mt].length > 0).map(
                  (mt) => (
                    <View key={mt} style={styles.mealGroup}>
                      <View style={styles.mealGroupHeader}>
                        <Ionicons
                          name={MEALTIME_ICONS[mt] as any}
                          size={16}
                          color={theme.colors.textSecondary}
                        />
                        <TText
                          style={[
                            styles.mealGroupLabel,
                            { color: theme.colors.textSecondary },
                          ]}
                        >
                          {MEALTIME_LABELS[mt]}
                        </TText>
                      </View>
                      {groupedMeals[mt].map((meal) => (
                        <MealCard
                          key={meal.id}
                          icon={meal.emoji}
                          imageUri={meal.imageUri}
                          title={meal.title}
                          time={meal.loggedAt.split("T")[1]?.slice(0, 5)}
                          calories={meal.calories}
                          protein={meal.protein}
                          carbs={meal.carbs}
                          fat={meal.fat}
                          onPress={() =>
                            openSheet(
                              <EditMealSheet
                                mealId={meal.id}
                                onClose={closeSheet}
                              />,
                              {
                                snapPoints: ["92%"],
                                enablePanDownToClose: true,
                              }
                            )
                          }
                          onDelete={() => removeMeal(meal.id)}
                        />
                      ))}
                    </View>
                  )
                )
              )}
            </View>
          </View>

          {/* Bottom spacing handled by scrollContent paddingBottom */}
        </ScrollView>
      </SafeAreaView>

      {/* Floating Add button */}
      <View testID="fab-button" style={styles.fabContainer}>
        <Pressable
          onPress={openLogSheet}
          accessibilityLabel="Log a meal"
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.fab,
            {
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
        >
          <LinearGradient
            colors={[
              overLimit.isOver ? overLimit.color : theme.colors.primary,
              overLimit.isOver ? overLimit.color : theme.colors.accent,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={30} color={theme.colors.textInverse} />
          </LinearGradient>
        </Pressable>
      </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerLeft: {
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    marginRight: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 8,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  date: {
    fontSize: 14,
    fontWeight: "400",
    marginTop: 2,
  },
  weightPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  weightText: {
    fontSize: 14,
    fontWeight: "600",
  },
  streakPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  streakFlame: {
    fontSize: 14,
  },
  streakText: {
    fontSize: 14,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 160,
  },
  segmentRow: {
    alignSelf: "center",
    width: 160,
  },
  calorieCard: {
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: "center",
  },
  ringSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ringChevron: {
    padding: 4,
    opacity: 0.6,
  },
  ringFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    marginTop: 8,
  },
  ringFooterItem: {
    alignItems: "center",
  },
  ringFooterValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  ringFooterLabel: {
    fontSize: 12,
    fontWeight: "400",
    marginTop: 2,
  },
  ringDivider: {
    height: 24,
    width: 1,
  },
  macroRow: {
    flexDirection: "row",
    gap: 10,
  },
  mealsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  mealCount: {
    fontSize: 13,
    fontWeight: "500",
  },
  mealsList: {
    gap: 16,
  },
  mealGroup: {
    gap: 8,
  },
  mealGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 2,
  },
  mealGroupLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
  },
  fabContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  fab: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
