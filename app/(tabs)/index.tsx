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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { getMilestoneInsight } from "../../src/features/milestone/milestone-insight.service";
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
import { useRetentionEngine } from "../../src/features/retention";
import { useStreakStore } from "../../src/features/streak/streak.store";
import { useSubscriptionStore } from "../../src/features/subscription/subscription.store";
import { useWaterStore } from "../../src/features/water/water.store";
import { haptics } from "../../src/infrastructure/haptics";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { toISODate } from "../../src/lib/utils/date";
import { useTheme } from "../../src/theme/useTheme";
import { DaySelector } from "../../src/ui/components/DaySelector";
import { EditMealSheet } from "../../src/ui/components/EditMealSheet";
import { MacroCard } from "../../src/ui/components/MacroCard";
import { ManualLogSheet } from "../../src/ui/components/ManualLogSheet";
import { MealCard } from "../../src/ui/components/MealCard";
import { MilestoneInsightCard } from "../../src/ui/components/MilestoneInsightCard";
import { MonthlyView } from "../../src/ui/components/MonthlyView";
import { ProgressRing } from "../../src/ui/components/ProgressRing";
import { StreakModal } from "../../src/ui/components/StreakModal";
import { VoiceLogSheet } from "../../src/ui/components/VoiceLogSheet";
import { WaterCard } from "../../src/ui/components/WaterCard";
import { WaterSettingsModal } from "../../src/ui/components/WaterSettingsModal";
import { WeeklyView } from "../../src/ui/components/WeeklyView";
import { GlassSegmentedControl } from "../../src/ui/glass/GlassSegmentedControl";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { useBottomSheet } from "../../src/ui/sheets/useBottomSheet";

/** Animated number display using React state with smooth transitions */
function AnimatedNumber({ value, style }: { value: number; style?: any }) {
  const [displayValue, setDisplayValue] = React.useState(value);

  React.useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    const duration = 400; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out function
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;

      setDisplayValue(Math.round(current));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]); // Only depend on the target value

  return <TText style={style}>{displayValue}</TText>;
}

/** Animated weight display */
function AnimatedWeight({
  currentValue,
  units,
  style,
}: {
  currentValue: number;
  units: any;
  style?: any;
}) {
  const [displayValue, setDisplayValue] = React.useState(currentValue);

  React.useEffect(() => {
    const startValue = displayValue;
    const endValue = currentValue;
    const duration = 400; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out function
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValue]);

  return <TText style={style}>{units.format(displayValue, 0)}</TText>;
}

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

/** D/W/M segment options — keys resolved at render via t() */
const VIEW_MODE_OPTION_KEYS = [
  { key: "D", labelKey: "home.dayShort" },
  { key: "W", labelKey: "home.weekShort" },
  { key: "M", labelKey: "home.monthShort" },
] as const;

type ViewMode = "D" | "W" | "M";

/**
 * SwipeTutorialOverlay
 * Animated tutorial showing users they can swipe to delete meals
 */
function SwipeTutorialOverlay({
  onDismiss,
  theme,
}: {
  onDismiss: () => void;
  theme: any;
}) {
  const { t } = useAppTranslation();
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const isMounted = React.useRef(true);

  React.useEffect(() => {
    isMounted.current = true;
    // Fade in
    opacity.value = withTiming(1, { duration: 300 });

    // Auto-play swipe animation in a loop
    const scheduleNext = () => {
      if (!isMounted.current) return;
      timerRef.current = setTimeout(() => {
        if (!isMounted.current) return;
        translateX.value = 0;
        translateX.value = withTiming(
          -90,
          { duration: 800, easing: Easing.inOut(Easing.ease) },
          (finished) => {
            if (finished) {
              translateX.value = withTiming(0, { duration: 600 }, (done) => {
                if (done) {
                  runOnJS(scheduleNext)();
                }
              });
            }
          }
        );
      }, 1000);
    };

    let timerRef = { current: null as ReturnType<typeof setTimeout> | null };

    // Start after short delay
    timerRef.current = setTimeout(() => {
      if (!isMounted.current) return;
      translateX.value = 0;
      translateX.value = withTiming(
        -90,
        { duration: 800, easing: Easing.inOut(Easing.ease) },
        (finished) => {
          if (finished) {
            translateX.value = withTiming(0, { duration: 600 }, (done) => {
              if (done) {
                runOnJS(scheduleNext)();
              }
            });
          }
        }
      );
    }, 500);

    return () => {
      isMounted.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: translateX.value < -40 ? 1 : 0,
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.tutorialOverlay, overlayStyle]}>
      <Pressable style={styles.tutorialBackdrop} onPress={onDismiss}>
        <View
          style={[
            styles.tutorialContent,
            { backgroundColor: theme.colors.surfaceElevated },
          ]}
        >
          <TText style={[styles.tutorialTitle, { color: theme.colors.text }]}>
            {t("home.swipeToDelete")}
          </TText>
          <TText
            style={[styles.tutorialHint, { color: theme.colors.textSecondary }]}
          >
            {t("home.swipeHint")}
          </TText>

          <View style={styles.tutorialDemo}>
            <Animated.View
              style={[
                styles.tutorialCard,
                { backgroundColor: theme.colors.surfaceSecondary },
                cardStyle,
              ]}
            >
              <View
                style={[
                  styles.tutorialIcon,
                  { backgroundColor: theme.colors.backgroundTertiary },
                ]}
              >
                <TText style={{ fontSize: 20 }}>🍎</TText>
              </View>
              <View style={{ flex: 1 }}>
                <TText
                  style={[
                    styles.tutorialMealName,
                    { color: theme.colors.text },
                  ]}
                >
                  {t("home.sampleMeal")}
                </TText>
                <TText
                  style={[
                    styles.tutorialMealCal,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {t("home.sampleCal")}
                </TText>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.colors.textMuted}
              />
            </Animated.View>

            <Animated.View style={[styles.tutorialDelete, deleteStyle]}>
              <Ionicons name="trash" size={20} color="#fff" />
            </Animated.View>
          </View>

          <Pressable
            onPress={onDismiss}
            style={[
              styles.tutorialButton,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <TText
              style={[
                styles.tutorialButtonText,
                { color: theme.colors.textInverse },
              ]}
            >
              {t("home.gotIt")}
            </TText>
          </Pressable>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const units = useUnits();
  const [viewMode, setViewMode] = useState<ViewMode>("D");
  const [showSwipeTutorial, setShowSwipeTutorial] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showWaterSettings, setShowWaterSettings] = useState(false);
  const [macroPage, setMacroPage] = useState(0);
  const [macroPagerWidth, setMacroPagerWidth] = useState(0);
  const { open: openSheet, close: closeSheet } = useBottomSheet();

  // ── Water state from stores ──
  const todayISO = new Date().toISOString().split("T")[0];
  const waterMl = useWaterStore((s) => s.intakeByDate[todayISO] ?? 0);
  const { addMl: addWater, subtractMl: subtractWater } = useWaterStore();
  const waterGoalMl = useProfileStore((s) => s.profile.waterGoalMl);
  const waterIncrementMl = useProfileStore((s) => s.profile.waterIncrementMl);

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
    goToNextMonth,
    goToPrevMonth,
    goToToday,
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
  const longestStreak = useStreakStore((s) => s.longestStreak);
  const lastLogDate = useStreakStore((s) => s.lastLogDate);
  const streakStartDate = useStreakStore((s) => s.streakStartDate);
  const streakFreezeAvailable = useStreakStore((s) => s.streakFreezeAvailable);

  const hasActiveSubscription = useSubscriptionStore(
    (s) => s.subscription.hasActiveSubscription
  );

  const todayMeals = dailySummary.meals;

  // ── Retention engine ──
  const retention = useRetentionEngine();

  // Record app open once per session
  useEffect(() => {
    retention.recordOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Day 0 auto-camera: redirect to camera on first launch with no meals
  useEffect(() => {
    if (retention.shouldShowCamera) {
      retention.markCameraShown();
      // Small delay to let the home screen render first
      const timer = setTimeout(() => {
        router.push("/tracking/camera" as any);
      }, 600);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retention.shouldShowCamera]);

  const totals = {
    calories: dailySummary.totalCalories,
    protein: dailySummary.totalProtein,
    carbs: dailySummary.totalCarbs,
    fat: dailySummary.totalFat,
  };
  const targetCalories = calorieBudget;

  // ── Milestone insight (unified coaching card) ──
  const today = toISODate(new Date());
  const hasLoggedToday = lastLogDate === today;
  const milestoneInsight = useMemo(
    () =>
      getMilestoneInsight({
        currentStreak,
        lastLogDate: lastLogDate ?? null,
        hasLoggedToday,
        streakRecoveryActive: !!retention.streakRecovery,
        lostStreak: retention.streakRecovery?.lostStreak,
        dailySummary: {
          targetCalories,
          consumedCalories: totals.calories,
        },
      }),
    [
      currentStreak,
      lastLogDate,
      hasLoggedToday,
      retention.streakRecovery,
      targetCalories,
      totals.calories,
    ]
  );

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

  const displayWeight = latestWeight ?? 0;
  const weightTrending = (latestWeight ?? 0) <= (goalWeightLbs ?? Infinity);

  // Check if user has seen swipe-to-delete tutorial
  useEffect(() => {
    const checkTutorial = async () => {
      const seen = await AsyncStorage.getItem("@swipe_tutorial_seen");
      if (!seen && todayMeals.length > 0) {
        setShowSwipeTutorial(true);
      }
    };
    checkTutorial();
  }, [todayMeals.length]);

  const dismissTutorial = async () => {
    setShowSwipeTutorial(false);
    await AsyncStorage.setItem("@swipe_tutorial_seen", "true");
  };

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

  // State change functions (no animation)
  const changeToPrevDay = useCallback(() => {
    if (selectedDayIndex > 0) {
      handleDaySelect(selectedDayIndex - 1);
    } else {
      // Going from Monday to previous Sunday
      const currentDate = new Date(selectedDate + "T12:00:00");
      currentDate.setDate(currentDate.getDate() - 1);
      setSelectedDate(toISODate(currentDate));
    }
  }, [selectedDayIndex, selectedDate, handleDaySelect, setSelectedDate]);

  const changeToNextDay = useCallback(() => {
    if (selectedDayIndex < 6) {
      handleDaySelect(selectedDayIndex + 1);
    } else {
      // Going from Sunday to next Monday
      const currentDate = new Date(selectedDate + "T12:00:00");
      currentDate.setDate(currentDate.getDate() + 1);
      setSelectedDate(toISODate(currentDate));
    }
  }, [selectedDayIndex, selectedDate, handleDaySelect, setSelectedDate]);

  // Arrow button handlers (with animation)
  const goToPrevDay = useCallback(() => {
    haptics.impact("light");
    // Trigger slide-out animation
    contentOpacity.value = withTiming(0.3, { duration: 120 });
    contentOffsetX.value = withTiming(
      SLIDE_OUT,
      {
        duration: 120,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      },
      (finished) => {
        if (!finished) return;
        runOnJS(changeToPrevDay)();

        // Slide in from right
        contentOffsetX.value = -SLIDE_OUT * 0.6;
        contentOpacity.value = 0.3;
        contentOffsetX.value = withTiming(0, {
          duration: 180,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        });
        contentOpacity.value = withTiming(1, { duration: 180 });
      }
    );
  }, [changeToPrevDay, contentOffsetX, contentOpacity, SLIDE_OUT]);

  const goToNextDay = useCallback(() => {
    haptics.impact("light");
    // Trigger slide-out animation
    contentOpacity.value = withTiming(0.3, { duration: 120 });
    contentOffsetX.value = withTiming(
      -SLIDE_OUT,
      {
        duration: 120,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
      },
      (finished) => {
        if (!finished) return;
        runOnJS(changeToNextDay)();

        // Slide in from left
        contentOffsetX.value = SLIDE_OUT * 0.6;
        contentOpacity.value = 0.3;
        contentOffsetX.value = withTiming(0, {
          duration: 180,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1.0),
        });
        contentOpacity.value = withTiming(1, { duration: 180 });
      }
    );
  }, [changeToNextDay, contentOffsetX, contentOpacity, SLIDE_OUT]);

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
            {t("home.frequentlyAdded")}
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
                    {entry.lastCalories} {t("tracking.kcal")}
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
              {t("home.logFirstMeal")}
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
          // Fire day change (no animation inside these functions)
          if (swiped > 0) {
            runOnJS(changeToPrevDay)();
          } else {
            runOnJS(changeToNextDay)();
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
    <View style={styles.container}>
      {/* Background with depth */}
      <LinearGradient
        colors={
          theme.mode === "light"
            ? [
                "#FAFAFA", // Very light gray
                "#FFFFFF", // Pure white
                "#F8F8F8", // Subtle gray at bottom
              ]
            : [
                theme.colors.background,
                theme.colors.background,
                theme.colors.surfaceSecondary,
              ]
        }
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative background shapes for depth */}
      <View style={styles.bgShapes}>
        {theme.mode === "light" ? (
          <>
            {/* Ultra-subtle radial gradient for soft depth */}
            <LinearGradient
              colors={[
                "rgba(0, 0, 0, 0.008)",
                "rgba(0, 0, 0, 0.002)",
                "rgba(0, 0, 0, 0)",
              ]}
              locations={[0, 0.5, 1]}
              style={{
                position: "absolute",
                top: "15%",
                left: "10%",
                right: "10%",
                height: 450,
                borderRadius: 225,
              }}
            />
          </>
        ) : (
          <>
            {/* Dark mode shapes only */}
            <LinearGradient
              colors={[
                "rgba(255, 255, 255, 0.03)",
                "rgba(255, 255, 255, 0.01)",
              ]}
              style={[styles.bgShape, styles.bgShapeTopLeft]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            <LinearGradient
              colors={[
                "rgba(255, 255, 255, 0.02)",
                "rgba(255, 255, 255, 0.005)",
              ]}
              style={[styles.bgShape, styles.bgShapeCenterRight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />

            <LinearGradient
              colors={[
                "rgba(255, 255, 255, 0.025)",
                "rgba(255, 255, 255, 0.01)",
              ]}
              style={[styles.bgShape, styles.bgShapeBottom]}
              start={{ x: 0, y: 1 }}
              end={{ x: 1, y: 0 }}
            />
          </>
        )}
      </View>

      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header */}
        <View testID="home-header" style={styles.header}>
          <View style={styles.headerLeft}>
            <TText
              variant="heading"
              numberOfLines={1}
              style={[styles.greeting, { color: theme.colors.text }]}
            >
              {isToday ? t("home.today") : dateHeader}
            </TText>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              style={styles.streakPill}
              accessibilityLabel={t("streak.dayStreak_other", {
                count: currentStreak,
              })}
              accessibilityRole="button"
              onPress={() => {
                haptics.impact("medium");
                setShowStreakModal(true);
              }}
            >
              <TText
                style={[
                  styles.streakFlame,
                  currentStreak === 0 && { opacity: 0.4 },
                ]}
              >
                🔥
              </TText>
              <AnimatedNumber
                value={currentStreak}
                style={[
                  styles.streakText,
                  {
                    color:
                      currentStreak > 0
                        ? theme.colors.text
                        : theme.colors.textMuted,
                  },
                ]}
              />
            </Pressable>
            <Pressable
              onPress={() => router.push("/progress" as any)}
              accessibilityLabel={t("home.currentWeightA11y", {
                weight: units.format(displayWeight),
              })}
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
              <AnimatedWeight
                currentValue={displayWeight}
                units={units}
                style={[styles.weightText, { color: theme.colors.text }]}
              />
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
              options={VIEW_MODE_OPTION_KEYS.map((o) => ({
                key: o.key,
                label: t(o.labelKey),
              }))}
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

          {/* Milestone insight — unified coaching card */}
          {viewMode === "D" && milestoneInsight && (
            <>
              <MilestoneInsightCard
                model={milestoneInsight}
                onPress={
                  milestoneInsight.state === "risk" ||
                  milestoneInsight.state === "recovery"
                    ? () => router.push("/tracking/text" as any)
                    : () => {
                        haptics.impact("medium");
                        setShowStreakModal(true);
                      }
                }
                onCTA={
                  milestoneInsight.action === "track_meal"
                    ? () => router.push("/tracking/text" as any)
                    : undefined
                }
              />
              <TSpacer size="sm" />
            </>
          )}

          {/* ── Daily view ── */}
          {viewMode === "D" && (
            <>
              {/* ── Calorie card (ring + footer) ── */}
              <View style={styles.calorieCard}>
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
                        dayLabel={
                          isToday ? t("home.today") : dateHeader.split(",")[0]
                        }
                        subtitle={t("home.calTarget", {
                          target: targetCalories.toLocaleString(),
                        })}
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
                      {t("home.consumed")}
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
                      {t("home.budget")}
                    </TText>
                  </View>
                </View>
              </View>
              {/* end calorieCard */}

              <TSpacer size="md" />

              {/* Macro + Activity pager */}
              <Animated.View testID="macro-cards" style={contentAnimStyle}>
                <View
                  onLayout={(e) =>
                    setMacroPagerWidth(Math.round(e.nativeEvent.layout.width))
                  }
                >
                  {macroPagerWidth > 0 && (
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      bounces={false}
                      scrollEventThrottle={200}
                      onScroll={(e) => {
                        const p = Math.round(
                          e.nativeEvent.contentOffset.x / macroPagerWidth
                        );
                        setMacroPage(p);
                      }}
                    >
                      {/* Page 0 — Macros */}
                      <View
                        style={{
                          width: macroPagerWidth,
                          flexDirection: "row",
                          gap: 10,
                        }}
                      >
                        <MacroCard
                          label={t("home.protein")}
                          consumedG={totals.protein}
                          targetG={proteinTarget}
                          color={MACRO_COLORS.protein}
                          icon="🍖"
                        />
                        <MacroCard
                          label={t("home.carbs")}
                          consumedG={totals.carbs}
                          targetG={carbsTarget}
                          color={MACRO_COLORS.carbs}
                          icon="🌾"
                        />
                        <MacroCard
                          label={t("home.fat")}
                          consumedG={totals.fat}
                          targetG={fatTarget}
                          color={MACRO_COLORS.fat}
                          icon="💧"
                        />
                      </View>
                      {/* Page 1 — Activity (placeholder — no step integration yet) */}
                      <View
                        style={{
                          width: macroPagerWidth,
                          flexDirection: "row",
                          gap: 10,
                        }}
                      >
                        <MacroCard
                          label={t("home.steps")}
                          consumedG={0}
                          targetG={10000}
                          color="#34C759"
                          icon="👟"
                          unit=""
                          display="consumed"
                        />
                        <MacroCard
                          label={t("home.activeCal")}
                          consumedG={0}
                          targetG={500}
                          color="#FF9500"
                          icon="🔥"
                          unit=""
                          display="consumed"
                        />
                      </View>
                    </ScrollView>
                  )}
                  {/* Page indicator dots */}
                  <View style={styles.pageDots}>
                    {[0, 1].map((i) => (
                      <View
                        key={i}
                        style={[
                          styles.pageDot,
                          {
                            backgroundColor:
                              macroPage === i
                                ? theme.colors.text
                                : theme.colors.border,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              </Animated.View>

              <TSpacer size="md" />

              {/* Water tracker card */}
              <Animated.View style={contentAnimStyle}>
                <Pressable
                  onPress={() => {
                    haptics.impact("light");
                    setShowWaterSettings(true);
                  }}
                >
                  <WaterCard
                    currentMl={waterMl}
                    goalMl={waterGoalMl}
                    incrementMl={waterIncrementMl}
                    onIncrement={() => {
                      addWater(todayISO, waterIncrementMl);
                      haptics.impact("light");
                    }}
                    onDecrement={() => {
                      subtractWater(todayISO, waterIncrementMl);
                      haptics.impact("light");
                    }}
                  />
                </Pressable>
              </Animated.View>
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
                onPrevWeek={goToPrevWeek}
                onNextWeek={goToNextWeek}
                onToday={goToToday}
                isToday={isToday}
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
                onPrevMonth={goToPrevMonth}
                onNextMonth={goToNextMonth}
                onToday={goToToday}
                isToday={isToday}
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
                {t("home.meals")}
              </TText>
              <TText
                style={[
                  styles.mealCount,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("home.logged", { count: todayMeals.length })}
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
                    {t("home.noMealsYet")}
                  </TText>
                  <TText
                    style={[
                      styles.emptyStateSubtitle,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {t("home.tapToLog")}
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

      {/* Swipe-to-delete tutorial overlay */}
      {showSwipeTutorial && (
        <SwipeTutorialOverlay onDismiss={dismissTutorial} theme={theme} />
      )}

      {/* Streak celebration modal */}
      <StreakModal
        visible={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        currentStreak={currentStreak}
        longestStreak={longestStreak ?? 0}
        lastLogDate={lastLogDate ?? null}
        streakStartDate={streakStartDate ?? null}
        freezeAvailable={streakFreezeAvailable}
        showFreezeUpsell={!hasActiveSubscription}
        onFreezeUpsell={() => {
          setShowStreakModal(false);
          router.push("/(onboarding)/paywall" as any);
        }}
      />

      {/* Water settings modal */}
      <WaterSettingsModal
        visible={showWaterSettings}
        onClose={() => setShowWaterSettings(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bgShapes: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  bgShape: {
    position: "absolute",
  },
  bgShapeTopLeft: {
    top: -150,
    left: -100,
    width: 350,
    height: 400,
    borderRadius: 80,
    transform: [{ rotate: "-15deg" }],
  },
  bgShapeCenterRight: {
    top: "35%",
    right: -120,
    width: 280,
    height: 500,
    borderRadius: 140,
    transform: [{ rotate: "25deg" }],
  },
  bgShapeBottom: {
    bottom: -200,
    left: "20%",
    width: 400,
    height: 350,
    borderRadius: 100,
    transform: [{ rotate: "10deg" }],
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
    height: 64,
  },
  headerLeft: {
    flex: 1,
    height: 48,
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
    gap: 24,
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
  pageDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  // Tutorial overlay styles
  tutorialOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  tutorialBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  tutorialContent: {
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    gap: 16,
  },
  tutorialTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  tutorialHint: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: 8,
  },
  tutorialDemo: {
    width: "100%",
    height: 70,
    position: "relative",
    marginVertical: 8,
  },
  tutorialCard: {
    position: "absolute",
    left: 0,
    width: "100%",
    height: "100%",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  tutorialIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tutorialMealName: {
    fontSize: 15,
    fontWeight: "600",
  },
  tutorialMealCal: {
    fontSize: 12,
    marginTop: 2,
  },
  tutorialDelete: {
    position: "absolute",
    right: 8,
    width: 70,
    height: "100%",
    backgroundColor: "#FF3B30",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tutorialButton: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  tutorialButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
