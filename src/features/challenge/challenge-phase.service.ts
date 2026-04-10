/**
 * Challenge Phase Service — the engine that runs the monetisation system.
 *
 * Two locked pure functions control everything:
 *   1. resolvePhase()  — where the user is
 *   2. shouldTriggerPaywall() — whether to interrupt
 *
 * All functions are pure — no IO, no React, fully testable.
 */

import type {
    ChallengePhase,
    MilestoneDay,
    PaywallContext,
    PaywallVariant,
    PhaseInput,
    PhaseResult,
    TriggerContext,
} from "./challenge-monetisation.types";

// ── Constants ────────────────────────────────────────────────────────────

/** Minimum cooldown between paywall displays (10 minutes). */
const PAYWALL_COOLDOWN_MS = 10 * 60 * 1000;

/** Milestone days in priority order (highest first for evaluation). */
const MILESTONE_DAYS: MilestoneDay[] = [21, 14, 7];

// ── Phase Resolution ─────────────────────────────────────────────────────

/**
 * Resolve the user's current monetisation phase.
 *
 * Priority (top wins):
 *   1. IDENTITY — terminal: challengeDay >= 21
 *   2. HOOK — not yet triggered insight
 *   3. FIRST_PAYWALL — insight triggered, not yet shown intro
 *   4. STRUCTURED_PUSH — milestone day, not yet seen
 *   5. VALUE_BUFFER — default for day 4+
 *   6. FALLBACK → VALUE_BUFFER
 */
export function resolvePhase(input: PhaseInput): PhaseResult {
  const {
    challengeDay,
    insightTriggered,
    introUsed,
    hasPurchased,
    milestonesSeen,
  } = input;

  // 1. Identity (terminal)
  if (challengeDay >= 21) {
    return { phase: "identity" };
  }

  // 2. Hook — still waiting for a behaviour-based insight
  if (!insightTriggered) {
    return { phase: "hook" };
  }

  // 3. First paywall — insight fired, intro not yet displayed
  if (insightTriggered && !hasPurchased && !introUsed) {
    return { phase: "first_paywall" };
  }

  // 4. Structured push — milestone days (check highest first)
  if (!hasPurchased) {
    for (const day of MILESTONE_DAYS) {
      if (challengeDay === day && !getMilestoneSeen(milestonesSeen, day)) {
        return { phase: "structured_push", milestoneDay: day };
      }
    }
  }

  // 5. Value buffer — day 4+ unpurchased
  if (!hasPurchased && challengeDay >= 4) {
    return { phase: "value_buffer" };
  }

  // 6. Fallback
  return { phase: "value_buffer" };
}

// ── Trigger Guard ────────────────────────────────────────────────────────

/**
 * Whether a paywall should actually be displayed right now.
 *
 * Rules:
 *   1. NEVER during critical flows (scanning, editing, onboarding)
 *   2. NEVER if phase hasn't changed (phase-change only)
 *   3. NEVER within 10-minute cooldown
 *   4. YES for FIRST_PAYWALL or STRUCTURED_PUSH
 *   5. NO for everything else (VALUE_BUFFER is passive)
 */
export function shouldTriggerPaywall(ctx: TriggerContext): boolean {
  // 1. Critical flow protection
  if (ctx.isInCriticalFlow) return false;

  // 2. Phase-change only — same phase means no re-trigger
  if (ctx.lastPhase !== undefined && ctx.phase === ctx.lastPhase) return false;

  // 3. Cooldown
  if (
    ctx.lastShownAt !== undefined &&
    ctx.currentTime - ctx.lastShownAt < PAYWALL_COOLDOWN_MS
  ) {
    return false;
  }

  // 4. Active paywall phases
  if (ctx.phase === "first_paywall" || ctx.phase === "structured_push") {
    return true;
  }

  // 5. Everything else is passive
  return false;
}

// ── Helpers ──────────────────────────────────────────────────────────────

/** Check if a phase triggers a paywall display. */
export function isPaywallPhase(phase: ChallengePhase): boolean {
  return phase === "first_paywall" || phase === "structured_push";
}

/** Map a phase to its paywall variant. */
export function phaseToVariant(phase: ChallengePhase): PaywallVariant {
  switch (phase) {
    case "first_paywall":
      return "intro";
    case "structured_push":
      return "milestone";
    default:
      return "buffer";
  }
}

/** Get milestone-specific copy for structured push paywalls. */
export function getMilestoneContent(day: MilestoneDay): {
  headline: string;
  body: string;
  cta: string;
} {
  switch (day) {
    case 7:
      return {
        headline: "One week in. You're building a habit.",
        body: "Most people quit by Day 3. You're still here — and your data proves you're making progress.",
        cta: "Unlock full insights",
      };
    case 14:
      return {
        headline: "Two weeks. This is who you are now.",
        body: "You've logged more consistently than 90% of users. Your trends are ready — unlock them.",
        cta: "See your full picture",
      };
    case 21:
      return {
        headline: "21 days. You did what most people can't.",
        body: "You've completed the challenge. Your full nutrition story is waiting.",
        cta: "Claim your results",
      };
  }
}

/**
 * Build the full paywall context for UI rendering.
 *
 * @param insightMessage — The specific insight that triggered the paywall.
 *   Used in the intro variant so the paywall references the user's data.
 */
export function buildPaywallContext(
  phase: ChallengePhase,
  milestoneDay?: MilestoneDay,
  insightMessage?: string | null
): PaywallContext {
  const variant = phaseToVariant(phase);

  if (variant === "intro") {
    return {
      variant: "intro",
      headline: "This pattern is affecting your results.",
      insightMessage: insightMessage ?? undefined,
      body: "Caloric can help you correct this. Unlock full AI analysis to start fixing it.",
      cta: "Unlock full analysis",
      showIntroPricing: true,
      showAnnualDiscount: true,
    };
  }

  if (variant === "milestone" && milestoneDay) {
    const content = getMilestoneContent(milestoneDay);
    return {
      variant: "milestone",
      headline: content.headline,
      body: content.body,
      cta: content.cta,
      milestoneDay,
      showIntroPricing: false,
      showAnnualDiscount: true,
    };
  }

  // Buffer — passive, subtle
  return {
    variant: "buffer",
    headline: "Unlock deeper insights",
    body: "Premium members see full macro trends, AI recommendations, and unlimited scans.",
    cta: "See plans",
    showIntroPricing: false,
    showAnnualDiscount: false,
  };
}

// ── Internal ─────────────────────────────────────────────────────────────

function getMilestoneSeen(
  milestonesSeen: PhaseInput["milestonesSeen"],
  day: MilestoneDay
): boolean {
  switch (day) {
    case 7:
      return milestonesSeen.day7;
    case 14:
      return milestonesSeen.day14;
    case 21:
      return milestonesSeen.day21;
  }
}
