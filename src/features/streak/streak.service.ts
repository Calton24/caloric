/**
 * Streak Service
 *
 * Tracks daily logging streaks by recording each day a meal is logged.
 * The streak is computed server-side via a Postgres function for reliability,
 * with a local fallback for offline usage.
 *
 * Architecture:
 *   1. On each meal log → record the date in daily_log_dates (idempotent upsert)
 *   2. Call update_user_streak() RPC to recompute streak from date records
 *   3. Cache streak info locally so the UI never waits on network
 */

import { getCurrentUser, getSupabaseClient } from "../../lib/supabase/client";
import type { StreakInfo } from "./streak.types";

// ── Local cache ──────────────────────────────────────────────

let cachedStreak: StreakInfo = {
  currentStreak: 0,
  longestStreak: 0,
  lastLogDate: null,
  streakStartDate: null,
};

export function getStreakInfo(): StreakInfo {
  return { ...cachedStreak };
}

/** Seed the in-memory cache from persisted Zustand store data */
export function seedStreakCache(info: StreakInfo): void {
  // Only seed if cache is empty (hasn't been populated by fetchStreak yet)
  if (cachedStreak.lastLogDate === null && info.lastLogDate !== null) {
    cachedStreak = { ...info };
  }
}

// ── Date helpers ─────────────────────────────────────────────

function toDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00"); // noon avoids DST edge
  d.setDate(d.getDate() - days);
  return toDateString(d);
}

// ── Record a logged day ──────────────────────────────────────

/**
 * Call after logging a meal. Records the date and recomputes the streak.
 * Fire-and-forget — never blocks UI.
 */
export async function recordMealLogged(
  calories: number,
  date?: Date
): Promise<StreakInfo> {
  const logDate = toDateString(date);

  // Optimistic local update for today & recent past dates
  updateLocalStreakOptimistic(logDate);

  // Push to Supabase in background — the RPC response will
  // update cachedStreak with server-authoritative values.
  pushDailyLog(logDate, calories).catch(() => {});

  return getStreakInfo();
}

/** Optimistically bump the local streak if today is the next consecutive day */
function updateLocalStreakOptimistic(logDate: string): void {
  const yesterday = subtractDays(logDate, 1);

  if (cachedStreak.lastLogDate === logDate) {
    // Already recorded today — no streak change
    return;
  }

  if (
    cachedStreak.lastLogDate === yesterday ||
    cachedStreak.lastLogDate === null
  ) {
    // Consecutive day or first day ever
    cachedStreak = {
      currentStreak: cachedStreak.currentStreak + 1,
      longestStreak: Math.max(
        cachedStreak.longestStreak,
        cachedStreak.currentStreak + 1
      ),
      lastLogDate: logDate,
      streakStartDate: cachedStreak.streakStartDate ?? logDate,
    };
  } else {
    // Streak broken — start fresh
    cachedStreak = {
      currentStreak: 1,
      longestStreak: Math.max(cachedStreak.longestStreak, 1),
      lastLogDate: logDate,
      streakStartDate: logDate,
    };
  }
}

// ── Supabase operations ──────────────────────────────────────

async function getUserId(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

async function pushDailyLog(logDate: string, calories: number): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  try {
    const client = getSupabaseClient();

    // Upsert the daily log date (increment meal count, add calories)
    await client.from("daily_log_dates").upsert(
      {
        user_id: userId,
        log_date: logDate,
        meal_count: 1,
        total_cals: calories,
      },
      { onConflict: "user_id,log_date" }
    );

    // Recompute streak via server function
    const { data } = await client.rpc("update_user_streak", {
      p_user_id: userId,
      p_today: logDate,
    });

    if (data && data.length > 0) {
      const row = data[0];
      cachedStreak = {
        currentStreak: row.current_streak,
        longestStreak: row.longest_streak,
        lastLogDate: logDate,
        streakStartDate: cachedStreak.streakStartDate,
      };
    }
  } catch (e) {
    if (__DEV__) {
      console.warn("[Streak] pushDailyLog error:", e);
    }
  }
}

// ── Fetch streak from Supabase ───────────────────────────────

export async function fetchStreak(): Promise<StreakInfo> {
  const userId = await getUserId();
  if (!userId) return getStreakInfo();

  try {
    const client = getSupabaseClient();
    const today = toDateString();

    // Recompute streak on the server from daily_log_dates (source of truth)
    const { data: rpcData } = await client.rpc("update_user_streak", {
      p_user_id: userId,
      p_today: today,
    });

    if (rpcData && rpcData.length > 0) {
      const row = rpcData[0];
      cachedStreak = {
        currentStreak: row.current_streak,
        longestStreak: row.longest_streak,
        lastLogDate: today,
        streakStartDate: cachedStreak.streakStartDate,
      };
      return getStreakInfo();
    }

    // Fallback: read from user_streaks table if RPC didn't return data
    const { data, error } = await client
      .from("user_streaks")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) return getStreakInfo();

    cachedStreak = {
      currentStreak: data.current_streak,
      longestStreak: data.longest_streak,
      lastLogDate: data.last_log_date,
      streakStartDate: data.streak_start_date,
    };

    // Check if streak is still valid (user may have missed yesterday)
    const yesterday = subtractDays(today, 1);
    if (
      cachedStreak.lastLogDate &&
      cachedStreak.lastLogDate !== today &&
      cachedStreak.lastLogDate !== yesterday
    ) {
      // Streak is broken — reset current (but keep longest)
      cachedStreak.currentStreak = 0;
      cachedStreak.streakStartDate = null;
    }

    return getStreakInfo();
  } catch (e) {
    if (__DEV__) {
      console.warn("[Streak] fetchStreak error:", e);
    }
    return getStreakInfo();
  }
}

// ── Fetch logged dates for calendar display ──────────────────

export async function fetchLoggedDates(
  startDate: string,
  endDate: string
): Promise<string[]> {
  const userId = await getUserId();
  if (!userId) return [];

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("daily_log_dates")
      .select("log_date")
      .eq("user_id", userId)
      .gte("log_date", startDate)
      .lte("log_date", endDate)
      .order("log_date", { ascending: true });

    if (error || !data) return [];
    return data.map((row) => row.log_date);
  } catch {
    return [];
  }
}
