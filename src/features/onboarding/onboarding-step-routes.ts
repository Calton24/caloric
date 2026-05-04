/**
 * Mapping between onboarding step names (DB column values) and the
 * Expo Router pathnames they correspond to.
 *
 * Pure data — kept in its own file so it can be imported by both the
 * gate (for "resume from checkpoint" routing) and the checkpoint write
 * hook (for "this pathname → write this step name") without either of
 * them needing to know about the other.
 *
 * The `(onboarding)/` group is the canonical route family. The legacy
 * `onboarding/` (no parens) routes are NOT used for resume — anyone
 * still landing there will be normalised back into the `(onboarding)/`
 * group on next render anyway.
 */

import type { OnboardingStep } from "./onboarding-authority";

/** route to send the user to when resuming a given step. */
export const STEP_TO_ROUTE: Record<OnboardingStep, string> = {
  goal: "/(onboarding)/goal",
  body: "/(onboarding)/body",
  activity: "/(onboarding)/activity",
  "weight-goal": "/(onboarding)/weight-goal",
  timeframe: "/(onboarding)/timeframe",
  calculating: "/(onboarding)/calculating",
  plan: "/(onboarding)/plan",
  "save-progress": "/(onboarding)/save-progress",
  paywall: "/(onboarding)/paywall",
  complete: "/(onboarding)/complete",
};

/**
 * Reverse mapping: which onboarding step does a given pathname represent?
 *
 * Returns null for pathnames that aren't onboarding steps OR are steps
 * we should NOT checkpoint:
 *   - `landing`, `welcome`: pre-step screens. Persisting these as the
 *     checkpoint would mean a user who saw the landing once gets
 *     resumed back to landing forever, which looks like a bug.
 *   - `complete`: terminal screen. By the time the user reaches it the
 *     completion write owns the row, so a checkpoint write here would
 *     race the completion write. Leave it alone.
 */
export function pathnameToCheckpointStep(
  pathname: string
): OnboardingStep | null {
  // Strip group prefixes if present.
  // Match `/(onboarding)/<step>`, `/onboarding/<step>`, or bare `/<step>`.
  const groupRegex = /^\/(?:\(onboarding\)|onboarding)\/(.+)$/;
  const groupMatch = pathname.match(groupRegex);
  let bareStep: string | null = null;
  if (groupMatch) {
    bareStep = groupMatch[1];
  } else {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 1) bareStep = parts[0];
  }
  if (!bareStep) return null;

  switch (bareStep) {
    case "goal":
    case "body":
    case "activity":
    case "weight-goal":
    case "timeframe":
    case "calculating":
    case "plan":
    case "save-progress":
    case "paywall":
      return bareStep;
    // landing / welcome / complete are intentionally excluded — see jsdoc.
    default:
      return null;
  }
}
