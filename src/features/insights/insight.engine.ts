/**
 * Insight Engine — Selection Layer
 *
 * Pure function: (rules, context, history) → Insight.
 *
 * Pipeline:
 *
 *   1. Evaluate every rule against the context. Drop nulls.
 *   2. Filter out rules whose hour-gate or persona-gate fails.
 *   3. Filter out rules currently in cooldown (per-rule + category default).
 *   4. Filter out rules whose payloadHash was recently dismissed by user.
 *   5. Skip rules whose payloadHash matches the LAST shown — same exact
 *      message, no new information → silent (anti-nag).
 *   6. Apply variety filter for non-critical: if rule fired in the last
 *      VARIETY_WINDOW evaluations, deprioritize.
 *   7. Apply persona priority modulation.
 *   8. Sort by final priority desc; break ties by category rank.
 *   9. Resolve i18n with tone variant + fallback chain.
 *  10. Return the winner.
 *
 * Determinism is a feature: same context + same history → same insight.
 */

import type {
  Insight,
  InsightCategory,
  InsightContext,
  InsightRule,
  InsightToneVariant,
  RuleEvaluationResult,
} from "./insight.types";

/**
 * Minimal `t()` shape we depend on. Compatible with `useAppTranslation`'s
 * `TypedT` and i18next's `TFunction` — keeps the engine layer free of
 * any direct dependency on react-i18next.
 */
export type InsightTranslator = (
  key: string,
  params?: Record<string, string | number> | { defaultValue: string }
) => string;
import { CATEGORY_COOLDOWN_HOURS, INSIGHT_RULES } from "./insight.rules";

/** History the engine reads from the persisted insight store. */
export interface InsightHistory {
  /** ms since epoch — last time each rule fired. */
  shownAt: Record<string, number>;
  /** ms since epoch — last time each rule was dismissed by the user. */
  dismissedAt: Record<string, number>;
  /** Last payloadHash shown for each rule (for dedup). */
  lastPayloadHash: Record<string, string>;
  /** FIFO of last N rule ids shown (for variety). */
  recentRuleIds: string[];
  /** Ids of rules dismissed *today* — suppressed for the day. */
  dismissedToday: string[];
}

const VARIETY_WINDOW = 3;
const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
/** Soft dismissal default — non-critical rules stay quiet 24h post-dismiss. */
const DEFAULT_DISMISS_QUIET_HOURS = 24;
const CRITICAL_DISMISS_QUIET_HOURS = 6;

const CATEGORY_RANK: Record<InsightCategory, number> = {
  critical: 4,
  warning: 3,
  positive: 2,
  optimization: 1,
  neutral: 0,
};

const CATEGORY_TO_TONE: Record<InsightCategory, Insight["tone"]> = {
  critical: "urgent",
  warning: "warning",
  positive: "positive",
  optimization: "neutral",
  neutral: "neutral",
};

interface EvaluatorOptions {
  rules?: ReadonlyArray<InsightRule>;
}

interface CandidateScore {
  rule: InsightRule;
  result: RuleEvaluationResult;
  priority: number;
}

// ── Helpers ────────────────────────────────────────────────────────────

function passesHourGate(rule: InsightRule, hour: number): boolean {
  if (!rule.hourGate) return true;
  const { after, before } = rule.hourGate;
  if (after != null && hour < after) return false;
  if (before != null && hour >= before) return false;
  return true;
}

function passesPersonaGate(
  rule: InsightRule,
  ctx: InsightContext
): boolean {
  if (!rule.personaGate) return true;
  return rule.personaGate.includes(ctx.persona);
}

function inCooldown(
  rule: InsightRule,
  history: InsightHistory,
  now: number
): boolean {
  // -1 disables cooldown entirely.
  const ruleCooldown = rule.cooldownHours;
  if (ruleCooldown < 0) return false;

  const last = history.shownAt[rule.id];
  if (!last) return false;

  const hours =
    ruleCooldown > 0 ? ruleCooldown : CATEGORY_COOLDOWN_HOURS[rule.category];
  if (hours === 0) return false;

  return now - last < hours * HOUR_MS;
}

function inDismissalQuietPeriod(
  rule: InsightRule,
  history: InsightHistory,
  now: number
): boolean {
  if (!rule.dismissible) return false;
  const last = history.dismissedAt[rule.id];
  if (!last) return false;
  const quietHours =
    rule.category === "critical"
      ? CRITICAL_DISMISS_QUIET_HOURS
      : DEFAULT_DISMISS_QUIET_HOURS;
  return now - last < quietHours * HOUR_MS;
}

function dedupAgainstLastShown(
  rule: InsightRule,
  result: RuleEvaluationResult,
  history: InsightHistory
): boolean {
  // If the same rule with the same payload hash was the *last* one shown,
  // suppress this firing. Different payload (e.g., remaining lbs changed)
  // → allow.
  const last = history.lastPayloadHash[rule.id];
  if (!last) return false;
  return last === result.payloadHash;
}

function personaPriorityModifier(
  rule: InsightRule,
  ctx: InsightContext
): number {
  // Newcomers and returners get extra weight on positive/critical
  // (build trust) and slightly reduced weight on optimization (don't
  // overload them).
  if (ctx.persona === "newcomer" || ctx.persona === "returner") {
    if (rule.category === "positive") return 6;
    if (rule.category === "critical") return 3;
    if (rule.category === "optimization") return -10;
  }
  // Power users tolerate (and value) bolder feedback. Warnings get a
  // small boost because they trust the system to call them out.
  if (ctx.persona === "power") {
    if (rule.category === "warning") return 4;
  }
  return 0;
}

function variePenalty(
  rule: InsightRule,
  history: InsightHistory
): number {
  if (rule.category === "critical") return 0;
  if (rule.category === "neutral") return 0;
  const window = history.recentRuleIds.slice(-VARIETY_WINDOW);
  return window.includes(rule.id) ? -8 : 0;
}

function resolveCopy(
  t: InsightTranslator,
  baseKey: string,
  toneVariant: InsightToneVariant,
  params: Record<string, string | number> | undefined
): string {
  // Prefer tone-specific variant; fall back to base key.
  if (toneVariant !== "direct") {
    const variantKey = `${baseKey}_${toneVariant}`;
    const out = t(variantKey, { ...(params ?? {}), defaultValue: "" });
    if (out && out !== variantKey && out.length > 0) return out;
  }
  return t(baseKey, params ?? {});
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * Pure evaluator. Returns the highest-priority insight that survived
 * filtering. Always returns a result — falls back to neutral steady-state.
 */
export function evaluateInsight(
  ctx: InsightContext,
  history: InsightHistory,
  t: InsightTranslator,
  options: EvaluatorOptions = {}
): Insight {
  const rules = options.rules ?? INSIGHT_RULES;
  const now = ctx.now.getTime();

  const candidates: CandidateScore[] = [];

  for (const rule of rules) {
    // Gates first — cheap filters before evaluation.
    if (!passesHourGate(rule, ctx.hour)) continue;
    if (!passesPersonaGate(rule, ctx)) continue;
    if (inCooldown(rule, history, now)) continue;
    if (inDismissalQuietPeriod(rule, history, now)) continue;
    if (history.dismissedToday.includes(rule.id)) continue;

    const result = rule.evaluate(ctx);
    if (!result) continue;

    if (dedupAgainstLastShown(rule, result, history)) continue;

    const personaMod = personaPriorityModifier(rule, ctx);
    const variety = variePenalty(rule, history);
    const boost = result.priorityBoost ?? 0;
    const priority = Math.max(
      0,
      Math.min(100, rule.basePriority + boost + personaMod + variety)
    );

    candidates.push({ rule, result, priority });
  }

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return CATEGORY_RANK[b.rule.category] - CATEGORY_RANK[a.rule.category];
  });

  // Always have a fallback — the neutral_steady rule is the final guard.
  const winner = candidates[0];
  if (!winner) {
    // This should never happen because `neutral_steady` returns a result
    // unconditionally, but guard for the case it's been disabled.
    return {
      id: "neutral_steady",
      category: "neutral",
      tone: "neutral",
      priority: 0,
      title: t("progress.insights.neutral_steady.title"),
      message: t("progress.insights.neutral_steady.message"),
      payloadHash: "neutral_steady",
      persona: ctx.persona,
      generatedAt: now,
    };
  }

  const { rule, result, priority } = winner;
  const title = resolveCopy(
    t,
    result.titleKey,
    ctx.toneVariant,
    result.params
  );
  const message = resolveCopy(
    t,
    result.messageKey,
    ctx.toneVariant,
    result.params
  );
  const cta = result.cta
    ? {
        label: t(result.cta.labelKey),
        action: result.cta.action,
      }
    : undefined;

  return {
    id: rule.id,
    category: rule.category,
    tone: CATEGORY_TO_TONE[rule.category] ?? rule.tone,
    priority,
    title,
    message,
    cta,
    payloadHash: result.payloadHash,
    persona: ctx.persona,
    generatedAt: now,
  };
}
