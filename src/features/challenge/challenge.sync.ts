/**
 * Challenge Sync — push/pull challenge state to Supabase.
 *
 * Follows the same pattern as sync.service.ts:
 *   - Never blocks the UI
 *   - Offline-first: local store is truth
 *   - On login: pull remote → merge into local store
 *   - On local write: push to Supabase in background
 */

import { getCurrentUser, getSupabaseClient } from "../../lib/supabase/client";
import type { ChallengeStatus, UserChallenge } from "./challenge.types";

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
    console.warn(`[ChallengeSync] ${context}:`, error);
  }
}

function rowToChallenge(row: Record<string, unknown>): UserChallenge {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    startedAt: row.started_at as string,
    challengeDays: row.challenge_days as number,
    status: row.status as ChallengeStatus,
    offerUnlocked: row.offer_unlocked as boolean,
    offerSeenAt: (row.offer_seen_at as string | null) ?? null,
    convertedAt: (row.converted_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ── Push ─────────────────────────────────────────────────────

/**
 * Upsert the active challenge to Supabase.
 * Safe to call even if the user is not authenticated yet
 * (returns early — local store is the source of truth offline).
 */
export async function pushChallenge(challenge: UserChallenge): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;

  try {
    const client = getSupabaseClient();
    await client.from("user_challenges").upsert(
      {
        id: challenge.id,
        user_id: userId,
        started_at: challenge.startedAt,
        challenge_days: challenge.challengeDays,
        status: challenge.status,
        offer_unlocked: challenge.offerUnlocked,
        offer_seen_at: challenge.offerSeenAt ?? null,
        converted_at: challenge.convertedAt ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch (e) {
    logSyncError("pushChallenge", e);
  }
}

// ── Pull ─────────────────────────────────────────────────────

/**
 * Fetch the most recent active challenge for the current user.
 * Returns null if none exists or if not authenticated.
 */
export async function pullChallenge(): Promise<UserChallenge | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("user_challenges")
      .select("*")
      .eq("user_id", userId)
      .in("status", ["active", "completed", "expired"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;
    return rowToChallenge(data as Record<string, unknown>);
  } catch (e) {
    logSyncError("pullChallenge", e);
    return null;
  }
}

/**
 * Insert a brand-new challenge row (first time only).
 * Uses the challenge's id so subsequent upserts work correctly.
 */
export async function createChallenge(
  challenge: UserChallenge
): Promise<string | null> {
  const userId = await getUserId();
  if (!userId) return null;

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from("user_challenges")
      .insert({
        id: challenge.id,
        user_id: userId,
        started_at: challenge.startedAt,
        challenge_days: challenge.challengeDays,
        status: challenge.status,
        offer_unlocked: challenge.offerUnlocked,
        offer_seen_at: challenge.offerSeenAt ?? null,
        converted_at: challenge.convertedAt ?? null,
      })
      .select("id")
      .single();

    if (error || !data) return null;
    return (data as { id: string }).id;
  } catch (e) {
    logSyncError("createChallenge", e);
    return null;
  }
}
