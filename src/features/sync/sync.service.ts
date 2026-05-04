/**
 * Progress Sync Service
 *
 * Syncs local Zustand stores (meals, weight logs, goals) to Supabase.
 * Design principles:
 *   - Never blocks the UI — all writes are fire-and-forget
 *   - Offline-first: local store is truth, Supabase is durable backup
 *   - On login/restore: pulls remote data into local stores
 *   - On local write: pushes to Supabase in background
 */

import {
    reportBreadcrumb,
    reportError,
} from "../../infrastructure/errorReporting";
import {
    addFoodLoggingBreadcrumb,
    captureFoodLoggingError,
} from "../../infrastructure/errorReporting/foodLoggingErrors";
import { logColdStartStep } from "../../infrastructure/tracing/coldStartTrace";
import { getCurrentUser, getSupabaseClient } from "../../lib/supabase/client";
import { useGoalsStore } from "../goals/goals.store";
import type { GoalPlan } from "../goals/goals.types";
import { useNutritionStore } from "../nutrition/nutrition.store";
import type { MealEntry } from "../nutrition/nutrition.types";
import { useProfileStore } from "../profile/profile.store";
import type { UserProfile } from "../profile/profile.types";
import { useProgressStore } from "../progress/progress.store";
import type { WeightLog } from "../progress/progress.types";
import { mealDataSafety } from "./meal-data-safety";

// ── Helpers ──────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Per-call sync error logger. Per-meal / per-row sync errors fire frequently
 * (every offline/online toggle, every flaky network blip), so we emit a
 * Sentry breadcrumb instead of a full event. The orchestration callers
 * (restoreFromSupabase, pushAllToSupabase) emit their own full events at
 * the boundary so we still see when the pipeline fails as a whole.
 */
function logSyncError(context: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[Sync] ${context}:`, error);
  }
  reportBreadcrumb(`[Sync] ${context} failed`, {
    area: "sync",
    action: context,
    provider: "supabase",
    level: "warning",
    extra: {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
    },
  });
}

// ── Meal Sync ────────────────────────────────────────────────

export async function pushMeal(
  meal: MealEntry,
  knownUserId?: string
): Promise<void> {
  const userId = knownUserId ?? (await getUserId());
  if (!userId) return;

  try {
    const client = getSupabaseClient();
    const { error } = await client.from("meal_entries").upsert(
      {
        id: meal.id,
        user_id: userId,
        title: meal.title,
        source: meal.source,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        logged_at: meal.loggedAt,
        emoji: meal.emoji ?? null,
        meal_time: meal.mealTime ?? null,
        confidence: meal.confidence ?? null,
        image_uri: meal.imageUri ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
    if (error) throw error;
    // Confirmed on the server. Future reconciles can safely treat a missing
    // server-side row as "deleted on another device" rather than "pending push".
    useNutritionStore.getState().markMealSynced(meal.id);
    addFoodLoggingBreadcrumb("food_logging.remote_sync_success", {
      meal_id: meal.id,
    });
  } catch (e) {
    logSyncError("pushMeal", e);
    addFoodLoggingBreadcrumb("food_logging.remote_sync_failed", {
      meal_id: meal.id,
      provider: "supabase",
    });
    captureFoodLoggingError(
      e,
      {
        flow: "sync",
        step: "remote_sync_failed",
        mealId: meal.id,
        foodTitle: meal.title,
        calories: meal.calories,
        provider: "supabase",
        userId: userId,
      },
      { level: "warning" }
    );
  }
}

export async function pushMealUpdate(
  mealId: string,
  updates: Partial<MealEntry>,
  knownUserId?: string
): Promise<void> {
  const userId = knownUserId ?? (await getUserId());
  if (!userId) return;

  try {
    const client = getSupabaseClient();
    const mapped: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (updates.title !== undefined) mapped.title = updates.title;
    if (updates.calories !== undefined) mapped.calories = updates.calories;
    if (updates.protein !== undefined) mapped.protein = updates.protein;
    if (updates.carbs !== undefined) mapped.carbs = updates.carbs;
    if (updates.fat !== undefined) mapped.fat = updates.fat;
    if (updates.emoji !== undefined) mapped.emoji = updates.emoji;
    if (updates.mealTime !== undefined) mapped.meal_time = updates.mealTime;

    await client
      .from("meal_entries")
      .update(mapped)
      .eq("id", mealId)
      .eq("user_id", userId);
  } catch (e) {
    logSyncError("pushMealUpdate", e);
  }
}

export async function pushMealDelete(
  mealId: string,
  knownUserId?: string,
  context: string = "explicit-user-delete"
): Promise<void> {
  const userId = knownUserId ?? (await getUserId());
  if (!userId) return;

  // Hard safety gate. NOTHING gets to set `deleted_at` unless the safety
  // module says we are in `ready` phase for THIS user. Prevents account
  // switch / hydration from soft-deleting valid remote meals.
  if (!mealDataSafety.canDelete(userId, context)) {
    if (__DEV__) {
      console.warn(
        "[MealDataSafety] pushMealDelete BLOCKED — not safe to delete now",
        { mealId, userId, context }
      );
    }
    return;
  }

  try {
    const client = getSupabaseClient();

    // Prefer soft delete so the row stays auditable and cross-device sync
    // can converge. Fall back to hard delete on schemas that haven't run
    // the `add_meal_entries_deleted_at` migration yet.
    const { error: softError } = await client
      .from("meal_entries")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", mealId)
      .eq("user_id", userId);

    if (
      softError &&
      typeof softError.message === "string" &&
      softError.message.toLowerCase().includes("deleted_at")
    ) {
      await client
        .from("meal_entries")
        .delete()
        .eq("id", mealId)
        .eq("user_id", userId);
    } else if (softError) {
      throw softError;
    }
  } catch (e) {
    logSyncError("pushMealDelete", e);
  }
}

/**
 * How far back (in days) to pull meal history from Supabase.
 *
 * NOTE: keep this very large in production safety mode. A tight window can
 * make valid historical data appear "lost" after account reset/login (UI will
 * render empty because the server pull excludes older rows).
 */
const PULL_WINDOW_DAYS = 3650;

type PulledMealRow = {
  id: string;
  user_id: string;
  title: string;
  source: MealEntry["source"];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_at: string;
  emoji?: string | null;
  meal_time?: MealEntry["mealTime"] | null;
  confidence?: number | null;
  image_uri?: string | null;
};

export async function pullMeals(knownUserId?: string): Promise<MealEntry[]> {
  const userId = knownUserId ?? (await getUserId());
  if (!userId) {
    if (__DEV__) {
      console.warn("[CloudHydration] pullMeals: no userId — returning empty");
    }
    return [];
  }

  try {
    const client = getSupabaseClient();
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - PULL_WINDOW_DAYS);
    const sinceIso = sinceDate.toISOString();

    if (__DEV__) {
      console.log("[CloudHydration] pullMeals: querying", {
        userId,
        since: sinceIso.split("T")[0],
        windowDays: PULL_WINDOW_DAYS,
      });
    }

    // Filter out soft-deleted rows when the schema supports it (column added
    // in `add_meal_entries_deleted_at` migration). On older schemas Postgres
    // raises "column meal_entries.deleted_at does not exist" — we catch that
    // below and retry without the filter so old deployments still work.
    const query = client
      .from("meal_entries")
      .select("*")
      .eq("user_id", userId)
      .gte("logged_at", sinceIso)
      .is("deleted_at", null)
      .order("logged_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      // If the project hasn't run the soft-delete migration yet, retry without
      // the deleted_at filter so old deployments still work.
      if (
        typeof error.message === "string" &&
        error.message.toLowerCase().includes("deleted_at")
      ) {
        if (__DEV__) {
          console.log(
            "[CloudHydration] pullMeals: deleted_at column missing, retrying without filter"
          );
        }
        const { data: dataNoDeleteCol, error: error2 } = await client
          .from("meal_entries")
          .select("*")
          .eq("user_id", userId)
          .gte("logged_at", sinceIso)
          .order("logged_at", { ascending: false });
        if (error2) throw error2;
        const rows = (dataNoDeleteCol ?? []) as PulledMealRow[];
        const meals = rows.map(mapMealRow);
        if (__DEV__) {
          console.log("[CloudHydration] pullMeals: fetched (no-delete-col)", {
            userIdFromQuery: userId,
            count: meals.length,
            first3: rows.slice(0, 3).map((r) => ({
              id: r.id,
              title: r.title,
              logged_at: r.logged_at,
              user_id: r.user_id,
            })),
          });
        }
        return meals;
      }
      throw error;
    }
    if (!data) return [];

    const rows = data as PulledMealRow[];
    const meals = rows.map(mapMealRow);
    if (__DEV__) {
      console.log("[CloudHydration] pullMeals: fetched", {
        userId,
        userIdFromQuery: userId,
        queryDateRange: {
          start: sinceIso,
          end: new Date().toISOString(),
        },
        count: meals.length,
        oldestLoggedAt: meals.at(-1)?.loggedAt ?? "none",
        newestLoggedAt: meals.at(0)?.loggedAt ?? "none",
        first3: rows.slice(0, 3).map((r) => ({
          id: r.id,
          title: r.title,
          logged_at: r.logged_at,
          user_id: r.user_id,
        })),
      });
    }
    return meals;
  } catch (e) {
    if (__DEV__) console.warn("[CloudHydration] pullMeals error:", e);
    logSyncError("pullMeals", e);
    return [];
  }
}

function mapMealRow(row: {
  id: string;
  title: string;
  source: MealEntry["source"];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  logged_at: string;
  emoji?: string | null;
  meal_time?: MealEntry["mealTime"] | null;
  confidence?: number | null;
  image_uri?: string | null;
}): MealEntry {
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    loggedAt: row.logged_at,
    emoji: row.emoji ?? undefined,
    mealTime: row.meal_time ?? undefined,
    confidence: row.confidence ?? undefined,
    imageUri: row.image_uri ?? undefined,
  };
}

/**
 * Pull the IDs of meals that have been soft-deleted on the server (within
 * the same 90-day window as `pullMeals`). Used by `restoreFromSupabase` to
 * remove a meal from this device when another device deleted it.
 *
 * Gracefully returns `[]` for any of:
 *   - user not authenticated
 *   - the `deleted_at` column doesn't exist yet (migration not applied)
 *   - any network/RLS error
 *
 * The migration-not-applied case is fine: in that scenario `pushMealDelete`
 * has already fallen back to a hard DELETE, so the row simply won't appear
 * in `pullMeals` either, and reconcile will catch it via the
 * "previously-synced but now missing" path.
 */
export async function pullDeletedMealIds(knownUserId?: string): Promise<string[]> {
  const userId = knownUserId ?? (await getUserId());
  if (!userId) return [];

  try {
    const client = getSupabaseClient();
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - PULL_WINDOW_DAYS);
    const sinceIso = sinceDate.toISOString();

    const { data, error } = await client
      .from("meal_entries")
      .select("id")
      .eq("user_id", userId)
      .gte("logged_at", sinceIso)
      .not("deleted_at", "is", null);

    if (error) {
      // Schema doesn't have the column yet → no soft-deletes possible. Quiet.
      if (
        typeof error.message === "string" &&
        error.message.toLowerCase().includes("deleted_at")
      ) {
        return [];
      }
      throw error;
    }
    return (data ?? []).map((row: { id: string }) => row.id);
  } catch (e) {
    logSyncError("pullDeletedMealIds", e);
    return [];
  }
}

// ── Weight Log Sync ──────────────────────────────────────────

export async function pushWeightLog(log: WeightLog): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  try {
    const client = getSupabaseClient();
    await client.from("weight_logs").upsert(
      {
        id: log.id,
        user_id: userId,
        weight_lbs: log.weightLbs,
        date: log.date,
      },
      { onConflict: "id" }
    );
  } catch (e) {
    logSyncError("pushWeightLog", e);
  }
}

export async function pullWeightLogs(): Promise<WeightLog[]> {
  const userId = await getUserId();
  if (!userId) return [];

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("weight_logs")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((row) => ({
      id: row.id,
      date: row.date,
      weightLbs: row.weight_lbs,
    }));
  } catch (e) {
    logSyncError("pullWeightLogs", e);
    return [];
  }
}

// ── Goals Sync ───────────────────────────────────────────────

export async function pushGoals(
  goalType: string,
  plan: GoalPlan,
  timeframeWeeks: number | null
): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  try {
    const client = getSupabaseClient();

    // Deactivate any existing active goal
    await client
      .from("user_goals")
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("active", true);

    // Insert new active goal
    await client.from("user_goals").insert({
      user_id: userId,
      goal_type: goalType,
      calorie_budget: plan.calorieBudget,
      maintenance_calories: plan.maintenanceCalories,
      weekly_rate_lbs: plan.weeklyRateLbs,
      timeframe_weeks: timeframeWeeks ?? plan.timeframeWeeks ?? null,
      target_date: plan.targetDate ?? null,
      protein_g: plan.macros.protein,
      carbs_g: plan.macros.carbs,
      fat_g: plan.macros.fat,
      active: true,
    });
  } catch (e) {
    logSyncError("pushGoals", e);
  }
}

export async function pullGoals(): Promise<{
  goalType: string;
  plan: GoalPlan;
  timeframeWeeks: number | null;
} | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("user_goals")
      .select("*")
      .eq("user_id", userId)
      .eq("active", true)
      .single();

    if (error || !data) return null;

    return {
      goalType: data.goal_type,
      timeframeWeeks: data.timeframe_weeks,
      plan: {
        goalType: data.goal_type as GoalPlan["goalType"],
        calorieBudget: data.calorie_budget,
        maintenanceCalories: data.maintenance_calories,
        weeklyRateLbs: data.weekly_rate_lbs,
        timeframeWeeks: data.timeframe_weeks ?? 0,
        targetDate: data.target_date ?? null,
        macros: {
          protein: data.protein_g,
          carbs: data.carbs_g,
          fat: data.fat_g,
        },
      },
    };
  } catch (e) {
    logSyncError("pullGoals", e);
    return null;
  }
}

// ── Profile Sync ─────────────────────────────────────────────

export async function pushProfile(
  profile: UserProfile,
  knownUserId?: string
): Promise<{ ok: boolean; row?: Record<string, unknown>; error?: unknown }> {
  const userId = knownUserId ?? (await getUserId());
  if (!userId) {
    return { ok: false, error: "no-auth-user" };
  }

  const client = getSupabaseClient();
  const now = new Date().toISOString();
  const payload = {
    gender: profile.gender,
    birth_year: profile.birthYear,
    height_cm: profile.heightCm,
    current_weight_lbs: profile.currentWeightLbs,
    goal_weight_lbs: profile.goalWeightLbs,
    activity_level: profile.activityLevel,
    weight_unit: profile.weightUnit,
    height_unit: profile.heightUnit,
    onboarding_completed: profile.onboardingCompleted,
    updated_at: profile.updatedAt ?? now,
  };

  // ── Step 1: try UPDATE (row should already exist for onboarded users) ──
  const { data: updatedRows, error: updateError } = await client
    .from("user_profiles")
    .update(payload)
    .eq("user_id", userId)
    .select("user_id, weight_unit, height_unit, updated_at");

  if (updateError) {
    logSyncError("pushProfile/update", updateError);
    return { ok: false, error: { message: updateError.message, code: updateError.code } };
  }

  // ── Step 2: if no row matched, INSERT (new user who hasn't synced yet) ──
  if (!updatedRows || updatedRows.length === 0) {
    const { data: insertedRow, error: insertError } = await client
      .from("user_profiles")
      .insert({ user_id: userId, ...payload })
      .select("user_id, weight_unit, height_unit, updated_at")
      .single();

    if (insertError) {
      logSyncError("pushProfile/insert", insertError);
      return { ok: false, error: { message: insertError.message, code: insertError.code } };
    }

    return { ok: true, row: insertedRow as Record<string, unknown> };
  }

  // ── Step 3: UPDATE succeeded — return the written row ──
  return { ok: true, row: updatedRows[0] as Record<string, unknown> };
}

export async function pushUnitPreference(
  userId: string,
  weightUnit: UserProfile["weightUnit"],
  heightUnit: UserProfile["heightUnit"],
  updatedAt: string
): Promise<{ ok: boolean; row?: Record<string, unknown>; error?: unknown }> {
  const client = getSupabaseClient();
  const payload = {
    weight_unit: weightUnit,
    height_unit: heightUnit,
    updated_at: updatedAt,
  };

  // Step 1: update existing profile row.
  const { data: updatedRows, error: updateError } = await client
    .from("user_profiles")
    .update(payload)
    .eq("user_id", userId)
    .select("user_id, weight_unit, height_unit, updated_at");

  if (updateError) {
    logSyncError("pushUnitPreference/update", updateError);
    return { ok: false, error: { message: updateError.message, code: updateError.code } };
  }

  // Step 2: if profile row does not exist yet, insert minimum valid row.
  if (!updatedRows || updatedRows.length === 0) {
    const { data: insertedRow, error: insertError } = await client
      .from("user_profiles")
      .insert({
        user_id: userId,
        weight_unit: weightUnit,
        height_unit: heightUnit,
        updated_at: updatedAt,
      })
      .select("user_id, weight_unit, height_unit, updated_at")
      .single();

    if (insertError) {
      logSyncError("pushUnitPreference/insert", insertError);
      return { ok: false, error: { message: insertError.message, code: insertError.code } };
    }

    return { ok: true, row: insertedRow as Record<string, unknown> };
  }

  return { ok: true, row: updatedRows[0] as Record<string, unknown> };
}

/**
 * Result of a profile pull from Supabase.
 *
 * Distinguishes three cases that the caller MUST handle differently:
 *   - `found`:    Row exists for this user; profile data returned.
 *   - `missing`:  No row exists yet — caller may create one with defaults.
 *   - `error`:    Network/auth/transient failure — caller MUST NOT overwrite
 *                 with local defaults (we don't know remote state).
 *
 * The previous single `null` return type collapsed `missing` and `error`,
 * leading to a regression where a transient pullProfile failure caused
 * a fresh local profile to overwrite the user's real (onboarded) row.
 */
export type ProfilePullResult =
  | { kind: "found"; profile: UserProfile }
  | { kind: "missing" }
  | { kind: "error"; error: unknown };

export async function pullProfile(
  knownUserId?: string
): Promise<ProfilePullResult> {
  const userId = knownUserId ?? (await getUserId());
  if (!userId) {
    logColdStartStep("pull_profile_result", {
      userId: null,
      status: "error",
      remoteProfileId: null,
      remoteOnboardingCompleted: null,
      remoteUpdatedAt: null,
      error: "no-auth-user",
    });
    return { kind: "error", error: "no-auth-user" };
  }

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      if (__DEV__) {
        console.warn("[ProfileHydration] pullProfile error", {
          userId,
          code: (error as { code?: string }).code,
          message: error.message,
        });
      }
      logColdStartStep("pull_profile_result", {
        userId,
        status: "error",
        remoteProfileId: null,
        remoteOnboardingCompleted: null,
        remoteUpdatedAt: null,
        error: {
          code: (error as { code?: string }).code ?? null,
          message: error.message ?? String(error),
        },
      });
      return { kind: "error", error };
    }
    if (!data) {
      if (__DEV__) {
        console.log("[ProfileHydration] profileFound: false (no row)", { userId });
      }
      logColdStartStep("pull_profile_result", {
        userId,
        status: "missing",
        remoteProfileId: null,
        remoteOnboardingCompleted: null,
        remoteUpdatedAt: null,
        error: null,
      });
      return { kind: "missing" };
    }

    const resolvedWeightUnit = data.weight_unit ?? "lbs";
    const resolvedHeightUnit = data.height_unit ?? "cm";
    const resolvedUpdatedAt =
      typeof data.updated_at === "string" ? data.updated_at : null;
    const resolvedOnboardingCompleted = data.onboarding_completed ?? false;
    if (__DEV__) {
      console.log("[ProfileHydration] profileFound: true", {
        userId,
        onboardingCompleted: resolvedOnboardingCompleted,
        weightUnit: resolvedWeightUnit,
        updatedAt: resolvedUpdatedAt,
      });
    }
    logColdStartStep("pull_profile_result", {
      userId,
      status: "found",
      remoteProfileId: (data.user_id as string | undefined) ?? userId,
      remoteOnboardingCompleted: resolvedOnboardingCompleted,
      remoteUpdatedAt: resolvedUpdatedAt,
      error: null,
    });

    return {
      kind: "found",
      profile: {
        id: userId,
        gender: data.gender ?? null,
        birthYear: data.birth_year ?? null,
        heightCm: data.height_cm ?? null,
        currentWeightLbs: data.current_weight_lbs ?? null,
        goalWeightLbs: data.goal_weight_lbs ?? null,
        activityLevel: data.activity_level ?? null,
        weightUnit: resolvedWeightUnit,
        heightUnit: resolvedHeightUnit,
        onboardingCompleted: resolvedOnboardingCompleted,
        waterGoalMl: data.water_goal_ml ?? 2000,
        waterIncrementMl: data.water_increment_ml ?? 250,
        updatedAt: resolvedUpdatedAt,
      },
    };
  } catch (e) {
    logSyncError("pullProfile", e);
    logColdStartStep("pull_profile_result", {
      userId,
      status: "error",
      remoteProfileId: null,
      remoteOnboardingCompleted: null,
      remoteUpdatedAt: null,
      error: e instanceof Error ? e.message : String(e),
    });
    return { kind: "error", error: e };
  }
}

// ── Full Restore (login / app startup) ───────────────────────

/**
 * Restore all cloud data for `knownUserId` into local stores.
 *
 * Accepts an optional `knownUserId` so callers that already hold the auth
 * user ID (e.g. `useProgressSync`) can pass it directly, avoiding the extra
 * `supabase.auth.getUser()` network round-trip that `getUserId()` requires.
 * This removes a race window on fresh login where `getUser()` can transiently
 * return null while the session is still being persisted by the Supabase SDK.
 *
 * `trigger` is a debug label describing why the restore was initiated
 * (e.g. "login", "reload", "user-change").
 */
export type RestoreFromSupabaseResult =
  | { ok: true; profileResolved: boolean; reason: "found" | "created" | "fetch_error" }
  | { ok: false; reason: "no_user" | "exception" };

export async function restoreFromSupabase(
  knownUserId?: string,
  trigger?: string
): Promise<RestoreFromSupabaseResult> {
  const userId = knownUserId ?? (await getUserId());
  if (!userId) {
    if (__DEV__) {
      console.warn(
        "[CloudHydration] restoreFromSupabase: no userId — skipping"
      );
    }
    return { ok: false, reason: "no_user" };
  }

  const triggerLabel = trigger ?? "unknown";

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - PULL_WINDOW_DAYS);
  const sinceDateStr = sinceDate.toISOString().split("T")[0];

  if (__DEV__) {
    const localMealsBefore = useNutritionStore.getState().meals.length;
    console.log("[CloudHydration] restoreFromSupabase: start", {
      userId,
      trigger: triggerLabel,
      queryWindowDays: PULL_WINDOW_DAYS,
      querySince: sinceDateStr,
      localMealsBefore,
    });
  }

  try {
    const [
      remoteMeals,
      remoteDeletedIds,
      remoteWeightLogs,
      remoteGoals,
      profilePullResult,
    ] = await Promise.all([
      pullMeals(userId),
      pullDeletedMealIds(userId),
      pullWeightLogs(),
      pullGoals(),
      pullProfile(userId),
    ]);

    if (__DEV__) {
      const activeRemote = remoteMeals.length;
      const deletedRemote = remoteDeletedIds.length;
      console.log("[CloudHydration] restore:fetched", {
        userId,
        trigger: triggerLabel,
        queryDateRange: `last_${PULL_WINDOW_DAYS}_days`,
        remoteRowsFetchedCount: activeRemote,
        remoteRowsWithDeletedAtCount: deletedRemote,
        remoteWeightLogs: remoteWeightLogs.length,
        hasRemoteGoals: !!remoteGoals,
        profileResult: profilePullResult.kind,
      });
    }

    // ── Meals: bidirectional reconciliation ──
    //
    // After this block, the local meal list mirrors the server's ground
    // truth, with two exceptions that protect offline / pending writes:
    //   1. A meal in `deletedMealIds` (user just deleted on this device) is
    //      never re-added even if it still appears in `remoteMeals` — the
    //      delete hasn't propagated yet.
    //   2. A local meal that has never been synced is kept even if absent
    //      from the server — it's still pending push.
    const nutritionApi = useNutritionStore.getState();
    const localMealsBeforeMerge = nutritionApi.meals.length;
    const tombstones = new Set(nutritionApi.deletedMealIds);
    const serverActiveIds = new Set(remoteMeals.map((m) => m.id));
    const serverDeletedIds = new Set(remoteDeletedIds);

    // Mark every meal the server returned as known-synced. This is what
    // gives `reconcileWithServer` the confidence to drop a previously-seen
    // meal without nuking a not-yet-pushed local entry.
    for (const m of remoteMeals) {
      nutritionApi.markMealSynced(m.id);
    }

    // Drop local meals the server says are gone (soft-deleted or
    // hard-deleted on another device).
    nutritionApi.reconcileWithServer(serverActiveIds, serverDeletedIds);

    // Add any server meals we don't have locally (and the user hasn't just
    // deleted). Re-read state because reconcile may have changed it.
    const localMealsAfterReconcile = useNutritionStore.getState().meals;
    const localIdsAfterReconcile = new Set(
      localMealsAfterReconcile.map((m) => m.id)
    );
    const newRemoteMeals = remoteMeals.filter(
      (m) => !localIdsAfterReconcile.has(m.id) && !tombstones.has(m.id)
    );
    if (newRemoteMeals.length > 0) {
      const merged = [...localMealsAfterReconcile, ...newRemoteMeals].sort(
        (a, b) =>
          new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
      );
      useNutritionStore.setState({ meals: merged });
    }

    if (__DEV__) {
      const localMealsAfter = useNutritionStore.getState().meals.length;
      console.log("[CloudHydration] restore:meals-merged", {
        userId,
        trigger: triggerLabel,
        mealsCountBeforeSetState: localMealsBeforeMerge,
        newRemoteMealsAdded: newRemoteMeals.length,
        mealsCountAfterSetState: localMealsAfter,
        tombstones: tombstones.size,
      });
    }

    // Drop tombstones for ids the server confirms are gone (either soft-
    // deleted or no longer in the active pull). Prevents `deletedMealIds`
    // from growing unbounded over the lifetime of a device.
    if (tombstones.size > 0) {
      for (const id of tombstones) {
        if (!serverActiveIds.has(id)) {
          nutritionApi.forgetTombstone(id);
        }
      }
    }

    // Merge weight logs: remote fills gaps
    const localLogs = useProgressStore.getState().weightLogs;
    const localLogIds = new Set(localLogs.map((l) => l.id));
    const newRemoteLogs = remoteWeightLogs.filter(
      (l) => !localLogIds.has(l.id)
    );
    if (newRemoteLogs.length > 0) {
      const merged = [...localLogs, ...newRemoteLogs].sort((a, b) =>
        a.date < b.date ? 1 : -1
      );
      useProgressStore.setState({ weightLogs: merged });
    }

    // Goals: if local is empty, restore from remote
    const localPlan = useGoalsStore.getState().plan;
    if (!localPlan && remoteGoals) {
      useGoalsStore.setState({
        goalType: remoteGoals.goalType as GoalPlan["goalType"],
        plan: remoteGoals.plan,
        timeframeWeeks: remoteGoals.timeframeWeeks,
      });
    }

    if (__DEV__) {
      console.log("[ProfileHydration] restore started", {
        userId,
        result: profilePullResult.kind,
      });
    }

    // ── Profile state machine — three explicit cases ──
    //
    // CRITICAL: never collapse "missing" and "error" — they require opposite
    // actions. A transient pullProfile error MUST NOT cause us to push our
    // local defaults (onboarding_completed=false), or we will silently wipe
    // out a returning user's onboarding state on every cold start with a
    // flaky network.
    //
    //   "missing" → no row exists for this user (first social sign-in).
    //               Create one with the current local state. The local state
    //               is `initialProfile` (onboardingCompleted=false) for a
    //               brand-new user, or carries the user's locally entered
    //               onboarding inputs if they signed in mid-onboarding.
    //
    //   "error"   → fetch failed. Do NOT push. Trust local persisted state
    //               for routing; the next successful sync will reconcile.
    //
    //   "found"   → reconcile via last-write-wins on updatedAt. If remote
    //               says onboardingCompleted=true, prefer remote wholesale
    //               (covers cross-device install, app reinstall after
    //               completed onboarding).
    if (profilePullResult.kind === "missing") {
      if (__DEV__) {
        console.log("[ProfileHydration] profileCreated: starting", { userId });
      }
      const localProfile = useProfileStore.getState().profile;
      if (localProfile.id !== userId) {
        useProfileStore.getState().updateProfile({ id: userId });
      }
      // Stamp updatedAt so subsequent reconciliations have a real timestamp
      // to compare against (avoids the NaN-vs-NaN keep_local fallthrough).
      const stampedAt = new Date().toISOString();
      useProfileStore.getState().updateProfile({ updatedAt: stampedAt });
      const result = await pushProfile(
        { ...useProfileStore.getState().profile, id: userId },
        userId
      );
      if (__DEV__) {
        console.log("[ProfileHydration] profileCreated: complete", {
          userId,
          ok: result.ok,
          onboardingCompleted: useProfileStore.getState().profile.onboardingCompleted,
        });
      }
    } else if (profilePullResult.kind === "error") {
      if (__DEV__) {
        console.warn("[ProfileHydration] profile fetch errored — keeping local state", {
          userId,
        });
      }
      // Do NOT push. Do NOT wipe local state. Caller will fall back to
      // checking profile.id ownership before unblocking routing.
    } else {
      const remoteProfile = profilePullResult.profile;
      const localProfile = useProfileStore.getState().profile;
      const localUpdatedMs = localProfile.updatedAt
        ? Date.parse(localProfile.updatedAt)
        : Number.NaN;
      const remoteUpdatedMs = remoteProfile.updatedAt
        ? Date.parse(remoteProfile.updatedAt)
        : Number.NaN;

      if (__DEV__) {
        console.log("[UnitsPersistence] local before", {
          userId,
          weightUnit: localProfile.weightUnit,
          heightUnit: localProfile.heightUnit,
          updatedAt: localProfile.updatedAt,
        });
        console.log("[UnitsPersistence] remote fetched", {
          userId,
          weightUnit: remoteProfile.weightUnit,
          heightUnit: remoteProfile.heightUnit,
          updatedAt: remoteProfile.updatedAt,
        });
      }

      if (
        remoteProfile.onboardingCompleted &&
        !localProfile.onboardingCompleted
      ) {
        // Remote completed onboarding — use remote data wholesale
        if (__DEV__ && localProfile.weightUnit !== remoteProfile.weightUnit) {
          console.log("[UnitsPersistence] remote hydrated", {
            previousUnit: localProfile.weightUnit,
            nextUnit: remoteProfile.weightUnit,
            source: "remote",
            userId,
          });
        }
        useProfileStore.getState().updateProfile(remoteProfile);
      } else if (
        !localProfile.onboardingCompleted &&
        !remoteProfile.onboardingCompleted
      ) {
        // Neither finished — merge any non-null fields from remote
        const merged: Partial<UserProfile> = {};
        const fields: (keyof UserProfile)[] = [
          "gender",
          "birthYear",
          "heightCm",
          "currentWeightLbs",
          "goalWeightLbs",
          "activityLevel",
        ];
        for (const f of fields) {
          if (localProfile[f] == null && remoteProfile[f] != null) {
            (merged as any)[f] = remoteProfile[f];
          }
        }
        if (Object.keys(merged).length > 0) {
          useProfileStore.getState().updateProfile(merged);
        }
      }

      const remoteWeightUnit = remoteProfile.weightUnit;
      const remoteHeightUnit = remoteProfile.heightUnit;
      const validRemoteUnit =
        remoteWeightUnit === "kg" || remoteWeightUnit === "lbs";
      const validRemoteHeight =
        remoteHeightUnit === "cm" || remoteHeightUnit === "ft_in";
      if (!validRemoteUnit || !validRemoteHeight) {
        if (__DEV__) {
          console.log("[UnitsPersistence] decision", {
            userId,
            decision: "skip_invalid",
            previousUnit: localProfile.weightUnit,
            nextUnit: remoteWeightUnit,
            source: "remote",
            reason: "invalid-remote-unit",
          });
        }
        if (__DEV__) {
          console.log("[UnitsPersistence] remote skipped", {
            userId,
            previousUnit: localProfile.weightUnit,
            nextUnit: remoteWeightUnit ?? "unknown",
            source: "remote",
            reason: "invalid-remote-unit",
          });
        }
      } else if (Number.isNaN(localUpdatedMs) || remoteUpdatedMs > localUpdatedMs) {
        if (
          localProfile.weightUnit !== remoteWeightUnit ||
          localProfile.heightUnit !== remoteHeightUnit ||
          localProfile.updatedAt !== remoteProfile.updatedAt
        ) {
          useProfileStore.getState().updateProfile({
            weightUnit: remoteWeightUnit,
            heightUnit: remoteHeightUnit,
            updatedAt: remoteProfile.updatedAt,
          });
        }
        if (__DEV__) {
          console.log("[UnitsPersistence] decision", {
            userId,
            decision: "apply_remote",
            previousUnit: localProfile.weightUnit,
            nextUnit: remoteWeightUnit,
            source: "remote",
          });
        }
      } else if (!Number.isNaN(remoteUpdatedMs) && localUpdatedMs > remoteUpdatedMs) {
        if (__DEV__) {
          console.log("[UnitsPersistence] decision", {
            userId,
            decision: "push_local",
            previousUnit: localProfile.weightUnit,
            nextUnit: localProfile.weightUnit,
            source: "local",
          });
        }
        await pushProfile(localProfile);
      } else if (__DEV__) {
        console.log("[UnitsPersistence] decision", {
          userId,
          decision: "keep_local",
          previousUnit: localProfile.weightUnit,
          nextUnit: localProfile.weightUnit,
          source: "local",
        });
      }

      if (__DEV__) {
        const after = useProfileStore.getState().profile;
        console.log("[UnitsPersistence] local after", {
          userId,
          weightUnit: after.weightUnit,
          heightUnit: after.heightUnit,
          updatedAt: after.updatedAt,
        });
      }
    }

    // Stamp the local profile with this user's id so the routing guard can
    // verify ownership (prevents stale profile from another user misleading
    // the onboarding check).
    const finalProfile = useProfileStore.getState().profile;
    if (finalProfile.id !== userId) {
      useProfileStore.getState().updateProfile({ id: userId });
    }

    const profileResolved = profilePullResult.kind !== "error";
    const reason: "found" | "created" | "fetch_error" =
      profilePullResult.kind === "found"
        ? "found"
        : profilePullResult.kind === "missing"
          ? "created"
          : "fetch_error";

    if (__DEV__) {
      console.log("[CloudHydration] restoreFromSupabase: complete", {
        userId,
        trigger: triggerLabel,
        finalLocalMeals: useNutritionStore.getState().meals.length,
        onboardingCompleted: useProfileStore.getState().profile.onboardingCompleted,
        profileOwnerId: useProfileStore.getState().profile.id,
        profileResolved,
        reason,
      });
    }
    return { ok: true, profileResolved, reason };
  } catch (e) {
    if (__DEV__) console.warn("[CloudHydration] restoreFromSupabase error:", e);
    reportError(e, {
      area: "sync",
      action: "restoreFromSupabase",
      provider: "supabase",
      userId: userId ?? undefined,
    });
    return { ok: false, reason: "exception" };
  }
}

// ── Full Push (push everything local to remote) ──────────────

export async function pushAllToSupabase(options?: {
  suppressMealUpserts?: boolean;
  suppressTombstoneReplay?: boolean;
  reason?: string;
  knownUserId?: string;
}): Promise<void> {
  const userId = options?.knownUserId ?? (await getUserId());
  if (!userId) return;

  try {
    const meals = useNutritionStore.getState().meals;
    const weightLogs = useProgressStore.getState().weightLogs;
    const { goalType, plan, timeframeWeeks } = useGoalsStore.getState();

    if (__DEV__) {
      console.log("[DataLossAudit] pushAllToSupabase:start", {
        userId,
        reason: options?.reason ?? "unspecified",
        localMealsCount: meals.length,
        deletedMealIdsCount: useNutritionStore.getState().deletedMealIds.length,
        pushAllToSupabaseCalled: true,
        suppressMealUpserts: Boolean(options?.suppressMealUpserts),
        suppressTombstoneReplay: Boolean(options?.suppressTombstoneReplay),
      });
    }

    // Batch upsert meals. We deliberately do NOT include a `deleted_at`
    // column in the row payload — Postgres `ON CONFLICT DO UPDATE` only
    // updates the columns we specify, so a soft-deleted row on the server
    // stays soft-deleted even if a stale local copy gets pushed during
    // restore. (For schemas that pre-date the soft-delete migration this
    // is moot; in that case the row was hard-deleted and would re-insert,
    // which is exactly why `restoreFromSupabase` runs BEFORE this push.)
    if (meals.length > 0 && !options?.suppressMealUpserts) {
      const client = getSupabaseClient();
      const rows = meals.map((meal) => ({
        id: meal.id,
        user_id: userId,
        title: meal.title,
        source: meal.source,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        logged_at: meal.loggedAt,
        emoji: meal.emoji ?? null,
        meal_time: meal.mealTime ?? null,
        confidence: meal.confidence ?? null,
        image_uri: meal.imageUri ?? null,
        updated_at: new Date().toISOString(),
      }));
      const { error: mealsErr } = await client
        .from("meal_entries")
        .upsert(rows, { onConflict: "id" });
      if (mealsErr) throw mealsErr;
      // Mark every just-pushed meal as known-synced so future reconciles
      // can safely drop them if a remote delete arrives.
      const markSynced = useNutritionStore.getState().markMealSynced;
      for (const m of meals) markSynced(m.id);
    }

    // Replay any pending local deletes that may not have reached the server
    // (e.g. user removed a meal while offline). Without this, a logged-in
    // batch push would silently leave tombstoned meals alive on the server,
    // and the next `restoreFromSupabase` would re-pull them.
    //
    // Defense-in-depth: even if a caller forgets to set
    // `suppressTombstoneReplay`, `pushMealDelete` itself consults
    // `mealDataSafety.canDelete()` and rejects if we're not in `ready` phase
    // for this user. This prevents a recurrence of the 2026-04-29 incident
    // where 75 valid rows were soft-deleted on account switch.
    const tombstones = useNutritionStore.getState().deletedMealIds;
    if (tombstones.length > 0 && !options?.suppressTombstoneReplay) {
      await Promise.all(
        tombstones.map((id) =>
          pushMealDelete(id, userId, "pushAllToSupabase:replay")
        )
      );
    } else if (tombstones.length > 0 && __DEV__) {
      console.log("[MealDataSafety] tombstone replay suppressed", {
        userId,
        tombstoneCountBeforePush: tombstones.length,
        reason: options?.reason ?? "suppressTombstoneReplay flag",
      });
    }

    if (__DEV__) {
      console.log("[DataLossAudit] pushAllToSupabase:done", {
        userId,
        mealsUploadedCount:
          meals.length > 0 && !options?.suppressMealUpserts ? meals.length : 0,
        tombstonesUploadedCount:
          tombstones.length > 0 && !options?.suppressTombstoneReplay
            ? tombstones.length
            : 0,
        pushAllToSupabaseCalled: true,
      });
    }

    // Batch upsert weight logs
    if (weightLogs.length > 0) {
      const client = getSupabaseClient();
      const rows = weightLogs.map((log) => ({
        id: log.id,
        user_id: userId,
        weight_lbs: log.weightLbs,
        date: log.date,
      }));
      await client.from("weight_logs").upsert(rows, { onConflict: "id" });
    }

    // Push goals
    if (plan) {
      await pushGoals(goalType, plan, timeframeWeeks);
    }

    // Push profile
    const profile = useProfileStore.getState().profile;
    await pushProfile(profile);
  } catch (e) {
    // Whole-push orchestration failure on login. Low-frequency, high-signal: full event.
    if (__DEV__) console.warn("[Sync] pushAllToSupabase:", e);
    reportError(e, {
      area: "sync",
      action: "pushAllToSupabase",
      provider: "supabase",
      userId: userId ?? undefined,
    });
  }
}
