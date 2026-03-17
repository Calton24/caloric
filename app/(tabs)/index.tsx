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

import { Ionicons } from "@expo/vector-icons";
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
    FadeIn,
    FadeInDown,
    FadeInUp,
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
import { useNutritionStore } from "../../src/features/nutrition/nutrition.store";
import { useProfileStore } from "../../src/features/profile/profile.store";
import { haptics } from "../../src/infrastructure/haptics";
import { useTheme } from "../../src/theme/useTheme";
import { WaterTracker } from "../../src/ui/analytics/WaterTracker";
import { DaySelector } from "../../src/ui/components/DaySelector";
import { MacroCard } from "../../src/ui/components/MacroCard";
import { MealCard } from "../../src/ui/components/MealCard";
import { MonthlyView } from "../../src/ui/components/MonthlyView";
import { ProgressRing } from "../../src/ui/components/ProgressRing";
import { WeeklyView } from "../../src/ui/components/WeeklyView";
import { GlassSegmentedControl } from "../../src/ui/glass/GlassSegmentedControl";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

/** Macro accent colors */
const MACRO_COLORS = {
  protein: "#60A5FA",
  carbs: "#FBBF24",
  fat: "#F87171",
};

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
  const [showHydration, setShowHydration] = useState(false);
  const [glassCount, setGlassCount] = useState(0);
  const GLASS_SIZE = 0.25; // litres per glass
  const WATER_GOAL = 2.5; // litres

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

  const toggleHydration = useCallback(() => {
    haptics.impact("heavy");
    setShowHydration((prev) => !prev);
  }, []);

  // Long-press scale animation feedback
  const holdScale = useSharedValue(1);

  const ringLongPress = Gesture.LongPress()
    .minDuration(3000)
    .onBegin(() => {
      holdScale.value = withTiming(0.88, {
        duration: 3000,
        easing: Easing.out(Easing.cubic),
      });
    })
    .onEnd((_e, success) => {
      if (success) runOnJS(toggleHydration)();
    })
    .onFinalize(() => {
      holdScale.value = withTiming(1, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
    });

  const holdAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: holdScale.value }],
  }));

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
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <View style={styles.headerLeft}>
            <TText
              variant="heading"
              style={[styles.greeting, { color: theme.colors.text }]}
            >
              {isToday ? "Today" : dateHeader}
            </TText>
          </View>
          <View style={styles.headerRight}>
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
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TSpacer size="md" />

          {/* D / W / M Segmented Control */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={styles.segmentRow}
          >
            <GlassSegmentedControl
              options={VIEW_MODE_OPTIONS as any}
              value={viewMode}
              onChange={(key) => setViewMode(key as ViewMode)}
            />
          </Animated.View>

          <TSpacer size="md" />

          {/* Day selector — only shown in D mode */}
          {viewMode === "D" && (
            <Animated.View entering={FadeInDown.duration(300)}>
              <DaySelector
                selectedIndex={selectedDayIndex}
                onSelect={handleDaySelect}
                weekPages={weekPages}
                weekPagesProgress={weekPagesProgress}
                dayColors={dayProgressColors}
                onPrevWeek={goToPrevWeek}
                onNextWeek={goToNextWeek}
              />
            </Animated.View>
          )}

          {viewMode === "D" && <TSpacer size="lg" />}

          {/* ── Daily view ── */}
          {viewMode === "D" && (
            <Animated.View key={selectedDate} entering={FadeIn.duration(350)}>
              {/* Swipeable ring — swipe or long-press to toggle hydration */}
              <GestureDetector
                gesture={Gesture.Race(ringLongPress, contentSwipe)}
              >
                <Animated.View style={[styles.ringSection, holdAnimStyle]}>
                  {!showHydration && (
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
                  )}

                  <Animated.View
                    style={showHydration ? undefined : contentAnimStyle}
                  >
                    {showHydration ? (
                      <WaterTracker
                        current={glassCount * GLASS_SIZE}
                        goal={WATER_GOAL}
                        unit="L"
                        glasses={glassCount}
                        glassSize={GLASS_SIZE}
                        size={220}
                        showGlasses
                        style={styles.hydrationWidget}
                      />
                    ) : (
                      <ProgressRing
                        consumed={totals.calories}
                        target={targetCalories}
                        size={260}
                        strokeWidth={20}
                        color={overLimit.color}
                        dayLabel={isToday ? "Today" : dateHeader.split(",")[0]}
                        subtitle={`of ${targetCalories.toLocaleString()} cal`}
                      />
                    )}
                  </Animated.View>

                  {!showHydration && (
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
                  )}
                </Animated.View>
              </GestureDetector>

              {/* Long-press hint */}
              {!showHydration && (
                <TText
                  style={[
                    styles.longPressHint,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Hold ring 3s for hydration
                </TText>
              )}

              {!showHydration && <TSpacer size="sm" />}

              {/* Consumed / Budget footer */}
              {!showHydration && (
                <View style={styles.ringFooter}>
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
              )}

              <TSpacer size="md" />

              {/* Macro cards — hidden when hydration is active */}
              {!showHydration && (
                <View style={styles.macroRow}>
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
              )}
            </Animated.View>
          )}

          {/* ── Weekly view ── */}
          {viewMode === "W" && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <WeeklyView
                weekDays={weekDays}
                dayProgress={dayProgress}
                dayColors={dayProgressColors}
                selectedDate={selectedDate}
                onSelectDay={handleDaySelect}
                weekSummary={weekSummary}
                calorieBudget={calorieBudget}
              />
            </Animated.View>
          )}

          {/* ── Monthly view ── */}
          {viewMode === "M" && (
            <Animated.View entering={FadeInDown.duration(400)}>
              <MonthlyView
                monthGrid={monthGrid}
                monthProgress={monthProgress}
                dayColors={monthDayColors}
                selectedDate={selectedDate}
                onSelectDay={handleMonthDaySelect}
              />
            </Animated.View>
          )}

          {/* Hydration +/- controls — shown when hydration is active */}
          {showHydration && (
            <Animated.View
              entering={FadeInUp.duration(400).delay(200)}
              style={styles.glassControls}
            >
              <Pressable
                onPress={() => {
                  setGlassCount((c) => Math.max(0, c - 1));
                  haptics.impact("light");
                }}
                style={[
                  styles.glassBtn,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
                hitSlop={8}
              >
                <Ionicons name="remove" size={28} color={theme.colors.text} />
              </Pressable>
              <View style={styles.glassInfo}>
                <TText
                  style={[styles.glassValue, { color: theme.colors.text }]}
                >
                  {glassCount}
                </TText>
                <TText
                  style={[styles.glassLabel, { color: theme.colors.textMuted }]}
                >
                  glasses
                </TText>
              </View>
              <Pressable
                onPress={() => {
                  setGlassCount((c) => c + 1);
                  haptics.impact("light");
                }}
                style={[
                  styles.glassBtn,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
                hitSlop={8}
              >
                <Ionicons name="add" size={28} color={theme.colors.text} />
              </Pressable>
            </Animated.View>
          )}

          <TSpacer size="lg" />

          {/* Meals section */}
          <Animated.View entering={FadeInUp.duration(500).delay(400)}>
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
                            router.push({
                              pathname: "/(modals)/edit-meal" as any,
                              params: { mealId: meal.id },
                            })
                          }
                          onDelete={() => removeMeal(meal.id)}
                        />
                      ))}
                    </View>
                  )
                )
              )}
            </View>
          </Animated.View>

          {/* Bottom spacing for FAB */}
          <TSpacer size="xxl" />
          <TSpacer size="xxl" />
        </ScrollView>
      </SafeAreaView>

      {/* Bottom fade gradient */}
      <LinearGradient
        colors={["transparent", "#1A1A1A"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Floating Add button */}
      <Animated.View
        entering={FadeInUp.duration(400).delay(600)}
        style={styles.fabContainer}
      >
        <Pressable
          onPress={() => router.push("/(modals)/tracking" as any)}
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
      </Animated.View>
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
    minHeight: 48,
    justifyContent: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  greeting: {
    fontSize: 28,
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
  scrollContent: {
    paddingHorizontal: 20,
  },
  segmentRow: {
    alignSelf: "center",
    width: 160,
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
  hydrationWidget: {
    borderWidth: 0,
    backgroundColor: "transparent",
    padding: 0,
  },
  glassControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
  },
  glassBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  glassInfo: {
    alignItems: "center",
    minWidth: 60,
  },
  glassValue: {
    fontSize: 32,
    fontWeight: "800",
  },
  glassLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  longPressHint: {
    fontSize: 11,
    fontWeight: "400",
    textAlign: "center",
    marginTop: 4,
    opacity: 0.5,
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
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
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
