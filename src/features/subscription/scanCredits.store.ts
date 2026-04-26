/**
 * Scan Credits Store — Track free-tier AI scan usage
 *
 * Free users get a limited number of AI scans. Premium users get unlimited.
 * Credits are persisted to storage so they survive app restarts.
 *
 * Free tier limits:
 *   - 3 total AI scans lifetime (generous enough to show value)
 *   - After credits exhausted → FeatureGatePaywall("unlimited_scans")
 *
 * Premium tier: unlimited (bypass all checks)
 */

import { create } from "zustand";
import { getStorage } from "../../infrastructure/storage";

// ── Constants ──────────────────────────────────────────────────────────────

const STORAGE_KEY = "caloric:scan_credits";
const FREE_TIER_TOTAL_LIMIT = 999_999; // TEMP: limit disabled

// ── Types ──────────────────────────────────────────────────────────────────

interface ScanCreditsData {
  /** Total scans used (lifetime) */
  totalUsed: number;
  /** Maximum scans allowed for free tier */
  totalLimit: number;
}

interface ScanCreditsStore {
  credits: ScanCreditsData;
  loaded: boolean;

  /** Load credits from persistent storage */
  hydrate: () => Promise<void>;

  /** Check if a free user has remaining credits */
  hasCredits: () => boolean;

  /** Number of credits remaining for free tier */
  remaining: () => number;

  /** Consume one scan credit. Returns true if allowed, false if exhausted. */
  consumeCredit: () => Promise<boolean>;

  /** Reset credits (for testing or admin) */
  resetCredits: () => Promise<void>;
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useScanCreditsStore = create<ScanCreditsStore>((set, get) => ({
  credits: {
    totalUsed: 0,
    totalLimit: FREE_TIER_TOTAL_LIMIT,
  },
  loaded: false,

  hydrate: async () => {
    try {
      const raw = await getStorage().getItem(STORAGE_KEY);
      if (raw) {
        const parsed: ScanCreditsData = JSON.parse(raw);
        set({
          credits: {
            totalUsed: parsed.totalUsed ?? 0,
            // Always use the constant — never restore from storage so
            // changing FREE_TIER_TOTAL_LIMIT takes effect immediately.
            totalLimit: FREE_TIER_TOTAL_LIMIT,
          },
          loaded: true,
        });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },

  hasCredits: () => {
    const { credits } = get();
    return credits.totalUsed < credits.totalLimit;
  },

  remaining: () => {
    const { credits } = get();
    return Math.max(0, credits.totalLimit - credits.totalUsed);
  },

  consumeCredit: async () => {
    const { credits } = get();
    if (credits.totalUsed >= credits.totalLimit) return false;

    const updated: ScanCreditsData = {
      ...credits,
      totalUsed: credits.totalUsed + 1,
    };
    set({ credits: updated });

    await getStorage()
      .setItem(STORAGE_KEY, JSON.stringify(updated))
      .catch(() => {});

    return true;
  },

  resetCredits: async () => {
    const fresh: ScanCreditsData = {
      totalUsed: 0,
      totalLimit: FREE_TIER_TOTAL_LIMIT,
    };
    set({ credits: fresh });
    await getStorage()
      .setItem(STORAGE_KEY, JSON.stringify(fresh))
      .catch(() => {});
  },
}));

/** Expose the free tier limit for UI display */
export const FREE_SCAN_LIMIT = FREE_TIER_TOTAL_LIMIT;
