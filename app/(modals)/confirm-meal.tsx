/**
 * Meal Confirmation Screen
 *
 * Bridge between food capture (voice/manual/camera) and nutrition store.
 * Shows the detected/entered food items with editable calories & macros.
 * User confirms → draft is saved as a real MealEntry to nutritionStore.
 *
 * Reads meal data from the draft store (set by logging flow hook).
 */

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import RNSlider from "@react-native-community/slider";
import { LinearGradient } from "expo-linear-gradient";
import { router, usePathname, useRouter, useSegments } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import * as Sentry from "@sentry/react-native";
import {
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
    InteractionManager,
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

import { useAuth } from "../../src/features/auth/useAuth";
import { useNutritionDraftStore } from "../../src/features/nutrition/nutrition.draft.store";
import { useBackgroundScanStore } from "../../src/features/camera/background-scan.store";
import { FixWithAISheet } from "../../src/features/nutrition/correction/FixWithAISheet";
import { LogFoodLauncherSheetContent } from "../../src/features/food-logging/LogFoodLauncherSheetContent";

import { useChallengeStore } from "../../src/features/challenge/challenge.store";
import {
    getInsightMessage,
    isInsightMoment,
} from "../../src/features/challenge/insight-trigger.service";
import {
    detectMealTime,
    type MealTime,
} from "../../src/features/nutrition/mealtime";
import { formatFoodName } from "@/src/utils/formatFoodName";
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
import { usePaywallTrigger } from "../../src/features/subscription/usePaywallTrigger";
import { ShareMilestoneModal, useShareMilestone } from "../../src/features/share";

import { useScanCreditsStore } from "../../src/features/subscription/scanCredits.store";
import { formatDateHeader } from "../../src/infrastructure/i18n";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { haptics } from "../../src/infrastructure/haptics";
import { useGoalsStore, useNutritionStore } from "../../src/stores";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { MealReviewImage } from "../../src/ui/components/MealReviewImage";
import { RichText } from "../../src/ui/components/RichText";
import { ReportFoodSheet } from "../../src/ui/feedback/ReportFoodSheet";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { useBottomSheet } from "../../src/ui/sheets/useBottomSheet";
import { dismissRootSheet } from "../../src/ui/sheets/BottomSheetProvider";
import { useToast } from "../../src/ui/components/Toast";
import {
  addFoodLoggingBreadcrumb,
  captureFoodLoggingError,
} from "../../src/infrastructure/errorReporting/foodLoggingErrors";
import {
  getEstimatedItemNutrients,
  getMealCalories,
} from "../../src/features/nutrition/meal-normalize";
import { FoodLoggingErrorBoundary } from "../../src/ui/errors/FoodLoggingErrorBoundary";
import { ENABLE_POST_SAVE_EXTRAS } from "../../src/features/food-logging/track-calories.constants";
import { FOOD_LOG_POST_SAVE_NAV_MODE } from "../../src/features/debug/safe-mode-flags";
import { foodLogPathBreadcrumb } from "../../src/features/food-logging/food-log-path-breadcrumbs";
import { queueFoodLogStoreApply } from "../../src/features/food-logging/food-log-apply-queue";
import { exitConfirmMealSafely } from "../../src/features/food-logging/safe-return-after-meal-log";
import {
  commitFoodLogTransaction,
  runPendingFoodLogApplyFromQueue,
} from "../../src/features/food-logging/services/food-log-transaction.service";
import { JourneyPaywall } from "../../src/ui/components/JourneyPaywall";
import { PostLogCelebration } from "../../src/ui/components/PostLogCelebration";

function waitMs(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function ConfirmMealScreenInner() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const toast = useToast();
  const {
    draft: hookDraft,
    updateDraft,
    clearDraft,
  } = useLoggingFlow();

  // Defensive: read store snapshot imperatively in case Zustand subscription
  // hasn't fired yet on first render (potential React batching edge case)
  const draft = hookDraft ?? useNutritionDraftStore.getState().draft;

  const logDate = useNutritionDraftStore((s) => s.logDate);
  const setLogDate = useNutritionDraftStore((s) => s.setLogDate);
  const { open: openSheet, close: closeSheet } = useBottomSheet();

  const dismissAllSheets = useCallback(() => {
    // Kill any sheet owned by this modal stack.
    closeSheet(undefined, { immediate: true });
    // Kill root-level sheet in case it was left mounted by another provider.
    dismissRootSheet({ immediate: true });
  }, [closeSheet]);

  /** Same bottom sheet as Home FAB “+” — keyboard / mic / camera + quick picks */
  const openLogFoodLauncher = useCallback(() => {
    haptics.impact("light");
    openSheet(<LogFoodLauncherSheetContent variant="confirm" />, {
      snapPoints: ["50%", "92%"],
    });
  }, [openSheet]);

  /** "Fix with AI" — opens the natural-language correction sheet. */
  const openFixWithAI = useCallback(() => {
    const currentDraft =
      useNutritionDraftStore.getState().draft ?? hookDraft;
    if (!currentDraft) return;
    haptics.impact("light");
    openSheet(<FixWithAISheet draft={currentDraft} />, {
      snapPoints: ["55%", "85%"],
      enablePanDownToClose: true,
    });
  }, [openSheet, hookDraft]);

  // Post-save growth (share milestone, journey paywall): removed from this
  // screen until save + home is stable — see track-calories.constants.ts.

  const recordFirstMeal = useRetentionStore((s) => s.recordFirstMeal);

  // Guard against state updates / navigation after unmount
  const isMounted = useRef(true);
  const isSubmittingRef = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const [trackPhase, setTrackPhase] = useState<
    "idle" | "saving" | "saved" | "exiting" | "error"
  >("idle");

  // Post-log celebration state
  const [celebration, setCelebration] = useState<{
    message: string;
    sub: string;
    emoji: string;
    microTrigger?: string;
  } | null>(null);

  // Journey paywall state (shown after celebration on conversion days)
  const [journeyPaywall, setJourneyPaywall] = useState<{
    paywallTrigger: import("../../src/features/retention/day-journey").PaywallTrigger;
    streakDay: number;
  } | null>(null);

  const retention = useRetentionEngine();
  const paywallTrigger = usePaywallTrigger();
  const shareMilestone = useShareMilestone();

  // Calorie budget & today's consumed
  const calorieBudget = useGoalsStore((s) => s.plan?.calorieBudget ?? 2000);
  const allMeals = useNutritionStore((s) => s.meals);
  const targetDate = logDate ?? new Date().toISOString().slice(0, 10);
  const consumedToday = getMealsForDate(allMeals, targetDate).reduce(
    (sum, m) => sum + getMealCalories(m),
    0
  );

  // More menu visibility
  const [showMenu, setShowMenu] = useState(false);

  // Inline editing state: { itemIndex, field } → null when not editing
  // itemIndex = -1 for single-item (no estimatedItems), otherwise 0..n
  const [editing, setEditing] = useState<{
    itemIndex: number;
    field: "serving" | "calories";
  } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Serving slider state: tracks which item is being slider-adjusted
  // baseNutrients stores the per-1-serving nutrients for ratio scaling
  const [sliderItemIndex, setSliderItemIndex] = useState<number | null>(null);
  const baseNutrientsRef = useRef<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    quantity: number;
    servings: number;
  } | null>(null);

  const openSlider = useCallback(
    (index: number) => {
      const item = draft?.estimatedItems?.[index];
      if (!item) return;
      const nu = getEstimatedItemNutrients(item);
      const qtyRaw = item.parsed?.quantity ?? 1;
      const qty = qtyRaw > 0 ? qtyRaw : 1;
      baseNutrientsRef.current = {
        calories: qty > 0 ? nu.calories / qty : nu.calories,
        protein: qty > 0 ? nu.protein / qty : nu.protein,
        carbs: qty > 0 ? nu.carbs / qty : nu.carbs,
        fat: qty > 0 ? nu.fat / qty : nu.fat,
        quantity: qty,
        servings: item.estimatedServings,
      };
      setSliderItemIndex(index);
    },
    [draft]
  );

  const closeSlider = useCallback(() => {
    setSliderItemIndex(null);
    baseNutrientsRef.current = null;
  }, []);

  const handleSliderChange = useCallback(
    (newQty: number) => {
      if (
        sliderItemIndex === null ||
        !draft?.estimatedItems ||
        !baseNutrientsRef.current
      )
        return;

      const base = baseNutrientsRef.current;
      const items = [...draft.estimatedItems];
      const item = { ...items[sliderItemIndex] };

      const parsedBase = item.parsed;
      item.parsed = {
        name:
          parsedBase?.name ??
          item.matchedName?.trim().toLowerCase() ??
          "food",
        quantity: newQty,
        unit: parsedBase?.unit ?? "serving",
        preparation: parsedBase?.preparation ?? null,
        confidence:
          parsedBase?.confidence ?? Math.min(1, Math.max(0, item.confidence)),
        rawFragment: parsedBase?.rawFragment ?? item.matchedName ?? "",
      };
      item.nutrients = {
        calories: Math.round(base.calories * newQty),
        protein: Math.round(base.protein * newQty * 10) / 10,
        carbs: Math.round(base.carbs * newQty * 10) / 10,
        fat: Math.round(base.fat * newQty * 10) / 10,
      };
      item.estimatedServings =
        base.quantity > 0 ? (base.servings / base.quantity) * newQty : newQty;

      items[sliderItemIndex] = item;

      const totals = items.reduce(
        (acc, i) => {
          const n = getEstimatedItemNutrients(i);
          return {
            calories: acc.calories + n.calories,
            protein: Math.round((acc.protein + n.protein) * 10) / 10,
            carbs: Math.round((acc.carbs + n.carbs) * 10) / 10,
            fat: Math.round((acc.fat + n.fat) * 10) / 10,
          };
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      const title = items
        .map((i) => {
          const qty =
            (i.parsed?.quantity ?? 1) !== 1 ? `${i.parsed?.quantity} ` : "";
          return `${qty}${displayName(i)}`;
        })
        .join(", ");

      updateDraft({
        estimatedItems: items,
        calories: totals.calories,
        protein: totals.protein,
        carbs: totals.carbs,
        fat: totals.fat,
        title,
      });
    },
    [sliderItemIndex, draft, updateDraft]
  );

  const startEdit = useCallback(
    (itemIndex: number, field: "serving" | "calories") => {
      if (field === "serving") {
        openSlider(itemIndex);
        return;
      }
      let initial = "";
      if (itemIndex === -1) {
        initial = String(draft?.calories ?? 0);
      } else {
        const item = draft?.estimatedItems?.[itemIndex];
        initial = String(
          item ? getEstimatedItemNutrients(item).calories : 0,
        );
      }
      setEditValue(initial);
      setEditing({ itemIndex, field });
    },
    [draft, openSlider]
  );

  const commitEdit = useCallback(() => {
    if (!editing || !draft) {
      setEditing(null);
      return;
    }
    const numValue = parseFloat(editValue);
    if (isNaN(numValue) || numValue < 0) {
      setEditing(null);
      return;
    }

    if (editing.itemIndex === -1) {
      // Single-item mode — edit top-level calories
      updateDraft({ calories: Math.round(numValue) });
      setEditing(null);
      return;
    }

    // Multi-item mode — calorie edit only (serving uses slider)
    const items = [...(draft.estimatedItems ?? [])];
    const item = { ...items[editing.itemIndex] };
    const prevN = getEstimatedItemNutrients(item);

    const oldCal = prevN.calories > 0 ? prevN.calories : 1;
    const ratio = Math.round(numValue) / oldCal;
    item.nutrients = {
      calories: Math.round(numValue),
      protein: Math.round(prevN.protein * ratio * 10) / 10,
      carbs: Math.round(prevN.carbs * ratio * 10) / 10,
      fat: Math.round(prevN.fat * ratio * 10) / 10,
    };

    items[editing.itemIndex] = item;

    const totals = items.reduce(
      (acc, i) => {
        const n = getEstimatedItemNutrients(i);
        return {
          calories: acc.calories + n.calories,
          protein: Math.round((acc.protein + n.protein) * 10) / 10,
          carbs: Math.round((acc.carbs + n.carbs) * 10) / 10,
          fat: Math.round((acc.fat + n.fat) * 10) / 10,
        };
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const title = items
      .map((i) => {
        const qty =
          (i.parsed?.quantity ?? 1) !== 1 ? `${i.parsed?.quantity} ` : "";
        return `${qty}${displayName(i)}`;
      })
      .join(", ");

    updateDraft({
      estimatedItems: items,
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
      title,
    });
    setEditing(null);
  }, [editing, editValue, draft, updateDraft]);

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
    if (!draft || hasCaptured.current) return;

    captureOriginalEstimate(draft);
    hasCaptured.current = true;

    // Fire-and-forget: record this scan for the feedback loop
    void recordScanEvent({
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
  }, [draft]);

  useEffect(() => {
    return () => {
      clearOriginalEstimate();
      hasCaptured.current = false;
    };
  }, []);

  useEffect(() => {
    addFoodLoggingBreadcrumb("food_logging.confirm_meal_opened", {
      route: pathname,
      draft_present: Boolean(draft),
    });
  }, [pathname, draft]);

  /** Paywall / share-milestone / deferred safe exit — after emit + celebration (if any). */
  const proceedAfterTrackCaloriesSave = useCallback(
    (opts?: { clearDraftAfterNav?: () => void }) => {
      const clearDraftAfterNav = opts?.clearDraftAfterNav;
      setCelebration(null);
      const streakDay = retention.dayContent.day;
      const action = paywallTrigger.evaluateStreak(streakDay);
      if (action && action.type === "journey") {
        setJourneyPaywall({
          paywallTrigger: action.paywallTrigger,
          streakDay: action.streakDay,
        });
        return;
      }
      setTimeout(() => {
        if (!isMounted.current) return;
        const triggered = shareMilestone.check();
        if (!triggered) {
          exitConfirmMealSafely(router, {
            pathname,
            segments: segments as readonly string[],
          });
          clearDraftAfterNav?.();
        }
        // When share milestone triggers, draft stays until ShareMilestoneModal
        // onClose runs clearDraft + exit (avoids blank modal shell under overlay).
      }, 50);
    },
    [retention, paywallTrigger, shareMilestone, router, pathname, segments],
  );

  const handleConfirm = useCallback(() => {
    void (async () => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setTrackPhase("saving");
      dismissAllSheets();

      const draftForSave =
        draft ?? useNutritionDraftStore.getState().draft;
      const logDateForSave = useNutritionDraftStore.getState().logDate;

      addFoodLoggingBreadcrumb("food_logging.track_calories_pressed", {
        route: pathname,
        source: draftForSave?.source,
        calories: draftForSave?.calories,
        has_estimated_items: Boolean(draftForSave?.estimatedItems?.length),
      });
      foodLogPathBreadcrumb("food_log.press", { pathname });

      try {
        foodLogPathBreadcrumb("food_log.validate_start", { pathname });
        const correction = draftForSave
          ? trackCorrection(draftForSave)
          : null;
        addFoodLoggingBreadcrumb("food_logging.track_calories_corrections_done", {
          was_edited: correction?.wasEdited ?? false,
        });

        const eventId = scanEventIdRef.current ?? getLastScanEventId();
        if (eventId) {
          markScanConfirmed(eventId, correction?.wasEdited ?? false, {
            foodName: draftForSave?.title ?? "",
            calories: draftForSave?.calories ?? 0,
            protein: draftForSave?.protein ?? 0,
            carbs: draftForSave?.carbs ?? 0,
            fat: draftForSave?.fat ?? 0,
          });

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
        addFoodLoggingBreadcrumb("food_logging.track_calories_scan_feedback_done", {
          had_scan_event: Boolean(eventId),
          submitted_correction: Boolean(correction?.wasEdited),
        });

        const linkedPendingReviewId =
          draftForSave?.pendingReviewId ?? null;

        addFoodLoggingBreadcrumb("food_logging.track_calories_before_local_save");
        foodLogPathBreadcrumb("food_log.commit_start", { pathname });
        const result = await commitFoodLogTransaction(draftForSave, {
          logDate: logDateForSave,
          userId: user?.id ?? null,
        });
        foodLogPathBreadcrumb("food_log.validate_success", { pathname });
        const newMealId = result.mealId;
        queueFoodLogStoreApply({
          transactionId: result.transactionId,
          mealId: result.mealId,
        });
        addFoodLoggingBreadcrumb("food_logging.track_calories_after_local_save", {
          meal_id: newMealId,
          transaction_id: result.transactionId,
        });
        foodLogPathBreadcrumb("food_log.commit_success", {
          mealId: newMealId,
          transactionId: result.transactionId,
          pathname,
        });

        // Update local "Recently uploaded" state synchronously so a hot reload
        // cannot leave the card in "Review" after the meal is already saved.
        if (linkedPendingReviewId && newMealId) {
          try {
            useBackgroundScanStore
              .getState()
              .markScanSaved(linkedPendingReviewId, newMealId);
            addFoodLoggingBreadcrumb("food_logging.pending_review_save_linked", {
              job_id: linkedPendingReviewId,
              meal_id: newMealId,
            });
          } catch {
            // best-effort only
          }
        }

        // Keep the critical save path minimal to reduce native/JSI churn.
        // All non-critical side effects run after interactions.
        InteractionManager.runAfterInteractions(() => {
          try {
            if (linkedPendingReviewId && newMealId) {
              void import(
                "../../src/features/food-logging/pending-review.service"
              ).then((m) =>
                m.markServerReviewSaved(linkedPendingReviewId, newMealId)
              );
              void import(
                "../../src/features/food-logging/meal-image-upload.service"
              ).then((m) => m.deleteDurableImage(linkedPendingReviewId));
            } else {
              useBackgroundScanStore.getState().resetScan();
            }
          } catch {
            // best-effort only
          }

          try {
            addFoodLoggingBreadcrumb("food_logging.track_calories_before_retention");
            recordFirstMeal();
            addFoodLoggingBreadcrumb("food_logging.track_calories_after_retention");

            const scanCount = useScanCreditsStore.getState().credits.totalUsed;
            const mealCalories = draftForSave?.calories ?? 0;
            const calorieDeviation = Math.abs(
              consumedToday + mealCalories - calorieBudget
            );
            const proteinTarget = (calorieBudget * 0.3) / 4;
            const proteinRatio =
              proteinTarget > 0 ? (draftForSave?.protein ?? 0) / proteinTarget : 1;
            const dailyIntakePercent =
              calorieBudget > 0
                ? (consumedToday + mealCalories) / calorieBudget
                : 0;
            const timeOfDay = new Date().getHours();

            const insightInput = {
              scanCount,
              calorieDeviation,
              proteinRatio,
              dailyIntakePercent,
              timeOfDay,
            };

            addFoodLoggingBreadcrumb("food_logging.track_calories_before_insight");
            if (isInsightMoment(insightInput)) {
              const message = getInsightMessage(insightInput);
              const current = useChallengeStore.getState().lastInsightMessage;
              if (message && message !== current) {
                useChallengeStore.getState().markInsightTriggered(message);
              } else if (!useChallengeStore.getState().insightTriggered) {
                useChallengeStore
                  .getState()
                  .markInsightTriggered(message ?? undefined);
              }
            }
            addFoodLoggingBreadcrumb("food_logging.track_calories_after_insight");
          } catch {
            // best-effort only
          }
        });

        setTrackPhase("saved");
        // Do NOT clearDraft() here — it swaps the UI to an empty placeholder View
        // while dismissTo/replace is still pending (450ms + nav), which looks like
        // a stuck blank sheet. Clear runs inside proceedAfterTrackCaloriesSave after exit.
        await waitMs(450);

        try {
          Sentry.addBreadcrumb({
            category: "food_log",
            level: "info",
            message: "[FoodLogDebug] commit_success",
            data: {
              mealId: result.mealId,
              transactionId: result.transactionId,
              pathname,
            },
          });
        } catch {
          /* ignore */
        }

        if (FOOD_LOG_POST_SAVE_NAV_MODE === "none") {
          InteractionManager.runAfterInteractions(() => {
            void runPendingFoodLogApplyFromQueue(user?.id ?? null);
          });
        }

        addFoodLoggingBreadcrumb("food_logging.track_calories_before_celebration");
        if (ENABLE_POST_SAVE_EXTRAS) {
          const afterLog = retention.getAfterLogContent();
          const dayPaywall = retention.dayPaywall;
          setCelebration({
            message: afterLog.message,
            sub: afterLog.sub,
            emoji: afterLog.emoji,
            microTrigger: dayPaywall?.microTrigger,
          });
          addFoodLoggingBreadcrumb("food_logging.track_calories_celebration_set");
        } else {
          addFoodLoggingBreadcrumb("food_logging.track_calories_celebration_skipped");
          foodLogPathBreadcrumb("food_log.exit_start", { pathname });
          setTrackPhase("exiting");
          dismissAllSheets();
          proceedAfterTrackCaloriesSave({ clearDraftAfterNav: clearDraft });
          foodLogPathBreadcrumb("food_log.exit_success", { pathname });
        }
      } catch (err) {
        console.error("[ConfirmMeal] handleConfirm error:", err);
        captureFoodLoggingError(err, {
          flow: "confirm_meal",
          step: "handle_track_calories",
          route: pathname,
          foodTitle: draftForSave?.title,
          calories: draftForSave?.calories,
        });
        setTrackPhase("error");
        toast.show(t("mealConfirm.invalidMealDraft"), "error");
      } finally {
        isSubmittingRef.current = false;
      }
    })();
  }, [
    pathname,
    draft,
    retention,
    toast,
    t,
    consumedToday,
    calorieBudget,
    recordFirstMeal,
    proceedAfterTrackCaloriesSave,
    clearDraft,
    user?.id,
    dismissAllSheets,
  ]);

  /** Called when the celebration overlay dismisses (auto or tap) */
  const handleCelebrationDismiss = useCallback(() => {
    dismissAllSheets();
    proceedAfterTrackCaloriesSave();
  }, [dismissAllSheets, proceedAfterTrackCaloriesSave]);

  /** Called when journey paywall is dismissed (purchased or skipped) */
  const handleJourneyPaywallDismiss = useCallback(() => {
    dismissAllSheets();
    setJourneyPaywall(null);
    setTimeout(() => {
      if (!isMounted.current) return;
      const triggered = shareMilestone.check();
      if (!triggered) {
        exitConfirmMealSafely(router, {
          pathname,
          segments: segments as readonly string[],
        });
        clearDraft();
      }
    }, 50);
  }, [dismissAllSheets, shareMilestone, router, pathname, segments, clearDraft]);

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
        (acc, item) => {
          const n = getEstimatedItemNutrients(item);
          return {
            calories: acc.calories + n.calories,
            protein: Math.round((acc.protein + n.protein) * 10) / 10,
            carbs: Math.round((acc.carbs + n.carbs) * 10) / 10,
            fat: Math.round((acc.fat + n.fat) * 10) / 10,
          };
        },
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
    // Return an empty view while navigating away — prevents "No draft meal found" flash
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      />
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
              {t("mealConfirm.analysisIncomplete")}
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
              {t("mealConfirm.analysisIncompleteDesc")}
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
                {t("mealConfirm.goBack")}
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
              {t("mealConfirm.noMatchFound")}
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
              {t("mealConfirm.noMatchFound")}
            </TText>
            <TSpacer size="sm" />

            <RichText
              i18nKey="mealConfirm.noMatchRich"
              values={{
                food: formatFoodName(draft.rawInput || draft.title),
              }}
              components={{
                bold: (
                  <TText
                    style={{ fontWeight: "600", color: theme.colors.text }}
                  />
                ),
              }}
              style={{
                fontSize: 15,
                textAlign: "center",
                color: theme.colors.textMuted,
                lineHeight: 22,
                paddingHorizontal: 16,
              }}
            />

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
                {t("mealConfirm.tryAgainVoice")}
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
                {t("mealConfirm.typeItIn")}
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
        {/* Header: help (meal actions menu) + close */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <Pressable
            onPress={() => setShowMenu(true)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("mealConfirm.moreOptionsA11y")}
            style={[
              styles.headerHelpBtn,
              { backgroundColor: theme.colors.border + "80" },
            ]}
          >
            <Ionicons
              name="help"
              size={16}
              color={theme.colors.textMuted}
            />
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
              {formatFoodName(draft.title)}
            </TText>
          </Animated.View>

          {/* Captured photo (camera scans only). Renders nothing if absent. */}
          {(draft.imageUri || draft.imagePath) && (
            <View style={styles.imageWrapper}>
              <MealReviewImage
                imageUri={draft.imageUri}
                imagePath={draft.imagePath}
                accessibilityLabel={formatFoodName(draft.title)}
              />
            </View>
          )}

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
                  {formatDateHeader(new Date(logDate + "T12:00:00"))}
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

          {/* Main card — glass shell (coach / home parity) */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <GlassSurface
              variant="card"
              intensity="light"
              style={styles.mainCardGlass}
            >
            {/* Hero calories + info */}
            <View style={styles.heroRow}>
              <TText
                style={[styles.heroCalories, { color: theme.colors.text }]}
              >
                {draft.calories} {t("tracking.kcal")}
              </TText>
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
                      {t("mealConfirm.reportFood")}
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
                      {t("mealConfirm.deleteFood")}
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
                    {projectedTotal} / {calorieBudget} {t("tracking.kcal")}
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
                        {formatFoodName(item.matchedName ?? displayName(item))}
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
                    <Pressable
                      onPress={() =>
                        sliderItemIndex === index
                          ? closeSlider()
                          : startEdit(index, "serving")
                      }
                      style={[
                        styles.pill,
                        {
                          backgroundColor: theme.colors.background,
                          borderWidth: sliderItemIndex === index ? 1.5 : 0,
                          borderColor:
                            sliderItemIndex === index
                              ? theme.colors.primary
                              : "transparent",
                        },
                      ]}
                    >
                      <TText
                        style={[
                          styles.pillText,
                          {
                            color:
                              sliderItemIndex === index
                                ? theme.colors.primary
                                : theme.colors.textSecondary,
                          },
                        ]}
                      >
                        {(item.parsed?.quantity ?? 1) !== 1
                          ? `${item.parsed?.quantity} × `
                          : ""}
                        {item.parsed?.unit ?? "serving"}
                      </TText>
                      <Ionicons
                        name={
                          sliderItemIndex === index ? "chevron-up" : "pencil"
                        }
                        size={12}
                        color={
                          sliderItemIndex === index
                            ? theme.colors.primary
                            : theme.colors.textMuted
                        }
                      />
                    </Pressable>
                    {editing?.itemIndex === index &&
                    editing.field === "calories" ? (
                      <View
                        style={[
                          styles.pill,
                          styles.pillEditing,
                          {
                            backgroundColor: theme.colors.background,
                            borderColor: theme.colors.primary,
                          },
                        ]}
                      >
                        <TextInput
                          value={editValue}
                          onChangeText={setEditValue}
                          keyboardType="number-pad"
                          autoFocus
                          selectTextOnFocus
                          onBlur={commitEdit}
                          onSubmitEditing={commitEdit}
                          style={[
                            styles.pillInput,
                            { color: theme.colors.text },
                          ]}
                        />
                        <TText
                          style={[
                            styles.pillText,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {t("tracking.kcal")}
                        </TText>
                      </View>
                    ) : (
                      <Pressable
                        onPress={() => startEdit(index, "calories")}
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
                          {getEstimatedItemNutrients(item).calories}{" "}
                          {t("tracking.kcal")}
                        </TText>
                        <Ionicons
                          name="pencil"
                          size={12}
                          color={theme.colors.textMuted}
                        />
                      </Pressable>
                    )}
                  </View>

                  {/* Serving slider */}
                  {sliderItemIndex === index &&
                    baseNutrientsRef.current &&
                    (() => {
                      const qty = item.parsed?.quantity ?? 1;
                      const originalQty = baseNutrientsRef.current!.quantity;
                      const isGrams = item.parsed?.unit === "g";
                      const step = isGrams ? 10 : 0.25;
                      const sliderMin = isGrams ? step : 0.25;
                      const sliderMax = isGrams
                        ? Math.max(originalQty * 3, 500)
                        : Math.max(originalQty * 5, 5);

                      const formatQty = (q: number) => {
                        if (isGrams) return `${Math.round(q)}g`;
                        if (q === Math.floor(q)) return String(q);
                        return q.toFixed(2).replace(/0$/, "");
                      };

                      return (
                        <Animated.View
                          entering={FadeIn.duration(200)}
                          style={styles.sliderContainer}
                        >
                          <View style={styles.sliderLabelRow}>
                            <TText
                              style={[
                                styles.sliderLabel,
                                { color: theme.colors.textSecondary },
                              ]}
                            >
                              {isGrams
                                ? t("editMeal.amount", {
                                    defaultValue: "Amount",
                                  })
                                : t("editMeal.servings", {
                                    defaultValue: "Servings",
                                  })}
                            </TText>
                            <TText
                              style={[
                                styles.sliderValue,
                                { color: theme.colors.primary },
                              ]}
                            >
                              {formatQty(qty)}
                              {!isGrams
                                ? ` ${item.parsed?.unit ?? "serving"}`
                                : ""}
                            </TText>
                          </View>
                          <RNSlider
                            value={qty}
                            minimumValue={sliderMin}
                            maximumValue={sliderMax}
                            step={step}
                            minimumTrackTintColor={theme.colors.primary}
                            maximumTrackTintColor={theme.colors.border}
                            thumbTintColor={theme.colors.primary}
                            onValueChange={handleSliderChange}
                            style={styles.slider}
                          />
                          <View style={styles.sliderEndLabels}>
                            <TText
                              style={[
                                styles.sliderEndLabel,
                                { color: theme.colors.textMuted },
                              ]}
                            >
                              {isGrams ? `${sliderMin}g` : sliderMin}
                            </TText>
                            <TText
                              style={[
                                styles.sliderEndLabel,
                                { color: theme.colors.textMuted },
                              ]}
                            >
                              {isGrams ? `${sliderMax}g` : sliderMax}
                            </TText>
                          </View>
                        </Animated.View>
                      );
                    })()}

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
                      {formatFoodName(draft.title)}
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
                  {editing?.itemIndex === -1 && editing.field === "calories" ? (
                    <View
                      style={[
                        styles.pill,
                        styles.pillEditing,
                        {
                          backgroundColor: theme.colors.background,
                          borderColor: theme.colors.primary,
                        },
                      ]}
                    >
                      <TextInput
                        value={editValue}
                        onChangeText={setEditValue}
                        keyboardType="number-pad"
                        autoFocus
                        selectTextOnFocus
                        onBlur={commitEdit}
                        onSubmitEditing={commitEdit}
                        style={[styles.pillInput, { color: theme.colors.text }]}
                      />
                      <TText
                        style={[
                          styles.pillText,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {t("tracking.kcal")}
                      </TText>
                    </View>
                  ) : (
                    <Pressable
                      onPress={() => startEdit(-1, "calories")}
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
                        {draft.calories} {t("tracking.kcal")}
                      </TText>
                      <Ionicons
                        name="pencil"
                        size={12}
                        color={theme.colors.textMuted}
                      />
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            <TSpacer size="lg" />

            {draft?.parseMethod === "barcode-lookup" &&
            draft.calories === 0 &&
            draft.protein === 0 &&
            draft.carbs === 0 &&
            draft.fat === 0 ? (
              <TText
                style={[
                  styles.inlineHintText,
                  { color: theme.colors.textMuted },
                ]}
              >
                {t("mealConfirm.barcodeNutritionMissing")}
              </TText>
            ) : null}

            <TSpacer size="sm" />

            {/* Track Calories button */}
            <Pressable
              onPress={handleConfirm}
              disabled={
                trackPhase === "saving" ||
                trackPhase === "exiting" ||
                trackPhase === "saved"
              }
              style={({ pressed }) => [
                styles.trackBtn,
                {
                  opacity:
                    pressed ||
                    trackPhase === "saving" ||
                    trackPhase === "exiting" ||
                    trackPhase === "saved"
                      ? 0.65
                      : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <TText style={styles.trackBtnText}>
                {trackPhase === "saving"
                  ? "Saving…"
                  : trackPhase === "saved" || trackPhase === "exiting"
                    ? "Saved ✓"
                    : t("mealConfirm.trackCalories")}
              </TText>
            </Pressable>
            </GlassSurface>
          </Animated.View>

          <TSpacer size="lg" />

          {/* "Fix with AI" — interactive CTA. Replaces the old passive
              "Need to adjust calories? Just ask!" copy with something the
              user can actually act on. */}
          <Animated.View entering={FadeIn.duration(400).delay(200)}>
            <Pressable
              onPress={openFixWithAI}
              accessibilityRole="button"
              accessibilityLabel={t("mealConfirm.fixWithAI")}
              accessibilityHint={t("mealConfirm.fixWithAISubtitle")}
              style={({ pressed }) => [
                pressed && {
                  opacity: 0.92,
                  transform: [{ scale: 0.99 }],
                },
              ]}
            >
              <GlassSurface
                variant="card"
                intensity="light"
                style={styles.fixWithAIGlass}
              >
                <View
                  style={[
                    styles.fixWithAIIcon,
                    { backgroundColor: theme.colors.primary + "1A" },
                  ]}
                >
                  <Ionicons
                    name="sparkles"
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TText
                    style={[
                      styles.fixWithAITitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    {t("mealConfirm.fixWithAI")}
                  </TText>
                  <TText
                    style={[
                      styles.fixWithAISubtitle,
                      { color: theme.colors.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {t("mealConfirm.fixWithAISubtitle")}
                  </TText>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </GlassSurface>
            </Pressable>
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
              onPress={openLogFoodLauncher}
              style={[
                styles.methodBtn,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <MaterialCommunityIcons
                name="keyboard-outline"
                size={24}
                color={theme.colors.text}
              />
            </Pressable>

            <Pressable onPress={openLogFoodLauncher} style={styles.micBtn}>
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
                router.push("/(modals)/camera-log" as never);
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
            clearDraft();
            exitConfirmMealSafely(router, {
              pathname,
              segments: segments as readonly string[],
            });
          }}
        />
      )}

      {/* Journey paywall (shown on conversion days after celebration) */}
      {journeyPaywall && (
        <JourneyPaywall
          visible={!!journeyPaywall}
          onDismiss={handleJourneyPaywallDismiss}
          paywallCopy={journeyPaywall.paywallTrigger}
          streakDay={journeyPaywall.streakDay}
        />
      )}

      {/* Post-log celebration (day-journey copy) — gated; off by default for a direct exit after Track Calories. */}
      {ENABLE_POST_SAVE_EXTRAS ? (
        <PostLogCelebration
          visible={!!celebration}
          message={celebration?.message ?? ""}
          sub={celebration?.sub ?? ""}
          emoji={celebration?.emoji ?? ""}
          microTrigger={celebration?.microTrigger}
          onDismiss={handleCelebrationDismiss}
        />
      ) : null}
    </View>
  );
}

export default function ConfirmMealScreen() {
  return (
    <FoodLoggingErrorBoundary
      routeLabel="/(modals)/confirm-meal"
      onScanAnother={() => {
        try {
          router.replace("/(modals)/camera-log" as never);
        } catch (e) {
          captureFoodLoggingError(e, {
            flow: "confirm_meal",
            step: "error_boundary_scan_another_nav",
            route: "/(modals)/confirm-meal",
          });
        }
      }}
      scanAnotherLabel="Scan another barcode"
    >
      <ConfirmMealScreenInner />
    </FoodLoggingErrorBoundary>
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
  headerHelpBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
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
  imageWrapper: {
    marginTop: 12,
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
  // ── Main card (glass) ──
  mainCardGlass: {
    borderRadius: 22,
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
  pillEditing: {
    borderWidth: 1.5,
  },
  pillInput: {
    fontSize: 13,
    fontWeight: "600",
    minWidth: 36,
    paddingVertical: 0,
    paddingHorizontal: 0,
    textAlign: "center",
  },
  // ── Slider styles ──
  sliderContainer: {
    paddingHorizontal: 4,
    paddingBottom: 4,
    marginTop: 4,
  },
  sliderLabelRow: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 4,
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: "500" as const,
  },
  sliderValue: {
    fontSize: 15,
    fontWeight: "700" as const,
  },
  slider: {
    width: "100%" as const,
    height: 36,
  },
  sliderEndLabels: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginTop: -4,
  },
  sliderEndLabel: {
    fontSize: 11,
    fontWeight: "400" as const,
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
  inlineErrorText: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  inlineHintText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 8,
  },
  // ── Fix with AI (glass row) ──
  fixWithAIGlass: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 22,
  },
  fixWithAIIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  fixWithAITitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  fixWithAISubtitle: {
    fontSize: 13,
    marginTop: 2,
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
