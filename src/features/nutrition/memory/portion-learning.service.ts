/**
 * Portion Learning Service
 *
 * Learns personal portion preferences from user corrections.
 * When a user repeatedly corrects a food's estimated calories,
 * we compute a personal adjustment factor and apply it to future estimates.
 *
 * Flow:
 *   1. Pipeline estimates "bowl of oatmeal" → 350 kcal
 *   2. User corrects to 250 kcal → ratio = 250/350 = 0.71
 *   3. After ≥3 consistent corrections, adjustmentFactor ≈ 0.71
 *   4. Next time → 350 × 0.71 = 249 kcal (auto-calibrated)
 *
 * Data is persisted via Zustand + AsyncStorage.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getStorage } from "../../../infrastructure/storage";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CorrectionRecord {
  /** confirmed / original calorie ratio */
  ratio: number;
  /** When the correction happened */
  timestamp: string;
}

interface FoodCorrectionHistory {
  /** Normalized food name */
  name: string;
  /** Recent correction ratios (max 10 kept) */
  corrections: CorrectionRecord[];
}

interface PortionLearningState {
  /** Per-food correction histories */
  corrections: Record<string, FoodCorrectionHistory>;
  recordCorrection: (
    foodName: string,
    originalCalories: number,
    confirmedCalories: number
  ) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

/** Minimum corrections before applying an adjustment */
const MIN_CORRECTIONS = 3;

/** Maximum stored corrections per food (rolling window) */
const MAX_CORRECTIONS = 10;

/** Ignore corrections where the original was too small (noise) */
const MIN_ORIGINAL_CALORIES = 20;

/** Clamp extreme ratios to avoid wild swings */
const MIN_RATIO = 0.3;
const MAX_RATIO = 3.0;

// ─── Store ──────────────────────────────────────────────────────────────────

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

export const usePortionLearningStore = create<PortionLearningState>()(
  persist(
    (set) => ({
      corrections: {},

      recordCorrection: (foodName, originalCalories, confirmedCalories) => {
        if (originalCalories < MIN_ORIGINAL_CALORIES) return;
        if (confirmedCalories <= 0) return;

        const key = normalize(foodName);
        if (!key || key.length < 2) return;

        let ratio = confirmedCalories / originalCalories;
        ratio = Math.max(MIN_RATIO, Math.min(MAX_RATIO, ratio));

        set((state) => {
          const existing = state.corrections[key] ?? {
            name: key,
            corrections: [],
          };

          const updated = [
            ...existing.corrections,
            { ratio, timestamp: new Date().toISOString() },
          ].slice(-MAX_CORRECTIONS);

          return {
            corrections: {
              ...state.corrections,
              [key]: { name: key, corrections: updated },
            },
          };
        });
      },
    }),
    {
      name: "caloric-portion-learning",
      storage: createJSONStorage(() => ({
        getItem: (key: string) => getStorage().getItem(key),
        setItem: (key: string, value: string) =>
          getStorage().setItem(key, value),
        removeItem: (key: string) => getStorage().removeItem(key),
      })),
    }
  )
);

// ─── Query API (pure functions, no hooks) ───────────────────────────────────

/**
 * Get the personal adjustment factor for a food.
 * Returns null if insufficient data (< MIN_CORRECTIONS).
 *
 * The factor is a multiplier: 0.71 means "scale to 71% of pipeline estimate."
 */
export function getPortionAdjustment(foodName: string): number | null {
  const key = normalize(foodName);
  const history = usePortionLearningStore.getState().corrections[key];
  if (!history || history.corrections.length < MIN_CORRECTIONS) return null;

  // Weighted average: more recent corrections carry more weight
  const records = history.corrections;
  let weightedSum = 0;
  let totalWeight = 0;

  for (let i = 0; i < records.length; i++) {
    const weight = i + 1; // older = 1, newest = N
    weightedSum += records[i].ratio * weight;
    totalWeight += weight;
  }

  const factor = weightedSum / totalWeight;

  // Only apply if the adjustment is meaningful (>5% difference from 1.0)
  if (Math.abs(factor - 1.0) < 0.05) return null;

  return Math.round(factor * 100) / 100;
}

/**
 * Record corrections for all items in a meal.
 * Called from the correction tracker after a meal is confirmed.
 */
export function recordItemCorrections(
  items: {
    name: string;
    originalCalories: number;
    confirmedCalories: number;
  }[]
): void {
  const { recordCorrection } = usePortionLearningStore.getState();
  for (const item of items) {
    if (item.originalCalories !== item.confirmedCalories) {
      recordCorrection(
        item.name,
        item.originalCalories,
        item.confirmedCalories
      );
    }
  }
}
