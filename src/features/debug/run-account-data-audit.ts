/**
 * One-shot diagnostic: compare Supabase-visible rows vs local Zustand for the
 * signed-in user. Intended for dev / `EXPO_PUBLIC_ACCOUNT_DATA_AUDIT=1` builds.
 *
 * Interpreting output: see product checklist in docs or team runbook.
 */
import { getCurrentUser, getSupabaseClient } from "../../lib/supabase/client";
import { useGoalsStore } from "../goals/goals.store";
import { useNutritionStore } from "../nutrition/nutrition.store";
import { useProfileStore } from "../profile/profile.store";
import { useSyncReadyStore } from "../sync/sync-ready.store";

export type AccountDataAuditHomeSnapshot = {
  viewMode: string;
  selectedDate: string;
  /** Meals whose `loggedDateLocal` (or UTC fallback) falls on `selectedDate`. */
  mealsForSelectedDay: number;
  /** Total meal rows across the visible week strip (all 7 keys). */
  weekMealRowTotal: number;
  /** Calendar days in the visible month grid with ≥1 meal. */
  monthDaysWithMeals: number;
  /** Total meal rows summed across every day cell in the month grid. */
  monthMealRowTotal: number;
};

const PULL_WINDOW_DAYS = 3650;

function mealSelectColumns() {
  // Use only columns that exist in the meal_entries table.
  // logged_at_utc does NOT exist — the table uses `logged_at` for the UTC timestamp.
  return "id,title,logged_at,logged_date_local,timezone,user_id,calories,protein,carbs,fat,deleted_at";
}

export async function runAccountDataAudit(
  userId: string,
  home?: AccountDataAuditHomeSnapshot
): Promise<void> {
  const nutritionState = useNutritionStore.getState();
  const profileState = useProfileStore.getState();
  const goalsState = useGoalsStore.getState();
  const syncReady = useSyncReadyStore.getState();

  let sessionUserId: string | null = null;
  try {
    const u = await getCurrentUser();
    sessionUserId = u?.id ?? null;
  } catch {
    sessionUserId = null;
  }

  const client = getSupabaseClient();

  console.log("[AccountDataAudit] start", {
    paramUserId: userId,
    sessionUserId,
    sessionMatchesParam: sessionUserId === userId,
    syncRestoredFor: syncReady.syncRestoredFor,
    profileConfirmedFor: syncReady.profileConfirmedFor,
    localMeals: nutritionState.meals.length,
    localFirst3: nutritionState.meals.slice(0, 3).map((m) => ({
      id: m.id,
      title: m.title,
      loggedAt: m.loggedAt,
      loggedDateLocal: m.loggedDateLocal,
      timezone: m.timezone,
    })),
    localProfile: {
      id: profileState.profile.id,
      currentWeightLbs: profileState.profile.currentWeightLbs,
      goalWeightLbs: profileState.profile.goalWeightLbs,
      weightUnit: profileState.profile.weightUnit,
      onboardingCompleted: profileState.profile.onboardingCompleted,
    },
    localGoals: goalsState.plan
      ? {
          calorieBudget: goalsState.plan.calorieBudget,
          protein: goalsState.plan.macros.protein,
          carbs: goalsState.plan.macros.carbs,
          fat: goalsState.plan.macros.fat,
        }
      : null,
    home: home ?? null,
  });

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - PULL_WINDOW_DAYS);
  const sinceIso = sinceDate.toISOString();

  let mealsHead = await client
    .from("meal_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("deleted_at", null);

  if (
    mealsHead.error &&
    typeof mealsHead.error.message === "string" &&
    mealsHead.error.message.toLowerCase().includes("deleted_at")
  ) {
    mealsHead = await client
      .from("meal_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
  }

  console.log("[AccountDataAudit] remote_meal_count_all_visible", {
    error: mealsHead.error,
    count: mealsHead.count,
  });

  let mealsSample = await client
    .from("meal_entries")
    .select(mealSelectColumns(), { count: "exact" })
    .eq("user_id", userId)
    .gte("logged_at", sinceIso)
    .is("deleted_at", null)
    .order("logged_at", { ascending: false })
    .limit(10);

  if (
    mealsSample.error &&
    typeof mealsSample.error.message === "string" &&
    mealsSample.error.message.toLowerCase().includes("deleted_at")
  ) {
    mealsSample = await client
      .from("meal_entries")
      .select(mealSelectColumns(), { count: "exact" })
      .eq("user_id", userId)
      .gte("logged_at", sinceIso)
      .order("logged_at", { ascending: false })
      .limit(10);
  }

  console.log("[AccountDataAudit] remote_meals_pull_window", {
    sinceIso,
    error: mealsSample.error,
    count: mealsSample.count,
    first10: mealsSample.data,
  });

  const profileResult = await client
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  console.log("[AccountDataAudit] remote_user_profiles", {
    error: profileResult.error,
    data: profileResult.data,
  });

  let weightResult = await client
    .from("weight_logs")
    .select("id,user_id,weight_lbs,date", { count: "exact" })
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(10);

  if (weightResult.error) {
    console.log("[AccountDataAudit] remote_weight_logs", {
      error: weightResult.error,
      count: null,
      first10: null,
    });
  } else {
    console.log("[AccountDataAudit] remote_weight_logs", {
      error: null,
      count: weightResult.count,
      first10: weightResult.data,
    });
  }

  const goalsResult = await client
    .from("user_goals")
    .select("*")
    .eq("user_id", userId)
    .eq("active", true)
    .maybeSingle();

  console.log("[AccountDataAudit] remote_user_goals_active", {
    error: goalsResult.error,
    data: goalsResult.data,
  });

  console.log("[AccountDataAudit] done");
}
