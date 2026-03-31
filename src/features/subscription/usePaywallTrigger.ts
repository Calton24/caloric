/**
 * usePaywallTrigger — Behavioral paywall trigger logic
 *
 * Evaluates user activity (streak, scans, challenge state) and determines
 * whether to show a paywall, and which type. Consumers call `evaluate()`
 * and get back an action (or null if no paywall should show).
 *
 * Conversion days aligned to the 21-day journey:
 *   - Day 3:  soft paywall (skip allowed)
 *   - Day 7:  hard paywall (highest conversion so far)
 *   - Day 14: hard paywall (strong emotional leverage)
 *   - Day 21: strongest paywall (max emotional + conversion moment)
 *
 * Additional triggers:
 *   - SoftPaywall "scan_milestone" at 5, 10, 20 scans
 *   - SoftPaywall "insight_preview" when user hits insights with 3+ days
 *   - FeatureGatePaywall when user taps a gated feature
 *
 * Uses AsyncStorage to track which triggers have already fired
 * (prevents re-showing the same milestone paywall repeatedly).
 */

import { useCallback, useEffect, useState } from "react";
import { getStorage } from "../../infrastructure/storage";
import type { GatedFeature } from "../../ui/components/FeatureGatePaywall";
import type { SoftPaywallTrigger } from "../../ui/components/SoftPaywall";
import { useChallengeStore } from "../challenge/challenge.store";
import { getDayPaywall, type PaywallTrigger } from "../retention/day-journey";
import { useSubscriptionStore } from "../subscription/subscription.store";

// ── Types ──────────────────────────────────────────────────────────────────

export type PaywallAction =
  | {
      type: "soft";
      trigger: SoftPaywallTrigger;
      milestoneValue?: number;
    }
  | {
      type: "feature_gate";
      feature: GatedFeature;
    }
  | {
      type: "hard";
      /** Journey paywall copy (header + body). Null for non-journey triggers. */
      journeyCopy?: { headline: string; body: string };
    }
  | {
      type: "journey";
      /** Full paywall trigger from the day-journey system */
      paywallTrigger: PaywallTrigger;
      /** Current streak day that triggered this paywall */
      streakDay: number;
    }
  | null;

interface TriggerState {
  /** Keys of soft triggers already shown, e.g. "streak_3", "scan_10" */
  seenTriggers: Set<string>;
  loaded: boolean;
}

const STORAGE_KEY = "caloric:paywall_triggers_seen";

/** Conversion days from the 21-day journey: 3, 7, 14, 21 */
const SCAN_MILESTONES = [5, 10, 20];

// ── Hook ───────────────────────────────────────────────────────────────────

export function usePaywallTrigger() {
  const isPro = useSubscriptionStore(
    (s) => s.subscription.hasActiveSubscription
  );
  const challenge = useChallengeStore((s) => s.challenge);
  const [triggerState, setTriggerState] = useState<TriggerState>({
    seenTriggers: new Set(),
    loaded: false,
  });

  // Load seen triggers from storage
  useEffect(() => {
    getStorage()
      .getItem(STORAGE_KEY)
      .then((raw) => {
        const arr: string[] = raw ? JSON.parse(raw) : [];
        setTriggerState({ seenTriggers: new Set(arr), loaded: true });
      })
      .catch(() => {
        setTriggerState({ seenTriggers: new Set(), loaded: true });
      });
  }, []);

  const markSeen = useCallback(async (key: string) => {
    setTriggerState((prev) => {
      const next = new Set(prev.seenTriggers);
      next.add(key);
      getStorage()
        .setItem(STORAGE_KEY, JSON.stringify([...next]))
        .catch(() => {});
      return { ...prev, seenTriggers: next };
    });
  }, []);

  /**
   * Evaluate whether the current streak day triggers a journey paywall.
   * Day 3 = soft, Day 7/14 = hard, Day 21 = strongest (hard type).
   */
  const evaluateStreak = useCallback(
    (currentStreak: number): PaywallAction => {
      if (isPro || !triggerState.loaded) return null;

      // Check if this is a conversion day from the journey
      const journeyPaywall = getDayPaywall(currentStreak);
      if (!journeyPaywall) return null;

      const key = `streak_${currentStreak}`;
      if (triggerState.seenTriggers.has(key)) return null;

      markSeen(key);

      // All journey paywalls now use the dedicated journey type
      return {
        type: "journey",
        paywallTrigger: journeyPaywall,
        streakDay: currentStreak,
      };
    },
    [isPro, triggerState, markSeen]
  );

  /**
   * Evaluate whether a scan count milestone should trigger a soft paywall.
   */
  const evaluateScans = useCallback(
    (totalScans: number): PaywallAction => {
      if (isPro || !triggerState.loaded) return null;

      for (let i = SCAN_MILESTONES.length - 1; i >= 0; i--) {
        const milestone = SCAN_MILESTONES[i];
        if (
          totalScans >= milestone &&
          !triggerState.seenTriggers.has(`scan_${milestone}`)
        ) {
          markSeen(`scan_${milestone}`);
          return {
            type: "soft",
            trigger: "scan_milestone",
            milestoneValue: totalScans,
          };
        }
      }
      return null;
    },
    [isPro, triggerState, markSeen]
  );

  /**
   * Trigger the insight preview paywall. Only fires once.
   */
  const evaluateInsightAccess = useCallback((): PaywallAction => {
    if (isPro || !triggerState.loaded) return null;

    if (!triggerState.seenTriggers.has("insight_preview")) {
      markSeen("insight_preview");
      return { type: "soft", trigger: "insight_preview" };
    }
    return null;
  }, [isPro, triggerState, markSeen]);

  /**
   * Gate a specific feature — always returns an action if user isn't Pro.
   */
  const gateFeature = useCallback(
    (feature: GatedFeature): PaywallAction => {
      if (isPro) return null;
      return { type: "feature_gate", feature };
    },
    [isPro]
  );

  /**
   * Check if the challenge is completed and user should see the hard paywall.
   */
  const evaluateChallengeCompletion = useCallback((): PaywallAction => {
    if (isPro) return null;
    if (challenge?.status === "completed") {
      return { type: "hard" };
    }
    return null;
  }, [isPro, challenge]);

  /**
   * Get a contextual nudge message for journey-based moments.
   * Uses the day-journey paywall copy when available.
   */
  const getStreakNudge = useCallback(
    (streakDays: number): { message: string; showPaywall: boolean } | null => {
      if (isPro) return null;

      const journeyPaywall = getDayPaywall(streakDays);
      if (journeyPaywall) {
        return {
          message: `${journeyPaywall.headline}. ${journeyPaywall.body}`,
          showPaywall: journeyPaywall.strength !== "soft" || streakDays >= 3,
        };
      }

      return null;
    },
    [isPro]
  );

  return {
    /** True when trigger state has been loaded from storage */
    isReady: triggerState.loaded,
    /** Evaluate after a streak update */
    evaluateStreak,
    /** Evaluate after a food scan */
    evaluateScans,
    /** Evaluate when user opens insights tab */
    evaluateInsightAccess,
    /** Gate a premium feature (always blocks if not Pro) */
    gateFeature,
    /** Check for 21-day completion hard paywall */
    evaluateChallengeCompletion,
    /** Get contextual streak nudge copy */
    getStreakNudge,
  };
}
