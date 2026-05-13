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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import {
  useFocusEffect,
  useGlobalSearchParams,
  useLocalSearchParams,
  useRouter,
  useUnstableGlobalHref,
} from "expo-router";
import { CircleUserRound } from "lucide-react-native";
import React, {
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    useTransition,
} from "react";
import {
    Alert,
    Dimensions,
    InteractionManager,
    type LayoutChangeEvent,
    Linking,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
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
import { useHealthAutoSync } from "../../src/features/health";
import { runAccountDataAudit } from "../../src/features/debug/run-account-data-audit";
import { useHomeData } from "../../src/features/home/use-home-data";
import { HomeRestoreSkeleton } from "../../src/features/home/HomeRestoreSkeleton";
import {
  MealTimeDragOverlay,
  type MealSectionRect,
} from "../../src/features/home/MealTimeDragOverlay";
import { useAuth } from "../../src/features/auth/useAuth";
import { usePermissionsStore } from "../../src/features/permissions";
import {
  COACH_ROUTES,
  useCoachInsight,
} from "../../src/features/retention/useCoachInsight";
import type { MealEntry } from "../../src/features/nutrition/nutrition.types";
import type { MealTime } from "../../src/features/nutrition/mealtime";
import {
    MEALTIME_ICONS,
    MEALTIME_LABELS,
    effectiveMealSectionKey,
    normaliseMealTime,
} from "../../src/features/nutrition/mealtime";
import { useNutritionDraftStore } from "../../src/features/nutrition/nutrition.draft.store";
import { resolveMealLoggedDateLocal } from "../../src/features/food-logging/time/create-meal-timestamp-fields";
import { isValidMealLoggedAt } from "../../src/features/nutrition/meal-normalize";
import { useNutritionStore } from "../../src/features/nutrition/nutrition.store";
import { useProfileStore } from "../../src/features/profile/profile.store";
import { useSettingsStore } from "../../src/features/settings";
import { applyLogReminderEnabled } from "../../src/features/reminders/apply-log-reminder-enabled";
import { useRetentionEngine } from "../../src/features/retention";
import { useSyncReadyStore } from "../../src/features/sync/sync-ready.store";
import { useStreakStore } from "../../src/features/streak/streak.store";
import { useSubscriptionStore } from "../../src/features/subscription/subscription.store";
import { useRevenueCat } from "../../src/features/subscription/useRevenueCat";
import { openManageSubscriptions } from "../../src/features/subscription/manage-subscription";
import { useWaterStore } from "../../src/features/water/water.store";
import { haptics } from "../../src/infrastructure/haptics";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { toISODate } from "../../src/lib/utils/date";
import { useTheme } from "../../src/theme/useTheme";
import {
    areLiveActivitiesAvailable,
    endLiveActivity,
} from "../../src/features/live-activity";
import { iosPhoneHasNotchOrDynamicIsland } from "../../src/platform/ios/hasDynamicIsland";
import { useBackgroundScanStore } from "../../src/features/camera/background-scan.store";
import { addFoodLoggingBreadcrumb } from "../../src/infrastructure/errorReporting/foodLoggingErrors";
import { reportError } from "../../src/infrastructure/errorReporting";
import { CalCutLogo } from "../../src/ui/brand/CalCutLogo";
import { AnalyzingCard } from "../../src/ui/components/AnalyzingCard";
import { DaySelector } from "../../src/ui/components/DaySelector";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { EditMealSheet } from "../../src/ui/components/EditMealSheet";
import {
  HamburgerMenu,
  type MenuSection,
} from "../../src/ui/components/HamburgerMenu";
import { MacroCard } from "../../src/ui/components/MacroCard";
import { CAMERA_LOG_ROUTE } from "../../src/features/food-logging/food-logging-routes";
import {
  LogFoodLauncherSheetContent,
  openHomeFoodLogSubSheet,
} from "../../src/features/food-logging/LogFoodLauncherSheetContent";
import { MealCard } from "../../src/ui/components/MealCard";
import { MilestoneInsightCard } from "../../src/ui/components/MilestoneInsightCard";
import { MonthlyView } from "../../src/ui/components/MonthlyView";
import { PerformanceSheet } from "../../src/ui/components/PerformanceSheet";
import { ProgressRing } from "../../src/ui/components/ProgressRing";
import { StreakModal } from "../../src/ui/components/StreakModal";
import { GlassToggleSwitch } from "../../src/ui/components/GlassToggleSwitch";
import { WaterCard } from "../../src/ui/components/WaterCard";
import { WaterSettingsModal } from "../../src/ui/components/WaterSettingsModal";
import { WeeklyView } from "../../src/ui/components/WeeklyView";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { useBottomSheet } from "../../src/ui/sheets/useBottomSheet";

/** Max time Home waits for `syncRestoredFor` before unblocking (local / repo data). */
const RESTORE_GATE_TIMEOUT_MS = 8000;

type LiveActivityFoodLogIntent = "manual" | "voice" | "camera";

function parseFoodLogQueryFromHref(href: string): LiveActivityFoodLogIntent | null {
  const noHash = href.split("#")[0];
  const qIdx = noHash.indexOf("?");
  if (qIdx === -1) return null;
  const v = new URLSearchParams(noHash.slice(qIdx + 1)).get("foodLog");
  return v === "manual" || v === "voice" || v === "camera" ? v : null;
}

function normalizeFoodLogParam(
  raw: string | string[] | undefined,
): LiveActivityFoodLogIntent | null {
  if (raw == null) return null;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v === "manual" || v === "voice" || v === "camera" ? v : null;
}

function resolveLiveActivityFoodLogIntent(params: {
  unstableHref: string;
  globalFoodLog?: string | string[];
  localFoodLog?: string | string[];
}): LiveActivityFoodLogIntent | null {
  return (
    parseFoodLogQueryFromHref(params.unstableHref) ??
    normalizeFoodLogParam(params.localFoodLog) ??
    normalizeFoodLogParam(params.globalFoodLog)
  );
}

/** Animated number display using React state with smooth transitions */
function AnimatedNumber({ value, style }: { value: number; style?: any }) {
  const [displayValue, setDisplayValue] = React.useState(value);

  React.useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    const duration = 400; // ms
    const startTime = Date.now();
    let rafId: number;
    let cancelled = false;

    const animate = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out function
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;

      setDisplayValue(Math.round(current));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
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
    let rafId: number;
    let cancelled = false;

    const animate = () => {
      if (cancelled) return;
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out function
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;

      setDisplayValue(current);

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
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

/** D/W/M segment options — keys resolved at render via t() */
const VIEW_MODE_OPTION_KEYS = [
  { key: "D", labelKey: "home.dayShort" },
  { key: "W", labelKey: "home.weekShort" },
  { key: "M", labelKey: "home.monthShort" },
] as const;

type ViewMode = "D" | "W" | "M";

const VIEW_MODES: ViewMode[] = ["D", "W", "M"];
const SEGMENT_W = 40;
const SEGMENT_H = 30;
const TOGGLE_PAD = 2;
const getHeaderTitleFontSize = (title: string) => {
  return title.length >= 9 ? 22 : 24;
};
const SLIDE_TIMING = {
  duration: 250,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

function ViewModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const { t } = useAppTranslation();
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const idx = VIEW_MODES.indexOf(value);
  const translateX = useSharedValue(idx * SEGMENT_W);

  useEffect(() => {
    const newIdx = VIEW_MODES.indexOf(value);
    translateX.value = withTiming(newIdx * SEGMENT_W, SLIDE_TIMING);
  }, [value, translateX]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Theme-aware colors (track is glass; indicator floats on top)
  const indicatorBg = isDark
    ? "rgba(255,255,255,0.22)"
    : "rgba(255,255,255,0.95)";
  const activeText = isDark ? "#FFFFFF" : theme.colors.text;
  const inactiveText = isDark
    ? "rgba(255,255,255,0.45)"
    : theme.colors.textSecondary;

  return (
    <GlassSurface
      variant="card"
      intensity="light"
      style={{
        flexDirection: "row",
        borderRadius: 16,
        padding: TOGGLE_PAD,
      }}
    >
      {/* Sliding indicator */}
      <Animated.View
        style={[
          {
            position: "absolute",
            top: TOGGLE_PAD,
            left: TOGGLE_PAD,
            width: SEGMENT_W,
            height: SEGMENT_H,
            borderRadius: 14,
            backgroundColor: indicatorBg,
          },
          indicatorStyle,
        ]}
        pointerEvents="none"
      />
      {VIEW_MODES.map((mode) => {
        const labelKey = VIEW_MODE_OPTION_KEYS.find((o) => o.key === mode)
          ?.labelKey;
        const label = labelKey ? t(labelKey) : mode;
        return (
          <Pressable
            key={mode}
            onPress={() => {
              haptics.selection();
              onChange(mode);
            }}
            style={{
              width: SEGMENT_W,
              height: SEGMENT_H,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 14,
            }}
          >
            <Text
              style={{
                color: value === mode ? activeText : inactiveText,
                fontSize: 13,
                fontWeight: "700",
              }}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </GlassSurface>
  );
}

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
    // Reanimated shared values are stable; animation runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- opacity & translateX are SharedValues
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

const HOME_MEAL_ORDER: MealTime[] = ["breakfast", "lunch", "dinner", "snack"];

export default function HomeScreen() {
  const { theme, toggleMode } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const unstableHref = useUnstableGlobalHref() ?? "";
  const localSearchParams = useLocalSearchParams<{
    foodLog?: string | string[];
  }>();
  const globalSearchParams = useGlobalSearchParams<{
    foodLog?: string | string[];
  }>();
  const liveActivityFoodLog = useMemo(
    () =>
      resolveLiveActivityFoodLogIntent({
        unstableHref,
        globalFoodLog: globalSearchParams.foodLog,
        localFoodLog: localSearchParams.foodLog,
      }),
    [
      unstableHref,
      globalSearchParams.foodLog,
      localSearchParams.foodLog,
    ],
  );

  // Prevent duplicate /progress pushes when the kg pill is tapped rapidly.
  // The ref resets each time Home re-focuses so back-navigation always works.
  const progressNavInFlightRef = useRef(false);
  useFocusEffect(
    useCallback(() => {
      progressNavInFlightRef.current = false;
    }, [])
  );
  const openProgress = useCallback(() => {
    if (progressNavInFlightRef.current) return;
    progressNavInFlightRef.current = true;
    queueMicrotask(() => {
      router.push("/progress" as any);
    });
  }, [router]);

  const { signOut, user } = useAuth();
  const openDeleteAccountFromMenu = useCallback(() => {
    if (__DEV__) {
      console.warn("[DeleteAccount] hamburger_press");
    }
    requestAnimationFrame(() => {
      if (__DEV__) {
        console.warn("[DeleteAccount] navigating_to_delete_modal", {
          canGoBack: router.canGoBack(),
        });
      }
      router.push("/(modals)/delete-account" as never);
    });
  }, [router]);
  const units = useUnits();
  const [viewMode, setViewMode] = useState<ViewMode>("D");
  const [tabViewMode, setTabViewMode] = useState<ViewMode>("D");
  const [, startViewModeTransition] = useTransition();
  const onViewModeChange = useCallback((next: ViewMode) => {
    setTabViewMode(next);
    startViewModeTransition(() => setViewMode(next));
  }, []);
  const [showSwipeTutorial, setShowSwipeTutorial] = useState(false);
  const [showStreakModal, setShowStreakModal] = useState(false);
  const [showWaterSettings, setShowWaterSettings] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [isOpeningManageSubscription, setIsOpeningManageSubscription] =
    useState(false);
  const [macroPage, setMacroPage] = useState(0);
  const [macroPagerWidth, setMacroPagerWidth] = useState(0);
  const [restoreGateTimedOut, setRestoreGateTimedOut] = useState(false);
  const homeRestoreGateLoggedRef = useRef(false);
  const { open: openSheet, close: closeSheet } = useBottomSheet();
  const logSheetOpenRef = useRef(openSheet);
  const logSheetCloseRef = useRef(closeSheet);
  logSheetOpenRef.current = openSheet;
  logSheetCloseRef.current = closeSheet;
  const liveActivityFoodLogHandledRef = useRef<string | null>(null);
  // Surface a flag when at least one visible pending review exists so we can
  // tighten the spacing above the queue without subscribing to the full list.
  const hasPendingReview = useBackgroundScanStore((s) => {
    for (const j of Object.values(s.jobs)) {
      if (
        j.status === "queued" ||
        j.status === "analyzing" ||
        j.status === "complete" ||
        j.status === "error"
      ) {
        return true;
      }
    }
    return false;
  });

  /** Scroll the home feed so "Recently uploaded" is visible after a new job appears. */
  const PENDING_REVIEW_SCROLL_PADDING = 16;
  const homeScrollRef = useRef<ScrollView>(null);
  const pendingReviewSectionYRef = useRef(0);
  const prevHasPendingReviewRef = useRef<boolean | null>(null);
  // Becomes true once the background-scan persist layer has finished
  // pulling jobs out of AsyncStorage. Until then, any false→true flip on
  // `hasPendingReview` is a hydration artefact (NOT a freshly-captured
  // scan) and must not trigger the auto-scroll.
  const scanStoreHydratedRef = useRef(false);

  useEffect(() => {
    const persist = useBackgroundScanStore.persist;
    if (persist.hasHydrated()) {
      scanStoreHydratedRef.current = true;
      // Sync the ref to the *post*-hydration value so the next render
      // sees prev=current and the diff in the layout effect is `false`.
      prevHasPendingReviewRef.current = useBackgroundScanStore
        .getState()
        ? Object.values(useBackgroundScanStore.getState().jobs).some(
            (j) =>
              j.status === "queued" ||
              j.status === "analyzing" ||
              j.status === "complete" ||
              j.status === "error"
          )
        : false;
      addFoodLoggingBreadcrumb("[OfflineHome] hydrated", {
        had_pending_review: prevHasPendingReviewRef.current,
      });
      return;
    }
    const unsub = persist.onFinishHydration((state) => {
      scanStoreHydratedRef.current = true;
      const hadPending = state
        ? Object.values(state.jobs ?? {}).some(
            (j) =>
              j.status === "queued" ||
              j.status === "analyzing" ||
              j.status === "complete" ||
              j.status === "error"
          )
        : false;
      // Pretend the previous render *also* had this many pending jobs so
      // the very next layout effect doesn't see false→true.
      prevHasPendingReviewRef.current = hadPending;
      addFoodLoggingBreadcrumb("[OfflineHome] hydrated", {
        had_pending_review: hadPending,
      });
    });
    return unsub;
  }, []);

  const onPendingReviewSectionLayout = useCallback(
    (e: LayoutChangeEvent) => {
      pendingReviewSectionYRef.current = e.nativeEvent.layout.y;
    },
    []
  );

  // Only auto-scroll on false→true caused by a NEW scan during this active
  // session. Cold-start hydration / login-restore must not trigger a snap:
  //   1. We require persist hydration to be confirmed (no in-flight rehydrate).
  //   2. The previous tracked value must already be a real session sample.
  useLayoutEffect(() => {
    if (!scanStoreHydratedRef.current) {
      // Still waiting for the persist layer. Don't update the ref or scroll.
      return;
    }
    if (prevHasPendingReviewRef.current === null) {
      prevHasPendingReviewRef.current = hasPendingReview;
      return;
    }
    const shouldSnap =
      hasPendingReview && !prevHasPendingReviewRef.current;
    prevHasPendingReviewRef.current = hasPendingReview;
    if (!shouldSnap) return;

    InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const y = pendingReviewSectionYRef.current;
          homeScrollRef.current?.scrollTo({
            y: Math.max(0, y - PENDING_REVIEW_SCROLL_PADDING),
            animated: true,
          });
        });
      });
    });
  }, [hasPendingReview]);

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

  const syncRestoredFor = useSyncReadyStore((s) => s.syncRestoredFor);
  const profileConfirmedFor = useSyncReadyStore((s) => s.profileConfirmedFor);
  /** Initial cloud meal restore finished for this user (do not block Home on profile alone). */
  const mealsReady = !user?.id || syncRestoredFor === user.id;
  /** Profile row verified for routing/sync — weight goal trend uses this when available. */
  const profileReady = !user?.id || profileConfirmedFor === user.id;
  const homeDataReady = mealsReady || restoreGateTimedOut;

  useEffect(() => {
    if (!user?.id) {
      setRestoreGateTimedOut(false);
      return;
    }
    if (syncRestoredFor === user.id) {
      setRestoreGateTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      const snap = useSyncReadyStore.getState();
      if (__DEV__) {
        console.warn("[HomeRestoreGate] timed_out", {
          userId: user.id,
          syncRestoredFor: snap.syncRestoredFor,
          profileConfirmedFor: snap.profileConfirmedFor,
        });
      }
      reportError(new Error("Home restore gate timed out"), {
        area: "sync",
        action: "home_restore_gate_timed_out",
        userId: user.id,
        level: "warning",
        extra: {
          syncRestoredFor: snap.syncRestoredFor,
          profileConfirmedFor: snap.profileConfirmedFor,
        },
      });
      setRestoreGateTimedOut(true);
    }, RESTORE_GATE_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [user?.id, syncRestoredFor]);

  const shouldRunAccountDataAudit =
    __DEV__ || process.env.EXPO_PUBLIC_ACCOUNT_DATA_AUDIT === "1";

  useEffect(() => {
    if (!user?.id || !shouldRunAccountDataAudit || !homeDataReady) return;
    const meals = useNutritionStore.getState().meals;
    const weekKeySet = new Set(weekDays.map((d) => d.key));
    const monthKeySet = new Set(
      monthGrid.days.filter(Boolean).map((c) => c!.key)
    );
    const monthDaysSeen = new Set<string>();
    let weekMealRowTotal = 0;
    let monthMealRowTotal = 0;
    let mealsForSelectedDay = 0;
    for (const m of meals) {
      if (!m || !isValidMealLoggedAt(m.loggedAt)) continue;
      let k: string;
      try {
        k = resolveMealLoggedDateLocal(m);
      } catch {
        continue;
      }
      if (k === selectedDate) mealsForSelectedDay++;
      if (weekKeySet.has(k)) weekMealRowTotal++;
      if (monthKeySet.has(k)) {
        monthMealRowTotal++;
        monthDaysSeen.add(k);
      }
    }
    const monthDaysWithMeals = monthDaysSeen.size;
    void runAccountDataAudit(user.id, {
      viewMode,
      selectedDate,
      mealsForSelectedDay,
      weekMealRowTotal,
      monthDaysWithMeals,
      monthMealRowTotal,
    }).catch((error) => {
      console.error("[AccountDataAudit] failed", error);
    });
  }, [
    user?.id,
    shouldRunAccountDataAudit,
    homeDataReady,
    viewMode,
    selectedDate,
    weekDays,
    monthGrid.days,
  ]);

  const removeMeal = useNutritionStore((s) => s.removeMeal);
  const updateMeal = useNutritionStore((s) => s.updateMeal);
  const mealsInStoreCount = useNutritionStore((s) => s.meals.length);
  const profileForGate = useProfileStore((s) => s.profile);
  const goalWeightLbs = useProfileStore((s) => s.profile.goalWeightLbs);
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const longestStreak = useStreakStore((s) => s.longestStreak);
  const lastLogDate = useStreakStore((s) => s.lastLogDate);
  const streakStartDate = useStreakStore((s) => s.streakStartDate);
  const streakFreezeAvailable = useStreakStore((s) => s.streakFreezeAvailable);

  useEffect(() => {
    if (!user?.id || homeDataReady) {
      homeRestoreGateLoggedRef.current = false;
      return;
    }
    if (homeRestoreGateLoggedRef.current) return;
    homeRestoreGateLoggedRef.current = true;
    console.log("[HomeRestoreGate]", {
      userId: user?.id ?? null,
      syncRestoredFor,
      profileConfirmedFor,
      mealsInStore: mealsInStoreCount,
      hasProfile: Boolean(
        profileForGate?.id && profileForGate.id !== "local-user"
      ),
      restoreGateTimedOut,
      homeDataReady,
      mealsReady,
      profileReady,
    });
  }, [
    user?.id,
    homeDataReady,
    syncRestoredFor,
    profileConfirmedFor,
    mealsInStoreCount,
    profileForGate?.id,
    restoreGateTimedOut,
    mealsReady,
    profileReady,
  ]);

  const hasActiveSubscription = useSubscriptionStore(
    (s) => s.subscription.hasActiveSubscription
  );
  const {
    isPro,
    presentPaywall,
    presentCustomerCenter,
    restorePurchases,
    isRestoring,
  } = useRevenueCat();
  const liveActivitiesEnabled = usePermissionsStore(
    (s) => s.permissions.liveActivitiesEnabled
  );
  const setLiveActivitiesEnabled = usePermissionsStore(
    (s) => s.setLiveActivitiesEnabled
  );

  const handleToggleLiveActivities = useCallback(
    (value: boolean) => {
      if (value) {
        if (Platform.OS !== "ios") {
          Alert.alert(t("settings.iosOnly"), t("settings.iosOnlyDesc"));
          return;
        }
        const available = areLiveActivitiesAvailable();
        if (!available) {
          Alert.alert(
            t("settings.liveActivityUnavailable"),
            t("settings.liveActivityUnavailableDesc")
          );
          return;
        }
      }
      haptics.impact("light");
      setLiveActivitiesEnabled(value);
      if (!value) endLiveActivity();
    },
    [setLiveActivitiesEnabled, t]
  );

  const logReminderEnabled = useSettingsStore(
    (s) => s.settings.logReminderEnabled
  );

  const handleLogReminderToggle = useCallback(async () => {
    haptics.impact("light");
    await applyLogReminderEnabled(!logReminderEnabled);
  }, [logReminderEnabled]);

  const todayMeals = dailySummary.meals;

  // ── Retention engine ──
  const retention = useRetentionEngine();

  // ── Apple Health auto-sync on foreground ──
  useHealthAutoSync();

  // Record app open once per session
  useEffect(() => {
    retention.recordOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Day 0 auto-camera: only after home data is trustworthy (avoid empty-state illusion).
  useEffect(() => {
    if (!homeDataReady) return;
    if (retention.shouldShowCamera) {
      retention.markCameraShown();
      // Small delay to let the home screen render first
      const timer = setTimeout(() => {
        router.push(CAMERA_LOG_ROUTE as never);
      }, 600);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retention.shouldShowCamera, homeDataReady]);

  const totals = {
    calories: dailySummary.totalCalories,
    protein: dailySummary.totalProtein,
    carbs: dailySummary.totalCarbs,
    fat: dailySummary.totalFat,
  };
  const targetCalories = calorieBudget;
  /** Budget ring + macro targets only after profile is confirmed for this session. */
  const canShowGoals = profileReady && calorieBudget > 0;
  const ringTargetCalories = canShowGoals ? targetCalories : 0;
  const calorieProgressForRing = canShowGoals ? calorieProgress : 0;
  const coachInsight = useCoachInsight();
  const milestoneInsight = coachInsight.milestoneModel;

  // Group meals by category in display order
  const groupedMeals = useMemo(() => {
    const groups: Record<MealTime, typeof todayMeals> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    };
    for (const meal of todayMeals) {
      const mt = effectiveMealSectionKey(meal);
      groups[mt].push(meal);
    }
    return groups;
  }, [todayMeals]);

  const mealSectionRefs = useRef<Partial<Record<MealTime, View | null>>>({});
  const [mealDragSession, setMealDragSession] = useState<{
    meal: MealEntry;
    sourceMealTime: MealTime;
    cardRect: { x: number; y: number; width: number; height: number };
    finger: { pageX: number; pageY: number };
    sectionRects: Partial<Record<MealTime, MealSectionRect>>;
  } | null>(null);
  const [isMealDragging, setIsMealDragging] = useState(false);
  const mealDragSessionRef = useRef(mealDragSession);
  mealDragSessionRef.current = mealDragSession;
  const dragLockRef = useRef(false);

  const visibleMealSectionCount = useMemo(
    () => HOME_MEAL_ORDER.filter((mt) => groupedMeals[mt].length > 0).length,
    [groupedMeals]
  );

  const beginMealTimeDrag = useCallback(
    async (
      meal: MealEntry,
      sourceMealTime: MealTime,
      layout: { x: number; y: number; width: number; height: number },
      finger: { pageX: number; pageY: number }
    ) => {
      if (dragLockRef.current || mealDragSessionRef.current) return;
      const sections = HOME_MEAL_ORDER.filter(
        (mt) => mealSectionRefs.current[mt]
      );
      if (sections.length < 2) return;
      setIsMealDragging(true);
      dragLockRef.current = true;
      try {
        const rects: Partial<Record<MealTime, MealSectionRect>> = {};
        await Promise.all(
          sections.map(
            (mt) =>
              new Promise<void>((resolve) => {
                const node = mealSectionRefs.current[mt];
                if (!node) {
                  resolve();
                  return;
                }
                node.measureInWindow((x, y, w, h) => {
                  rects[mt] = { x, y, width: w, height: h };
                  resolve();
                });
              })
          )
        );
        await haptics.selection();
        if (__DEV__) {
          console.log("[MealTimeDrag] start", meal.id, sourceMealTime);
        }
        setMealDragSession({
          meal,
          sourceMealTime,
          cardRect: layout,
          finger,
          sectionRects: rects,
        });
      } catch (e) {
        if (__DEV__) {
          console.warn("[MealTimeDrag] begin failed", e);
        }
        setIsMealDragging(false);
      } finally {
        requestAnimationFrame(() => {
          dragLockRef.current = false;
        });
      }
    },
    []
  );

  const finishMealTimeDrag = useCallback(
    (target: MealTime | null) => {
      setMealDragSession((session) => {
        if (!session) {
          return null;
        }
        if (!target) {
          if (__DEV__) console.log("[MealTimeDrag] cancelled");
          void haptics.selection();
          return null;
        }
        const nextMt = normaliseMealTime(target);
        if (nextMt === session.sourceMealTime) {
          if (__DEV__) console.log("[MealTimeDrag] cancelled same_section");
          void haptics.selection();
          return null;
        }
        updateMeal(session.meal.id, { mealTime: nextMt });
        if (__DEV__) {
          console.log("[MealTimeDrag] dropped", session.meal.id, nextMt);
          console.log("[MealTimeDrag] persisted_local", session.meal.id, nextMt);
        }
        void haptics.notification("success");
        return null;
      });
      setIsMealDragging(false);
      dragLockRef.current = false;
    },
    [updateMeal]
  );

  const lw = latestWeight;
  const hasValidWeight =
    lw != null && Number.isFinite(lw) && lw > 0;
  /** Goal-relative trend only when profile is confirmed — avoids wrong arrow during lagging profile pull. */
  const weightTrending =
    hasValidWeight &&
    profileReady &&
    lw <= (goalWeightLbs ?? Infinity);
  const dayTitle = isToday
    ? t("home.today")
    : dateHeader.replace(/[\s,]*\d+.*$/, "");

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
  const overLimit = useOverLimitColor(calorieProgressForRing);

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

  const setLogDate = useNutritionDraftStore((s) => s.setLogDate);

  const openLogSheet = useCallback(() => {
    haptics.impact("light");
    setLogDate(isToday ? null : selectedDate);
    openSheet(
      <LogFoodLauncherSheetContent
        variant="home"
        homeSelectedDate={selectedDate}
        homeIsToday={isToday}
      />,
      { snapPoints: ["50%", "92%"] }
    );
  }, [
    openSheet,
    setLogDate,
    isToday,
    selectedDate,
  ]);

  /** Match FAB: open the log-options sheet, not the legacy /(modals)/tracking flow */
  const navigateCoachInsightRoute = useCallback(() => {
    if (coachInsight.route === COACH_ROUTES.meal) {
      openLogSheet();
    } else {
      router.push(coachInsight.route as never);
    }
  }, [coachInsight.route, openLogSheet, router]);

  // Dynamic Island / Live Activity CTAs → same sheets as Home “+” (not legacy /tracking/*).
  useEffect(() => {
    if (!liveActivityFoodLog) {
      liveActivityFoodLogHandledRef.current = null;
      return;
    }
    if (
      liveActivityFoodLog !== "manual" &&
      liveActivityFoodLog !== "voice" &&
      liveActivityFoodLog !== "camera"
    ) {
      return;
    }
    if (!homeDataReady || !user?.id) return;
    if (liveActivityFoodLogHandledRef.current === liveActivityFoodLog) {
      return;
    }

    liveActivityFoodLogHandledRef.current = liveActivityFoodLog;
    const intent = liveActivityFoodLog;

    let cancelled = false;
    const job = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      if (intent === "camera") {
        haptics.impact("light");
        router.replace("/(tabs)" as never);
        setLogDate(isToday ? null : selectedDate);
        router.push(CAMERA_LOG_ROUTE as never);
        return;
      }
      haptics.impact("light");
      openHomeFoodLogSubSheet(intent, {
        open: logSheetOpenRef.current,
        close: logSheetCloseRef.current,
        setLogDate,
        homeSelectedDate: selectedDate,
        homeIsToday: isToday,
      });
      queueMicrotask(() => {
        try {
          router.setParams({ foodLog: undefined } as never);
        } catch {
          /* noop */
        }
      });
    });
    return () => {
      cancelled = true;
      job.cancel();
      if (liveActivityFoodLogHandledRef.current === intent) {
        liveActivityFoodLogHandledRef.current = null;
      }
    };
  }, [
    liveActivityFoodLog,
    homeDataReady,
    user?.id,
    router,
    setLogDate,
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

  const renderGlassSwitch = useCallback(
    (value: boolean, onToggle: () => void) => (
      <GlassToggleSwitch value={value} onToggle={onToggle} />
    ),
    []
  );

  const unitsAccessory = useMemo(() => {
    const isMetric = units.weightUnit === "kg";
    return (
      <View
        style={{
          flexDirection: "row",
          borderRadius: 9,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: theme.colors.primary,
          backgroundColor:
            theme.mode === "dark"
              ? "rgba(255,255,255,0.07)"
              : "rgba(255,255,255,0.55)",
        }}
      >
        <Pressable
          onPress={() => units.setWeightUnit("kg")}
          style={{
            paddingHorizontal: 9,
            paddingVertical: 4,
            backgroundColor: isMetric ? theme.colors.primary : "transparent",
          }}
        >
          <TText
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: isMetric ? "#fff" : theme.colors.primary,
            }}
          >
            {t("settings.metric")}
          </TText>
        </Pressable>
        <Pressable
          onPress={() => units.setWeightUnit("lbs")}
          style={{
            paddingHorizontal: 9,
            paddingVertical: 4,
            backgroundColor: !isMetric ? theme.colors.primary : "transparent",
          }}
        >
          <TText
            style={{
              fontSize: 11,
              fontWeight: "700",
              color: !isMetric ? "#fff" : theme.colors.primary,
            }}
          >
            {t("settings.imperial")}
          </TText>
        </Pressable>
      </View>
    );
  }, [theme, units, t]);

  const handleManageSubscription = useCallback(async () => {
    if (isOpeningManageSubscription) return;
    haptics.impact("light");
    setIsOpeningManageSubscription(true);
    try {
      if (!isPro) {
        Alert.alert(
          "No active subscription found",
          "You can still check subscriptions in your App Store account settings."
        );
      }
      const result = await openManageSubscriptions();
      if (result === "failed") {
        Alert.alert(
          "Couldn't open subscriptions",
          "You can manage subscriptions from your App Store account settings."
        );
      }
    } catch {
      Alert.alert(
        "Couldn't open subscriptions",
        "You can manage subscriptions from your App Store account settings."
      );
    } finally {
      setIsOpeningManageSubscription(false);
    }
  }, [isOpeningManageSubscription, isPro]);

  const profileMenuSections = useMemo<MenuSection[]>(() => {
    const sections: MenuSection[] = [
      {
        items: [
          {
            key: "upgrade",
            label: isPro ? t("settings.youArePro") : t("settings.upgradeToPro"),
            icon: "star",
            onPress: isPro
              ? () => {
                  void presentCustomerCenter();
                }
              : presentPaywall,
          },
        ],
      },
      {
        title: t("settings.appearance"),
        items: [
          {
            key: "dark-mode",
            label: t("settings.darkMode"),
            icon: theme.mode === "dark" ? "moon" : "sunny",
            keepOpenOnPress: true,
            onPress: () => toggleMode(),
            rightAccessory: renderGlassSwitch(theme.mode === "dark", () =>
              toggleMode()
            ),
          },
        ],
      },
      {
        title: t("settings.general"),
        items: [
          {
            key: "voice-text",
            label: t("settings.voiceTextInput"),
            icon: "globe-outline",
            onPress: () =>
              router.push("/(main)/settings/voice-text-input" as any),
          },
          {
            key: "units",
            label: t("settings.units"),
            icon: "resize-outline",
            keepOpenOnPress: true,
            onPress: () => units.toggleWeightUnit(),
            rightAccessory: unitsAccessory,
          },
          {
            key: "body-measurements",
            label: t("settings.bodyMeasurements"),
            icon: "accessibility-outline",
            onPress: () =>
              router.push("/(main)/settings/body-measurements" as any),
          },
          {
            key: "notifications",
            label: t("settings.notifications"),
            icon: "notifications-outline",
            keepOpenOnPress: true,
            onPress: () => {
              void handleLogReminderToggle();
            },
            rightAccessory: renderGlassSwitch(
              logReminderEnabled,
              () => {
                void handleLogReminderToggle();
              }
            ),
          },
        ],
      },
    ];

    if (Platform.OS === "ios") {
      sections.push({
        title: t("settings.appleHealth"),
        items: [
          {
            key: "apple-health",
            label: t("settings.appleHealth"),
            icon: "heart",
            onPress: () => router.push("/(main)/settings/apple-health" as any),
          },
        ],
      });
    }

    if (iosPhoneHasNotchOrDynamicIsland()) {
      sections.push({
        title: t("settings.extensions"),
        items: [
          {
            key: "live-activities",
            label: t("settings.liveActivities"),
            icon: "phone-portrait-outline",
            keepOpenOnPress: true,
            onPress: () =>
              handleToggleLiveActivities(!liveActivitiesEnabled),
            rightAccessory: renderGlassSwitch(liveActivitiesEnabled, () =>
              handleToggleLiveActivities(!liveActivitiesEnabled)
            ),
          },
        ],
      });
    }

    sections.push({
      title: t("settings.social"),
      items: [
        {
          key: "social-instagram",
          label: t("settings.socialInstagram"),
          icon: "logo-instagram",
          onPress: () =>
            void Linking.openURL("https://www.instagram.com/getcalcut/").catch(
              () => {}
            ),
        },
        {
          key: "social-tiktok",
          label: t("settings.socialTiktok"),
          icon: "logo-tiktok",
          onPress: () =>
            void Linking.openURL("https://www.tiktok.com/@getcalcut").catch(
              () => {}
            ),
        },
      ],
    });

    sections.push(
      {
        title: t("settings.legal"),
        items: [
          {
            key: "privacy",
            label: t("settings.privacyPolicy"),
            icon: "document-text-outline",
            onPress: () =>
              router.push({
                pathname: "/(modals)/web-viewer",
                params: {
                  url: encodeURIComponent("https://caloric-sage.vercel.app/privacy"),
                  title: encodeURIComponent("Privacy Policy"),
                },
              }),
          },
          {
            key: "terms",
            label: t("settings.termsOfService"),
            icon: "document-outline",
            onPress: () =>
              router.push({
                pathname: "/(modals)/web-viewer",
                params: {
                  url: encodeURIComponent("https://caloric-sage.vercel.app/terms"),
                  title: encodeURIComponent("Terms of Service"),
                },
              }),
          },
        ],
      },
      {
        title: t("settings.subscription"),
        items: [
          {
            key: "restore",
            label: isRestoring
              ? t("settings.restoring")
              : t("settings.restorePurchases"),
            icon: "arrow-undo-outline",
            onPress: isRestoring ? undefined : restorePurchases,
            disabled: isRestoring,
          },
          {
            key: "manage-subscription",
            label: isOpeningManageSubscription
              ? `${t("settings.manageSubscription")} (${t("common.loading")})`
              : t("settings.manageSubscription"),
            icon: "settings-outline",
            onPress: isOpeningManageSubscription
              ? undefined
              : handleManageSubscription,
            disabled: isOpeningManageSubscription,
          },
        ],
      },
      {
        title: t("settings.account"),
        items: [
          {
            key: "email",
            label: user?.email ? `${t("common.email")}: ${user.email}` : t("common.email"),
            icon: "mail-outline",
            disabled: true,
          },
          {
            key: "sign-out",
            label: t("settings.signOut"),
            icon: "log-out-outline",
            destructive: true,
            onPress: () => {
              Alert.alert(t("settings.signOut"), t("settings.signOutConfirm"), [
                { text: t("common.cancel"), style: "cancel" },
                {
                  text: t("settings.signOut"),
                  style: "destructive",
                  onPress: async () => {
                    await signOut();
                    router.replace("/(onboarding)/landing");
                  },
                },
              ]);
            },
          },
          {
            key: "delete-account",
            label: t("settings.deleteAccount"),
            icon: "trash-outline",
            destructive: true,
            onPress: openDeleteAccountFromMenu,
          },
        ],
      }
    );

    return sections;
  }, [
    isPro,
    t,
    presentPaywall,
    presentCustomerCenter,
    theme.mode,
    toggleMode,
    router,
    isRestoring,
    restorePurchases,
    isOpeningManageSubscription,
    handleManageSubscription,
    user?.email,
    signOut,
    renderGlassSwitch,
    units,
    unitsAccessory,
    handleToggleLiveActivities,
    logReminderEnabled,
    handleLogReminderToggle,
    liveActivitiesEnabled,
    openDeleteAccountFromMenu,
  ]);

  if (user?.id && !homeDataReady) {
    return <HomeRestoreSkeleton />;
  }

  return (
    <View style={styles.container}>
      {/* Glassy hue background */}
      <LinearGradient
        colors={
          theme.mode === "light"
            ? [
                "#EDF4EF", // top: soft frosted mint
                "#E8F0EB", // upper-mid
                "#E2ECE6", // mid: gentle green tint
                "#DDE8E1", // lower-mid: slightly deeper
                "#D8E4DC", // bottom: subtle sage wash
              ]
            : [
                theme.colors.background,
                theme.colors.background,
                theme.colors.surfaceSecondary,
              ]
        }
        locations={
          theme.mode === "light" ? [0, 0.25, 0.5, 0.75, 1] : [0, 0.45, 1]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative background shapes for depth */}
      <View style={styles.bgShapes}>
        {theme.mode === "light" ? (
          <>
            {/* Full-width top edge fade — frosted glass band */}
            <LinearGradient
              colors={[
                "rgba(34, 197, 94, 0.06)",
                "rgba(34, 197, 94, 0.025)",
                "rgba(34, 197, 94, 0)",
              ]}
              locations={[0, 0.4, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 320,
              }}
            />
            {/* Left edge linear fade — soft emerald bleed */}
            <LinearGradient
              colors={[
                "rgba(16, 185, 129, 0.06)",
                "rgba(16, 185, 129, 0.02)",
                "rgba(16, 185, 129, 0)",
              ]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0.3 }}
              end={{ x: 1, y: 0.5 }}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: "60%",
              }}
            />
            {/* Center horizontal glassy band behind ring */}
            <LinearGradient
              colors={[
                "rgba(255, 255, 255, 0)",
                "rgba(255, 255, 255, 0.35)",
                "rgba(255, 255, 255, 0.45)",
                "rgba(255, 255, 255, 0.35)",
                "rgba(255, 255, 255, 0)",
              ]}
              locations={[0, 0.2, 0.5, 0.8, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{
                position: "absolute",
                top: "15%",
                left: 0,
                right: 0,
                height: 380,
              }}
            />
            {/* Bottom edge fade — teal wash */}
            <LinearGradient
              colors={[
                "rgba(16, 185, 129, 0)",
                "rgba(16, 185, 129, 0.02)",
                "rgba(16, 185, 129, 0.05)",
              ]}
              locations={[0, 0.5, 1]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: 280,
              }}
            />
            {/* Right edge subtle accent bleed */}
            <LinearGradient
              colors={[
                "rgba(52, 211, 153, 0)",
                "rgba(52, 211, 153, 0.025)",
                "rgba(52, 211, 153, 0.04)",
              ]}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0.4 }}
              end={{ x: 1, y: 0.6 }}
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                width: "50%",
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
          <View style={styles.headerTopRow}>
            <View style={styles.brandPill}>
              <CalCutLogo size={40} color={theme.colors.text} />
              <TText style={[styles.brandText, { color: theme.colors.text }]}>
                {t("home.brandName")}
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
                onPress={openProgress}
                accessibilityLabel={
                  !hasValidWeight
                    ? t("home.currentWeightA11yUnset", {
                        defaultValue:
                          "Current weight, not set — open progress to add",
                      })
                    : t("home.currentWeightA11y", {
                        weight: units.format(lw),
                      })
                }
                accessibilityRole="button"
                style={({ pressed }) => [pressed && styles.weightPillPressed]}
              >
                <GlassSurface variant="card" intensity="light" style={styles.weightPill}>
                  <Ionicons
                    name={
                      !hasValidWeight || !profileReady
                        ? "analytics-outline"
                        : weightTrending
                          ? "trending-down"
                          : "trending-up"
                    }
                    size={14}
                    color={
                      !hasValidWeight || !profileReady
                        ? theme.colors.textMuted
                        : weightTrending
                          ? theme.colors.success
                          : theme.colors.warning
                    }
                  />
                  {!hasValidWeight ? (
                    <TText
                      style={[
                        styles.weightText,
                        { color: theme.colors.textMuted },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                    >
                      {t("home.weightSetPrompt", {
                        defaultValue: "Set weight",
                      })}
                    </TText>
                  ) : (
                    <AnimatedWeight
                      currentValue={lw}
                      units={units}
                      style={[styles.weightText, { color: theme.colors.text }]}
                    />
                  )}
                </GlassSurface>
              </Pressable>
              <HamburgerMenu
                open={profileMenuOpen}
                onToggle={setProfileMenuOpen}
                side="right"
                sections={profileMenuSections}
                drawerWidth={300}
                accessibilityLabel="Profile menu"
                renderTrigger={({ onToggle }) => (
                  <Pressable
                    onPress={onToggle}
                    hitSlop={12}
                    accessibilityLabel="Profile menu"
                    accessibilityRole="button"
                  >
                    <CircleUserRound size={22} color={theme.colors.textMuted} />
                  </Pressable>
                )}
              />
            </View>
          </View>
        </View>

        <ScrollView
          ref={homeScrollRef}
          testID="home-scroll"
          scrollEnabled={!isMealDragging}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TSpacer size="sm" />

          {/* Day label + D / W / M Segmented Control (centered) */}
          <View style={styles.dayToggleRow}>
            <TText
              variant="heading"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              style={[
                styles.dayLabel,
                {
                  color: theme.colors.text,
                  fontSize: getHeaderTitleFontSize(dayTitle),
                },
              ]}
            >
              {dayTitle}
            </TText>
            <View style={styles.segmentToggle}>
              <ViewModeToggle value={tabViewMode} onChange={onViewModeChange} />
            </View>
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
                        target={ringTargetCalories}
                        size={220}
                        strokeWidth={18}
                        color={overLimit.color}
                        dayLabel={
                          isToday ? t("home.today") : dateHeader.split(",")[0]
                        }
                        subtitle={
                          canShowGoals
                            ? t("home.calTarget", {
                                target: targetCalories.toLocaleString(),
                              })
                            : t("common.loading", { defaultValue: "…" })
                        }
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

                {/* Consumed / Budget — glass pill (matches macro cards / weight pill) */}
                <View testID="consumed-budget" style={styles.ringFooter}>
                  <GlassSurface
                    variant="pill"
                    intensity="light"
                    style={styles.consumedBudgetPill}
                  >
                    <View style={styles.ringFooterItem}>
                      <TText
                        style={[
                          styles.ringFooterValue,
                          {
                            color: canShowGoals
                              ? overLimit.color
                              : theme.colors.text,
                          },
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
                        {canShowGoals ? targetCalories : "—"}
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
                  </GlassSurface>
                </View>
              </View>
              {/* end calorieCard */}

              <TSpacer size="md" />

              {/* Milestone insight — unified coaching card */}
              {milestoneInsight && (
                <>
                  <MilestoneInsightCard
                    model={{
                      ...milestoneInsight,
                      title: coachInsight.title,
                      subtitle: coachInsight.subtitle,
                      ctaLabel: coachInsight.ctaLabel,
                    }}
                    onPress={() => {
                      haptics.impact("medium");
                      switch (milestoneInsight.state) {
                        case "risk":
                        case "recovery":
                          openLogSheet();
                          break;
                        case "milestone_achieved":
                        case "momentum":
                        case "milestone_preview":
                        default:
                          openSheet(
                            <PerformanceSheet
                              model={milestoneInsight}
                              longestStreak={longestStreak ?? 0}
                              caloriesRemaining={
                                canShowGoals
                                  ? Math.max(
                                      0,
                                      targetCalories - totals.calories
                                    )
                                  : 0
                              }
                              proteinRemaining={
                                canShowGoals
                                  ? Math.max(
                                      0,
                                      proteinTarget - totals.protein
                                    )
                                  : 0
                              }
                              onClose={closeSheet}
                              onTrack={() => {
                                closeSheet();
                                setTimeout(() => navigateCoachInsightRoute(), 300);
                              }}
                            />,
                            { snapPoints: ["70%"] }
                          );
                          break;
                      }
                    }}
                    onCTA={() => {
                      haptics.impact("light");
                      navigateCoachInsightRoute();
                    }}
                  />
                  <TSpacer size="sm" />
                </>
              )}

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
                      scrollEnabled={!isMealDragging}
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
                          targetG={canShowGoals ? proteinTarget : 0}
                          color={MACRO_COLORS.protein}
                          icon="🍖"
                        />
                        <MacroCard
                          label={t("home.carbs")}
                          consumedG={totals.carbs}
                          targetG={canShowGoals ? carbsTarget : 0}
                          color={MACRO_COLORS.carbs}
                          icon="🌾"
                        />
                        <MacroCard
                          label={t("home.fat")}
                          consumedG={totals.fat}
                          targetG={canShowGoals ? fatTarget : 0}
                          color={MACRO_COLORS.fat}
                          icon="🥑"
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
                          color={theme.colors.primary}
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
                calorieBudget={canShowGoals ? calorieBudget : 0}
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

          {/*
            "Recently uploaded" lives between the day selector / macro cards
            and the meals list. The card's own header gives it breathing room
            when present; we render a spacer only when there's no active job.
            Wrapped for layout measurement so we can scroll the feed into view
            when a new pending job appears after dismiss (e.g. camera).
          */}
          <View
            collapsable={false}
            onLayout={onPendingReviewSectionLayout}
            testID="pending-review-section"
          >
            {hasPendingReview ? null : <TSpacer size="lg" />}
            <AnalyzingCard />
          </View>

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
                HOME_MEAL_ORDER.filter((mt) => groupedMeals[mt].length > 0).map(
                  (mt) => (
                    <View
                      key={mt}
                      ref={(r) => {
                        mealSectionRefs.current[mt] = r;
                      }}
                      style={styles.mealGroup}
                    >
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
                      {groupedMeals[mt].map((meal) => {
                        const isDragSource =
                          mealDragSession?.meal.id === meal.id;
                        return (
                          <View
                            key={meal.id}
                            collapsable={false}
                            style={
                              isDragSource
                                ? { opacity: 0, pointerEvents: "none" }
                                : undefined
                            }
                          >
                            <MealCard
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
                              onLongPressMoveStart={
                                visibleMealSectionCount > 1
                                  ? (layout, finger) => {
                                      void beginMealTimeDrag(
                                        meal,
                                        mt,
                                        layout,
                                        finger
                                      );
                                    }
                                  : undefined
                              }
                            />
                          </View>
                        );
                      })}
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

      {mealDragSession ? (
        <MealTimeDragOverlay
          visible
          meal={mealDragSession.meal}
          sourceMealTime={mealDragSession.sourceMealTime}
          cardRect={mealDragSession.cardRect}
          finger={mealDragSession.finger}
          sectionRects={mealDragSession.sectionRects}
          mealOrder={HOME_MEAL_ORDER}
          onFinish={finishMealTimeDrag}
        />
      ) : null}

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
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: {
    flexShrink: 1,
    marginRight: 8,
  },
  brandPillRow: {
    alignItems: "center",
    marginBottom: 8,
  },
  brandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  brandText: {
    fontSize: 17,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    letterSpacing: 0.15,
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
  dayLabel: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
    flexShrink: 1,
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
  weightPillPressed: {
    opacity: 0.65,
    transform: [{ scale: 0.97 }],
  },
  weightText: {
    fontSize: 14,
    fontWeight: "600",
  },
  streakRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: -4,
    marginBottom: 4,
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
  dayToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    paddingHorizontal: 4,
  },
  segmentToggle: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  segmentToggleInner: {
    width: 140,
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
    alignItems: "center",
    marginTop: 8,
  },
  consumedBudgetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    paddingVertical: 10,
    paddingHorizontal: 22,
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
