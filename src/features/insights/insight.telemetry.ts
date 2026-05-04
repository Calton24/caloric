/**
 * Insight Telemetry
 *
 * Single seam for all insight-related analytics events. Owns:
 *   - canonical payload construction (so all 3 events share the same shape)
 *   - per-session dedup of `insight_shown` events (one per id + payloadHash)
 *   - dev-time console logging for every event
 *   - safe no-op behavior when no analytics client is registered
 *
 * Event names:
 *   - insight_shown          (deduped per id + payload_hash within a session)
 *   - insight_cta_pressed    (always fires on user CTA tap)
 *   - insight_dismissed      (always fires on user dismiss)
 *
 * The telemetry layer is the ONLY place that calls `analytics.track`
 * for insights, so we never end up with two call sites racing each
 * other for the same event.
 */

import { analytics } from "../../infrastructure/analytics";
import type { Insight } from "./insight.types";

/**
 * Surface where the insight was rendered. Used to disambiguate events
 * once we surface insights on Home + other screens.
 */
export type InsightScreen = "progress" | "home" | "other";

/**
 * Canonical payload shape sent to `analytics.track`. Modelled as a type
 * alias rather than an interface so it carries an implicit index
 * signature — `analytics.track` is typed as `Record<string, unknown>`
 * and TS interfaces don't auto-widen.
 */
type InsightAnalyticsPayload = {
  insight_id: string;
  category: Insight["category"];
  priority: number;
  persona: Insight["persona"];
  tone: Insight["tone"];
  /** null when the insight has no CTA. */
  cta_action: string | null;
  payload_hash: string;
  screen: InsightScreen;
  /** ms since epoch — when the engine produced this insight. */
  generated_at: number;
};

/**
 * Per-session dedup set for `insight_shown`. Lives at module scope so
 * it survives across screen mounts within the same app session, but is
 * cleared when the app process restarts (natural session boundary) or
 * when `resetSession()` is called (sign-out / account deletion).
 */
const sessionShown = new Set<string>();

function buildPayload(
  insight: Insight,
  screen: InsightScreen
): InsightAnalyticsPayload {
  return {
    insight_id: insight.id,
    category: insight.category,
    priority: insight.priority,
    persona: insight.persona,
    tone: insight.tone,
    cta_action: insight.cta?.action ?? null,
    payload_hash: insight.payloadHash,
    screen,
    generated_at: insight.generatedAt,
  };
}

function devLog(event: string, payload: InsightAnalyticsPayload): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[InsightTelemetry] ${event}`, payload);
  }
}

export const insightTelemetry = {
  /**
   * Fire `insight_shown` exactly once per (insight_id, payload_hash)
   * within the current app session. Subsequent calls with the same
   * (id, hash) tuple are silent no-ops — safe to call from a render-
   * triggered useEffect without spamming.
   *
   * A different `payload_hash` for the same `insight_id` (e.g. the
   * `near_goal` rule re-firing with `1.4 lbs` after previously firing
   * with `1.5 lbs`) is treated as a NEW event — that's a real change
   * in user state worth analyzing.
   */
  shown(insight: Insight, screen: InsightScreen): void {
    const dedupKey = `${insight.id}:${insight.payloadHash}`;
    if (sessionShown.has(dedupKey)) return;
    sessionShown.add(dedupKey);

    const payload = buildPayload(insight, screen);
    devLog("insight_shown", payload);
    analytics.track("insight_shown", payload);
  },

  ctaPressed(insight: Insight, screen: InsightScreen): void {
    const payload = buildPayload(insight, screen);
    devLog("insight_cta_pressed", payload);
    analytics.track("insight_cta_pressed", payload);
  },

  dismissed(insight: Insight, screen: InsightScreen): void {
    const payload = buildPayload(insight, screen);
    devLog("insight_dismissed", payload);
    analytics.track("insight_dismissed", payload);
  },

  /**
   * Drop the per-session dedup set. Called on account deletion (and
   * available for tests) so the next user starts fresh.
   */
  resetSession(): void {
    sessionShown.clear();
  },
};

// Test/diagnostic helper — exposed only for unit tests.
export function _peekSessionShown(): ReadonlySet<string> {
  return sessionShown;
}
