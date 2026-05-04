/**
 * Insight Store
 *
 * Persisted bookkeeping for the insight engine:
 *
 *   - `shownAt[ruleId]` — last time this rule fired (cooldown window).
 *   - `dismissedAt[ruleId]` — last time the user explicitly dismissed it
 *     (soft-suppression window).
 *   - `lastPayloadHash[ruleId]` — last payload hash shown — engine uses
 *     this to dedup repeat firings of the *same* situation.
 *   - `recentRuleIds` — FIFO of last 5 rule ids fired (variety filter).
 *   - `dismissedToday` — rule ids dismissed *today* — fully suppressed
 *     until the next local day rollover.
 *   - `bestPctEver` — running-max 7-day adherence percentage. Used by
 *     the `best_week_ever` rule without re-scanning meal history.
 *
 * Everything persists via the existing storage abstraction so the
 * engine survives cold starts.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getStorage } from "../../infrastructure/storage";

const RECENT_LIMIT = 5;
const DAY_MS = 86_400_000;

interface InsightStoreState {
  shownAt: Record<string, number>;
  dismissedAt: Record<string, number>;
  lastPayloadHash: Record<string, string>;
  recentRuleIds: string[];
  dismissedToday: string[];
  /** Local YYYY-MM-DD on which dismissedToday was last cleared. */
  dismissedTodayKey: string | null;
  /** Best 7-day adherence ever observed. Updated by the hook on each pass. */
  bestPctEver: number;

  markShown: (ruleId: string, payloadHash: string, at?: number) => void;
  dismiss: (
    ruleId: string,
    options?: { soft?: boolean; todayIso?: string; at?: number }
  ) => void;
  /** Wipe stale "dismissedToday" entries when the local day rolls over. */
  rotateDailyDismissals: (todayIso: string) => void;
  /** Push a new best if the supplied 7d pct exceeds the current best. */
  recordAdherenceSnapshot: (pct7d: number) => void;
  /** Clear absolutely everything (account deletion, debug, etc). */
  reset: () => void;
}

const INITIAL: Omit<
  InsightStoreState,
  | "markShown"
  | "dismiss"
  | "rotateDailyDismissals"
  | "recordAdherenceSnapshot"
  | "reset"
> = {
  shownAt: {},
  dismissedAt: {},
  lastPayloadHash: {},
  recentRuleIds: [],
  dismissedToday: [],
  dismissedTodayKey: null,
  bestPctEver: 0,
};

export const useInsightStore = create<InsightStoreState>()(
  persist(
    (set, get) => ({
      ...INITIAL,

      markShown: (ruleId, payloadHash, at) => {
        const now = at ?? Date.now();
        const state = get();
        // Only update bookkeeping if the payload changed OR cooldown
        // would actually be measured against this firing — otherwise
        // we're churning storage on every render.
        const sameAsLast = state.lastPayloadHash[ruleId] === payloadHash;
        const sameAsLastShown = state.recentRuleIds.at(-1) === ruleId;
        if (sameAsLast && sameAsLastShown && now - (state.shownAt[ruleId] ?? 0) < 60_000) {
          return;
        }
        const recent = [...state.recentRuleIds, ruleId].slice(-RECENT_LIMIT);
        set({
          shownAt: { ...state.shownAt, [ruleId]: now },
          lastPayloadHash: { ...state.lastPayloadHash, [ruleId]: payloadHash },
          recentRuleIds: recent,
        });
      },

      dismiss: (ruleId, options) => {
        const now = options?.at ?? Date.now();
        const state = get();
        const todayIso = options?.todayIso ?? null;
        const next: Partial<InsightStoreState> = {
          dismissedAt: { ...state.dismissedAt, [ruleId]: now },
        };
        if (!options?.soft && todayIso) {
          const list = state.dismissedToday.includes(ruleId)
            ? state.dismissedToday
            : [...state.dismissedToday, ruleId];
          next.dismissedToday = list;
          next.dismissedTodayKey = todayIso;
        }
        set(next);
      },

      rotateDailyDismissals: (todayIso) => {
        const state = get();
        if (state.dismissedTodayKey === todayIso) return;
        set({ dismissedToday: [], dismissedTodayKey: todayIso });
      },

      recordAdherenceSnapshot: (pct7d) => {
        const state = get();
        if (pct7d > state.bestPctEver) {
          set({ bestPctEver: pct7d });
        }
      },

      reset: () => set({ ...INITIAL }),
    }),
    {
      name: "caloric-insights",
      version: 1,
      storage: createJSONStorage(() => ({
        getItem: (key: string) => getStorage().getItem(key),
        setItem: (key: string, value: string) =>
          getStorage().setItem(key, value),
        removeItem: (key: string) => getStorage().removeItem(key),
      })),
      // We persist everything — the whole point is durability across cold
      // starts so cooldowns and dismissals survive app relaunch.
      partialize: (state) => ({
        shownAt: state.shownAt,
        dismissedAt: state.dismissedAt,
        lastPayloadHash: state.lastPayloadHash,
        recentRuleIds: state.recentRuleIds,
        dismissedToday: state.dismissedToday,
        dismissedTodayKey: state.dismissedTodayKey,
        bestPctEver: state.bestPctEver,
      }),
    }
  )
);

/** Selector: read history snapshot for the engine. */
export function selectInsightHistory(state: InsightStoreState) {
  return {
    shownAt: state.shownAt,
    dismissedAt: state.dismissedAt,
    lastPayloadHash: state.lastPayloadHash,
    recentRuleIds: state.recentRuleIds,
    dismissedToday: state.dismissedToday,
  };
}

// Reference to silence the unused-var lint noise from the constants
// declared above — these are intentionally exported for tooling.
export const _DAY_MS = DAY_MS;
