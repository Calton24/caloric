import AsyncStorage from "@react-native-async-storage/async-storage";
import { reportError } from "../../../infrastructure/errorReporting";
import {
  addFoodLoggingBreadcrumb,
  captureFoodLoggingError,
} from "../../../infrastructure/errorReporting/foodLoggingErrors";
import { saveFoodToAppleHealthSafely } from "../../health/save-food-to-apple-health-safely";
import { FOOD_LOG_SAFE_MODE } from "../../debug/safe-mode-flags";
import {
  FOOD_LOG_DISABLE_CLOUD_SYNC_ON_SAVE,
  FOOD_LOG_DISABLE_NATIVE_SIDE_EFFECTS_ON_SAVE,
  FOOD_LOG_DISABLE_STREAK_RECOMPUTE_ON_SAVE,
} from "../post-save-debug-flags";
import { rebuildFoodMemory } from "../../nutrition/memory/food-memory.service";
import { validateMealDraft } from "../../nutrition/meal-draft.validation";
import type { MealDraft } from "../../nutrition/nutrition.draft.types";
import { buildMealEntryFromDraft } from "../../nutrition/nutrition.helpers";
import { useNutritionStore } from "../../nutrition/nutrition.store";
import type { MealEntry, MealSource } from "../../nutrition/nutrition.types";
import { usePermissionsStore } from "../../permissions/permissions.store";
import { trackMealAndMaybePromptReview } from "../../review/review.service";
import { useSettingsStore } from "../../settings";
import { recomputeStreakAfterMealListChange } from "../../streak/recompute-streak-after-meal-list-change";
import { flushDeferredMealUploads } from "../../sync/useProgressSync";
import { emitFoodLogCommitted } from "../events/food-log-events";
import { consumeFoodLogStoreApply, queueFoodLogStoreApply } from "../food-log-apply-queue";
import { foodLogPathBreadcrumb } from "../food-log-path-breadcrumbs";
import { persistMeal } from "../repositories/meal.repository";
import {
  endPostFoodLogSettling,
  startPostFoodLogSettling,
} from "../post-food-log-settling";
import * as Sentry from "@sentry/react-native";

const LAST_FOOD_LOG_COMMIT_KEY = "last_food_log_commit";

export type FoodLogTransactionStatus =
  | "pending"
  | "committed_local"
  | "queued_cloud_sync"
  | "failed_local"
  | "failed_cloud";

export type FoodLogTransactionInput = {
  source: "barcode" | "camera" | "manual" | "ai";
  title: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  servingSize?: number;
  barcode?: string;
  rawPayload?: unknown;
};

export type FoodLogTransactionResult = {
  transactionId: string;
  mealId: string;
  status: FoodLogTransactionStatus;
};

type StoredCommitMarker = {
  transactionId: string;
  mealId: string;
  status: FoodLogTransactionStatus;
  input: FoodLogTransactionInput;
  createdAt: string;
  committedAt?: string;
  queuedAt?: string;
};

export type LastFoodLogCommitRecord = {
  mealId: string;
  transactionId: string;
  at: string;
  phase: "committed_local" | "queued_cloud_sync";
};

function createTransactionId(): string {
  return `txn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function mapMealSourceToTransactionSource(source: MealSource): FoodLogTransactionInput["source"] {
  switch (source) {
    case "barcode":
      return "barcode";
    case "camera":
      return "camera";
    case "image":
      return "ai";
    default:
      return "manual";
  }
}

function draftToTransactionInput(draft: MealDraft): FoodLogTransactionInput {
  return {
    source: mapMealSourceToTransactionSource(draft.source),
    title: draft.title,
    calories: draft.calories,
    protein: draft.protein,
    carbs: draft.carbs,
    fat: draft.fat,
    rawPayload: undefined,
  };
}

async function persistTransactionMarker(marker: StoredCommitMarker): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `food_log_txn_${marker.transactionId}`,
      JSON.stringify(marker)
    );
  } catch (e) {
    reportError(e, {
      area: "food_log",
      action: "persist_transaction_marker_failed",
      extra: { transactionId: marker.transactionId },
    });
  }
}

async function persistLastFoodLogCommit(record: LastFoodLogCommitRecord): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_FOOD_LOG_COMMIT_KEY, JSON.stringify(record));
  } catch (e) {
    reportError(e, {
      area: "food_log",
      action: "persist_last_commit_failed",
    });
  }
}

/**
 * Persists a pending meal to AsyncStorage only — **does not** call `addMeal`.
 * Apply with {@link applyPendingFoodLogTransaction} after navigation settles.
 */
export async function commitFoodLogTransaction(
  draft: MealDraft | null | undefined,
  options: { logDate?: string | null; userId?: string | null }
): Promise<FoodLogTransactionResult> {
  const transactionId = createTransactionId();
  const uid = options.userId ?? null;

  const validated = validateMealDraft(draft);
  if (!validated.ok) {
    addFoodLoggingBreadcrumb("food_logging.transaction_aborted", {
      reason: validated.reason,
    });
    throw new Error(validated.reason);
  }

  const input = draftToTransactionInput(validated.value);
  const createdAt = new Date().toISOString();

  await persistTransactionMarker({
    transactionId,
    mealId: "pending",
    status: "pending",
    input,
    createdAt,
  });

  let meal: MealEntry;
  try {
    meal = buildMealEntryFromDraft({
      draft: validated.value,
      loggedAt: options.logDate ?? undefined,
    });
    addFoodLoggingBreadcrumb("food_logging.transaction_meal_built", {
      meal_id: meal.id,
      transaction_id: transactionId,
      calories: meal.calories,
    });
  } catch (e) {
    captureFoodLoggingError(e, {
      flow: "confirm_meal",
      step: "transaction_build_meal",
      userId: uid,
      foodTitle: validated.value.title,
      calories: validated.value.calories,
      extras: { transactionId },
    });
    await persistTransactionMarker({
      transactionId,
      mealId: "failed",
      status: "failed_local",
      input,
      createdAt,
    });
    throw e;
  }

  const mealId = meal.id;

  try {
    await AsyncStorage.setItem(
      `food_log_pending_meal_${transactionId}`,
      JSON.stringify(meal)
    );
  } catch (e) {
    captureFoodLoggingError(e, {
      flow: "confirm_meal",
      step: "transaction_persist_pending_meal",
      userId: uid,
      extras: { transactionId, mealId },
    });
    await persistTransactionMarker({
      transactionId,
      mealId: "failed",
      status: "failed_local",
      input,
      createdAt,
    });
    throw e;
  }

  await persistTransactionMarker({
    transactionId,
    mealId,
    status: "committed_local",
    input,
    createdAt,
    committedAt: new Date().toISOString(),
  });

  await persistLastFoodLogCommit({
    mealId,
    transactionId,
    at: new Date().toISOString(),
    phase: "committed_local",
  });

  addFoodLoggingBreadcrumb("food_logging.local_save_success", {
    meal_id: mealId,
    transaction_id: transactionId,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
  });

  await persistTransactionMarker({
    transactionId,
    mealId,
    status: "queued_cloud_sync",
    input,
    createdAt,
    committedAt: new Date().toISOString(),
    queuedAt: new Date().toISOString(),
  });

  await persistLastFoodLogCommit({
    mealId,
    transactionId,
    at: new Date().toISOString(),
    phase: "queued_cloud_sync",
  });

  return {
    transactionId,
    mealId,
    status: "queued_cloud_sync",
  };
}

/**
 * Writes the pending meal into the nutrition store and runs post-save side effects.
 * Intended to run inside {@link InteractionManager.runAfterInteractions} on Home focus.
 */
export async function applyPendingFoodLogTransaction(
  transactionId: string,
  options: { userId?: string | null }
): Promise<{ mealId: string } | null> {
  const key = `food_log_pending_meal_${transactionId}`;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;

  let meal: MealEntry;
  try {
    meal = JSON.parse(raw) as MealEntry;
  } catch {
    return null;
  }
  if (!meal?.id || typeof meal.title !== "string") return null;

  const uid = options.userId ?? null;
  if (!uid) {
    reportError(new Error("missing user id for meal persistence"), {
      area: "food_log",
      action: "apply_transaction_missing_user_id",
      extra: { transactionId, mealId: meal.id },
    });
    return null;
  }

  Sentry.addBreadcrumb({
    category: "food_log",
    level: "info",
    message: "build_meal_started",
    data: { transactionId, mealId: meal.id },
  });
  Sentry.addBreadcrumb({
    category: "food_log",
    level: "info",
    message: "build_meal_finished",
    data: { transactionId, mealId: meal.id },
  });
  Sentry.addBreadcrumb({
    category: "food_log",
    level: "info",
    message: "sanitize_started",
    data: { transactionId, mealId: meal.id },
  });
  Sentry.addBreadcrumb({
    category: "food_log",
    level: "info",
    message: "sanitize_finished",
    data: { transactionId, mealId: meal.id },
  });
  Sentry.addBreadcrumb({
    category: "food_log",
    level: "info",
    message: "stringify_started",
    data: { transactionId, mealId: meal.id },
  });
  const serializedMeal = JSON.stringify(meal);
  Sentry.addBreadcrumb({
    category: "food_log",
    level: "info",
    message: "stringify_finished",
    data: { transactionId, mealId: meal.id, jsonSize: serializedMeal.length },
  });
  Sentry.addBreadcrumb({
    category: "food_log",
    level: "info",
    message: "persist_add_meal_started",
    data: { transactionId, mealId: meal.id },
  });
  const persistedMeal = await persistMeal(uid, meal);
  Sentry.addBreadcrumb({
    category: "food_log",
    level: "info",
    message: "persist_add_meal_finished",
    data: { transactionId, mealId: persistedMeal.id },
  });
  Sentry.addBreadcrumb({
    category: "food_log",
    level: "info",
    message: "runtime_store_update_started",
    data: { transactionId, mealId: persistedMeal.id, safeMode: FOOD_LOG_SAFE_MODE },
  });
  useNutritionStore.getState().addMeal(persistedMeal);
  Sentry.addBreadcrumb({
    category: "food_log",
    level: "info",
    message: "runtime_store_update_finished",
    data: { transactionId, mealId: persistedMeal.id, safeMode: FOOD_LOG_SAFE_MODE },
  });
  queuePostCommitSideEffects(persistedMeal, uid, transactionId);

  try {
    await AsyncStorage.removeItem(key);
  } catch {
    /* non-fatal */
  }

  addFoodLoggingBreadcrumb("food_logging.pending_meal_applied", {
    meal_id: persistedMeal.id,
    transaction_id: transactionId,
  });

  Sentry.addBreadcrumb({
    category: "food_log",
    level: "info",
    message: "commit_finished",
    data: { transactionId, mealId: persistedMeal.id },
  });
  return { mealId: persistedMeal.id };
}

function queuePostCommitSideEffects(
  persistedMeal: MealEntry,
  uid: string,
  transactionId: string
): void {
  setTimeout(() => {
    void runPostCommitSideEffects(persistedMeal, uid, transactionId);
  }, 0);
}

async function runPostCommitSideEffects(
  persistedMeal: MealEntry,
  uid: string,
  transactionId: string
): Promise<void> {
  if (FOOD_LOG_SAFE_MODE) return;

  const effects: Array<Promise<unknown>> = [];
  if (!FOOD_LOG_DISABLE_CLOUD_SYNC_ON_SAVE) {
    effects.push(
      Promise.resolve().then(() => {
        flushDeferredMealUploads(uid);
      })
    );
  }

  if (!FOOD_LOG_DISABLE_STREAK_RECOMPUTE_ON_SAVE) {
    effects.push(
      Promise.resolve().then(() => {
        recomputeStreakAfterMealListChange("food_logged");
      })
    );
  }

  const { appleHealthSyncEnabled } = useSettingsStore.getState().settings;
  const { appleHealthWriteEnabled } = usePermissionsStore.getState().permissions;
  if (
    !FOOD_LOG_DISABLE_NATIVE_SIDE_EFFECTS_ON_SAVE &&
    appleHealthSyncEnabled &&
    appleHealthWriteEnabled &&
    persistedMeal.calories > 0
  ) {
    effects.push(
      saveFoodToAppleHealthSafely({
        id: persistedMeal.id,
        title: persistedMeal.title,
        calories: persistedMeal.calories,
        protein: persistedMeal.protein,
        carbs: persistedMeal.carbs,
        fat: persistedMeal.fat,
        loggedAt: persistedMeal.loggedAt,
      })
    );
  }

  if (!FOOD_LOG_DISABLE_NATIVE_SIDE_EFFECTS_ON_SAVE) {
    effects.push(
      Promise.resolve().then(() => {
        rebuildFoodMemory(useNutritionStore.getState().meals);
      })
    );
    effects.push(trackMealAndMaybePromptReview());
  }

  const settled = await Promise.allSettled(effects);
  settled.forEach((result, index) => {
    if (result.status === "rejected") {
      captureFoodLoggingError(result.reason, {
        flow: "confirm_meal",
        step: `post_commit_effect_${index}_failed`,
        mealId: persistedMeal.id,
        userId: uid,
        extras: { transactionId },
      });
    }
  });
}

/**
 * Consumes the one-shot queue entry from confirm-meal, applies the meal, emits
 * refresh, and (in dev) flushes a Sentry debug envelope.
 */
export async function runPendingFoodLogApplyFromQueue(
  userId: string | null | undefined
): Promise<boolean> {
  // Never consume the queue without a real user — apply would no-op and we'd
  // drop the meal. Home focus will retry once auth is ready.
  if (!userId) {
    return false;
  }

  const entry = consumeFoodLogStoreApply();
  if (!entry) return false;

  foodLogPathBreadcrumb("food_log.home_apply_start", {
    transactionId: entry.transactionId,
    mealId: entry.mealId,
  });
  startPostFoodLogSettling(5000);
  try {
    const applied = await applyPendingFoodLogTransaction(entry.transactionId, {
      userId,
    });
    if (!applied) {
      queueFoodLogStoreApply(entry);
      return false;
    }
    foodLogPathBreadcrumb("food_log.home_apply_success", {
      transactionId: entry.transactionId,
      mealId: entry.mealId,
    });

    setTimeout(() => {
      emitFoodLogCommitted({
        mealId: entry.mealId,
        transactionId: entry.transactionId,
      });
    }, 1200);
    if (__DEV__) {
      try {
        Sentry.addBreadcrumb({
          category: "food_log",
          level: "info",
          message: "[FoodLogDebug] commit_success_applied",
          data: {
            mealId: entry.mealId,
            transactionId: entry.transactionId,
          },
        });
      } catch {
        /* ignore */
      }
    }
    return true;
  } catch (e) {
    queueFoodLogStoreApply(entry);
    reportError(e, {
      area: "food_log",
      action: "apply_pending_from_queue_failed",
      extra: { transactionId: entry.transactionId },
    });
    return false;
  } finally {
    endPostFoodLogSettling();
  }
}

export async function readLastFoodLogCommit(): Promise<LastFoodLogCommitRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_FOOD_LOG_COMMIT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LastFoodLogCommitRecord;
    if (
      parsed &&
      typeof parsed.mealId === "string" &&
      typeof parsed.transactionId === "string" &&
      typeof parsed.at === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
