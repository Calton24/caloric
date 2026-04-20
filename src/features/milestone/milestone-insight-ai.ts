/**
 * Milestone Insight — AI Copy Service
 *
 * Calls a Supabase Edge Function to generate context-aware coaching copy.
 * Validates the response, caches it, and falls back to deterministic copy
 * if anything goes wrong.
 *
 * Architecture:
 *   1. App computes deterministic context (state, streak, milestone, etc.)
 *   2. This service asks AI for phrasing within strict constraints
 *   3. Response is validated (schema, length, banned phrases, state match)
 *   4. Valid copy is cached in AsyncStorage (12h TTL)
 *   5. On failure: deterministic fallback is used immediately
 *
 * AI does NOT decide product state. AI only phrases the message.
 */

import { getStorage } from "../../infrastructure/storage";
import { getSupabaseClient } from "../../lib/supabase/client";
import { getFallbackCopy } from "./milestone-insight-fallback";
import type {
    MilestoneInsightContext,
    MilestoneInsightCopy,
} from "./milestone-insight.types";

// ── Cache config ─────────────────────────────────────────────

const CACHE_PREFIX = "milestone_insight_v1";
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

interface CacheEntry {
  key: string;
  generatedAt: string;
  copy: MilestoneInsightCopy;
}

// ── Banned phrases ───────────────────────────────────────────

const BANNED_PHRASES = [
  "keep going",
  "you've got this",
  "you got this",
  "stay strong",
  "crush your goals",
  "smash your goals",
  "don't give up",
  "you're crushing it",
  "believe in yourself",
];

// ── Helpers ──────────────────────────────────────────────────

function buildCacheKey(ctx: MilestoneInsightContext): string {
  // Key on the dimensions that change the message
  const coaching = ctx.coachingStates?.join(",") ?? "";
  return `${ctx.state}:${ctx.streakCount}:${ctx.hasLoggedToday}:${ctx.nextMilestone ?? ""}:${ctx.timeOfDay}:${coaching}`;
}

function storageKey(cacheKey: string): string {
  return `${CACHE_PREFIX}:${cacheKey}`;
}

function containsBannedPhrase(text: string): boolean {
  const lower = text.toLowerCase();
  return BANNED_PHRASES.some((p) => lower.includes(p));
}

// ── Validation ───────────────────────────────────────────────

export function validateAICopy(
  raw: unknown
): { ok: true; copy: MilestoneInsightCopy } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "not_object" };
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.title !== "string" || obj.title.length === 0) {
    return { ok: false, reason: "missing_title" };
  }
  if (typeof obj.subtitle !== "string" || obj.subtitle.length === 0) {
    return { ok: false, reason: "missing_subtitle" };
  }

  // Length constraints (generous but prevent bloat)
  if (obj.title.length > 50) return { ok: false, reason: "title_too_long" };
  if (obj.subtitle.length > 100)
    return { ok: false, reason: "subtitle_too_long" };
  if (typeof obj.chip === "string" && obj.chip.length > 20)
    return { ok: false, reason: "chip_too_long" };
  if (typeof obj.ctaLabel === "string" && obj.ctaLabel.length > 20)
    return { ok: false, reason: "cta_too_long" };

  const title = (obj.title as string).trim();
  const subtitle = (obj.subtitle as string).trim();

  // Banned phrase check
  if (containsBannedPhrase(title) || containsBannedPhrase(subtitle)) {
    return { ok: false, reason: "banned_phrase" };
  }

  return {
    ok: true,
    copy: {
      title,
      subtitle,
      chip: typeof obj.chip === "string" ? obj.chip.trim() : undefined,
      ctaLabel:
        typeof obj.ctaLabel === "string" ? obj.ctaLabel.trim() : undefined,
    },
  };
}

// ── Cache layer ──────────────────────────────────────────────

async function getCached(
  ctx: MilestoneInsightContext
): Promise<MilestoneInsightCopy | null> {
  try {
    const storage = getStorage();
    const key = buildCacheKey(ctx);
    const raw = await storage.getItem(storageKey(key));
    if (!raw) return null;

    const entry = JSON.parse(raw) as CacheEntry;
    const age = Date.now() - new Date(entry.generatedAt).getTime();
    if (entry.key !== key || age > CACHE_TTL_MS) return null;

    return entry.copy;
  } catch {
    return null;
  }
}

async function setCache(
  ctx: MilestoneInsightContext,
  copy: MilestoneInsightCopy
): Promise<void> {
  try {
    const storage = getStorage();
    const key = buildCacheKey(ctx);
    const entry: CacheEntry = {
      key,
      generatedAt: new Date().toISOString(),
      copy,
    };
    await storage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    // Cache write failure is non-critical
  }
}

// ── AI call via Supabase Edge Function ──────────────────────

async function callAI(
  ctx: MilestoneInsightContext
): Promise<MilestoneInsightCopy | null> {
  try {
    const { data, error } = await getSupabaseClient().functions.invoke(
      "milestone-insight",
      {
        body: {
          state: ctx.state,
          streakCount: ctx.streakCount,
          hasLoggedToday: ctx.hasLoggedToday,
          nextMilestone: ctx.nextMilestone,
          daysToNextMilestone: ctx.daysToNextMilestone,
          recentTrend: ctx.recentTrend,
          adherence: ctx.adherence,
          timeOfDay: ctx.timeOfDay,
          goalType: ctx.goalType,
          lastLogHoursAgo: ctx.lastLogHoursAgo,
          // Coaching states for AI context
          coachingStates: ctx.coachingStates,
          caloriesRemaining: ctx.caloriesRemaining,
          proteinRemaining: ctx.proteinRemaining,
          tier: ctx.tier,
        },
      }
    );

    if (error) return null;

    const validated = validateAICopy(data);
    if (!validated.ok) return null;

    return validated.copy;
  } catch {
    return null;
  }
}

// ── Public API ───────────────────────────────────────────────

/**
 * Get coaching copy for the current insight context.
 *
 * Strategy:
 *   1. Check cache → return if fresh
 *   2. Try AI generation → validate → cache → return
 *   3. On any failure → fallback → cache → return
 *
 * Never throws. Always returns copy.
 */
export async function getMilestoneInsightCopy(
  ctx: MilestoneInsightContext,
  options?: { forceRefresh?: boolean }
): Promise<MilestoneInsightCopy> {
  // 1. Check cache
  if (!options?.forceRefresh) {
    const cached = await getCached(ctx);
    if (cached) return cached;
  }

  // 2. Try AI
  const aiCopy = await callAI(ctx);
  if (aiCopy) {
    await setCache(ctx, aiCopy);
    return aiCopy;
  }

  // 3. Fallback
  const fallback = getFallbackCopy(ctx);
  await setCache(ctx, fallback);
  return fallback;
}

/**
 * Synchronous fallback — for immediate rendering before async resolves.
 */
export function getMilestoneInsightCopySync(
  ctx: MilestoneInsightContext
): MilestoneInsightCopy {
  return getFallbackCopy(ctx);
}
