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

import { getCurrentUser, getSupabaseClient } from "../../lib/supabase/client";
import { useGoalsStore } from "../goals/goals.store";
import type { GoalPlan } from "../goals/goals.types";
import { useNutritionStore } from "../nutrition/nutrition.store";
import type { MealEntry } from "../nutrition/nutrition.types";
import { useProfileStore } from "../profile/profile.store";
import type { UserProfile } from "../profile/profile.types";
import { useProgressStore } from "../progress/progress.store";
import type { WeightLog } from "../progress/progress.types";

// ── Helpers ──────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

function logSyncError(context: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[Sync] ${context}:`, error);
  }
}

// ── Meal Sync ────────────────────────────────────────────────

export async function pushMeal(meal: MealEntry): Promise<void> {
  const userId = await getUserId();
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
  } catch (e) {
    logSyncError("pushMeal", e);
  }
}

export async function pushMealUpdate(
  mealId: string,
  updates: Partial<MealEntry>
): Promise<void> {
  const userId = await getUserId();
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

export async function pushMealDelete(mealId: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

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
 * How far back (in days) to pull meal history from Supabase. Anything older
 * than this is considered cold storage and is irrelevant to the home screen,
 * weekly view, or streak window. Bounding the pull is what stops a deleted
 * "black coffee" from being re-merged into local state on every login.
 */
const PULL_WINDOW_DAYS = 90;

export async function pullMeals(): Promise<MealEntry[]> {
  const userId = await getUserId();
  if (!userId) return [];

  try {
    const client = getSupabaseClient();
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - PULL_WINDOW_DAYS);
    const sinceIso = sinceDate.toISOString();

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
        const { data: dataNoDeleteCol, error: error2 } = await client
          .from("meal_entries")
          .select("*")
          .eq("user_id", userId)
          .gte("logged_at", sinceIso)
          .order("logged_at", { ascending: false });
        if (error2) throw error2;
        return (dataNoDeleteCol ?? []).map(mapMealRow);
      }
      throw error;
    }
    if (!data) return [];

    return data.map(mapMealRow);
  } catch (e) {
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
export async function pullDeletedMealIds(): Promise<string[]> {
  const userId = await getUserId();
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

export async function pushProfile(profile: UserProfile): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  try {
    const client = getSupabaseClient();
    await client.from("user_profiles").upsert(
      {
        user_id: userId,
        gender: profile.gender,
        birth_year: profile.birthYear,
        height_cm: profile.heightCm,
        current_weight_lbs: profile.currentWeightLbs,
        goal_weight_lbs: profile.goalWeightLbs,
        activity_level: profile.activityLevel,
        weight_unit: profile.weightUnit,
        height_unit: profile.heightUnit,
        onboarding_completed: profile.onboardingCompleted,
        water_goal_ml: profile.waterGoalMl,
        water_increment_ml: profile.waterIncrementMl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
  } catch (e) {
    logSyncError("pushProfile", e);
  }
}

export async function pullProfile(): Promise<UserProfile | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) return null;

    return {
      id: userId,
      gender: data.gender ?? null,
      birthYear: data.birth_year ?? null,
      heightCm: data.height_cm ?? null,
      currentWeightLbs: data.current_weight_lbs ?? null,
      goalWeightLbs: data.goal_weight_lbs ?? null,
      activityLevel: data.activity_level ?? null,
      weightUnit: data.weight_unit ?? "lbs",
      heightUnit: data.height_unit ?? "cm",
      onboardingCompleted: data.onboarding_completed ?? false,
      waterGoalMl: data.water_goal_ml ?? 2000,
      waterIncrementMl: data.water_increment_ml ?? 250,
    };
  } catch (e) {
    logSyncError("pullProfile", e);
    return null;
  }
}

// ── Full Restore (login / app startup) ───────────────────────

export async function restoreFromSupabase(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  try {
    const [
      remoteMeals,
      remoteDeletedIds,
      remoteWeightLogs,
      remoteGoals,
      remoteProfile,
    ] = await Promise.all([
      pullMeals(),
      pullDeletedMealIds(),
      pullWeightLogs(),
      pullGoals(),
      pullProfile(),
    ]);

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

    // Profile: remote wins if onboarding was completed remotely
    if (remoteProfile) {
      const localProfile = useProfileStore.getState().profile;
      if (
        remoteProfile.onboardingCompleted &&
        !localProfile.onboardingCompleted
      ) {
        // Remote completed onboarding — use remote data wholesale
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
    }
  } catch (e) {
    logSyncError("restoreFromSupabase", e);
  }
}

// ── Full Push (push everything local to remote) ──────────────

export async function pushAllToSupabase(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  try {
    const meals = useNutritionStore.getState().meals;
    const weightLogs = useProgressStore.getState().weightLogs;
    const { goalType, plan, timeframeWeeks } = useGoalsStore.getState();

    // Batch upsert meals. We deliberately do NOT include a `deleted_at`
    // column in the row payload — Postgres `ON CONFLICT DO UPDATE` only
    // updates the columns we specify, so a soft-deleted row on the server
    // stays soft-deleted even if a stale local copy gets pushed during
    // restore. (For schemas that pre-date the soft-delete migration this
    // is moot; in that case the row was hard-deleted and would re-insert,
    // which is exactly why `restoreFromSupabase` runs BEFORE this push.)
    if (meals.length > 0) {
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
    const tombstones = useNutritionStore.getState().deletedMealIds;
    if (tombstones.length > 0) {
      await Promise.all(tombstones.map((id) => pushMealDelete(id)));
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
    logSyncError("pushAllToSupabase", e);
  }
}
