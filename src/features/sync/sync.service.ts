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
    await client.from("meal_entries").upsert(
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
    await client
      .from("meal_entries")
      .delete()
      .eq("id", mealId)
      .eq("user_id", userId);
  } catch (e) {
    logSyncError("pushMealDelete", e);
  }
}

export async function pullMeals(): Promise<MealEntry[]> {
  const userId = await getUserId();
  if (!userId) return [];

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("meal_entries")
      .select("*")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false });

    if (error) throw error;
    if (!data) return [];

    return data.map((row) => ({
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
    }));
  } catch (e) {
    logSyncError("pullMeals", e);
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
    const [remoteMeals, remoteWeightLogs, remoteGoals, remoteProfile] =
      await Promise.all([
        pullMeals(),
        pullWeightLogs(),
        pullGoals(),
        pullProfile(),
      ]);

    // Merge meals: remote wins for any ID not in local, local wins for local-only
    const localMeals = useNutritionStore.getState().meals;
    const localMealIds = new Set(localMeals.map((m) => m.id));
    const newRemoteMeals = remoteMeals.filter((m) => !localMealIds.has(m.id));
    if (newRemoteMeals.length > 0) {
      const merged = [...localMeals, ...newRemoteMeals].sort(
        (a, b) =>
          new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
      );
      useNutritionStore.setState({ meals: merged });
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

    // Batch upsert meals
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
      await client.from("meal_entries").upsert(rows, { onConflict: "id" });
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
