/**
 * Pure access-decision state machine.
 *
 * Single source of truth for routing decisions. Given a snapshot of all
 * relevant state (auth, onboarding, RC, trial, last-known cache, current
 * route), returns ONE deterministic decision the router should obey.
 *
 * Critical invariants
 * -------------------
 *   1. NEVER gate on `unknown`, `loading`, `idle`, or `error` while a
 *      lower-precedence input is still resolving. Gating MUST require
 *      a definitive denial (RC inactive/error AND trial ready AND trial
 *      expired).
 *   2. Allowed account/legal/auth routes are reachable even when gated.
 *   3. Last-known active access acts as a FLICKER SHIELD ONLY — it lets
 *      us show a "revalidating" loading overlay while a transient failure
 *      (trial fetch error, RC error) is retried, instead of a hard gate.
 *      It NEVER unlocks the app on its own — final decision still requires
 *      RC active OR a freshly-confirmed active trial.
 *   4. This module has zero React / zero side effects. It is unit-testable
 *      in pure form.
 */

import type { BillingValidationStatus } from "../subscription/subscription.types";
import type { AppTrialBootstrapStatus } from "../subscription/app-trial.store";
import { APP_ENTRY_PATH } from "../navigation/app-entry-href";
import type { RouteContext } from "../navigation/route-segments";

export type { RouteContext };

export type AuthStatus = "loading" | "signedOut" | "signedIn";
export type OnboardingStatus = "loading" | "incomplete" | "complete" | "error";

/**
 * Last-known access snapshot, persisted across cold starts.
 * Used purely as a flicker shield — see invariant #3.
 */
export type LastKnownAccessKind =
  | "subscription_active"
  | "trial_active"
  | "none"
  | "unknown";

export interface LastKnownAccess {
  kind: LastKnownAccessKind;
  /** ISO timestamp of the last definitive resolution. */
  checkedAt: string | null;
}

/**
 * Route categorisation passed in by the gate (route matchers live in the
 * onboarding feature). Keeps this module 100% pure.
 */
export interface RouteFlags {
  isAuth: boolean;
  isInsideOnboardingFlow: boolean;
  isPermissions: boolean;
  isIndex: boolean;
  isPaywall: boolean;
  /** mode=upgrade — paywall opened voluntarily from settings. */
  isVoluntaryUpgradePaywall: boolean;
  /** Allowed under hard gate (legal, manage-account, restore, etc.). */
  isGatedAllowed: boolean;
}

export interface AccessDecisionInput {
  authStatus: AuthStatus;
  onboardingStatus: OnboardingStatus;
  /** Where to resume if onboarding is incomplete. */
  resumeTarget: string;
  rcValidationStatus: BillingValidationStatus;
  trialBootstrapStatus: AppTrialBootstrapStatus;
  trialIsActive: boolean;
  trialIsExpired: boolean;
  lastKnownAccess: LastKnownAccess;
  /**
   * Revalidation grace expired. The gate runs a timer (~10s) whenever
   * the decision would normally hold `loading` because of the flicker
   * shield (last-known-active cache + transient RC/trial error). If
   * revalidation hasn't succeeded by the time the timer fires, this
   * flag flips true and the decision falls through to the definitive
   * outcome — preventing infinite spinners when the server is
   * permanently broken (e.g. missing migration, deprecated RPC).
   */
  revalidationGraceExpired: boolean;
  currentPathname: string;
  /** Segment-aware route info — `pathname` alone cannot distinguish root stub from tabs. */
  routeContext: RouteContext;
  routeFlags: RouteFlags;
}

export type AccessDecisionType =
  | "loading"
  | "allow"
  | "redirect_landing"
  | "redirect_onboarding"
  | "redirect_tabs"
  | "redirect_gate"
  | "show_error";

export type AccessDecisionReason =
  // loading reasons
  | "auth_loading"
  | "onboarding_loading"
  | "rc_unknown"
  | "rc_loading"
  | "trial_idle"
  | "trial_loading"
  | "rc_error_revalidating_with_active_cache"
  | "trial_error_revalidating_with_active_cache"
  // allow reasons
  | "subscription_active"
  | "trial_active"
  | "allowed_account_route"
  | "voluntary_upgrade_paywall"
  | "incomplete_on_onboarding_route"
  | "unauth_on_allowed_route"
  | "on_paywall"
  // redirect reasons
  | "unauth_at_index"
  | "unauth_on_app_route"
  | "incomplete_at_index"
  | "incomplete_on_app_route"
  | "complete_at_index"
  | "complete_on_onboarding"
  | "complete_recover_not_found"
  | "complete_active_trial_exit_paywall_or_onboarding"
  | "subscription_inactive_trial_expired"
  // error
  | "onboarding_error";

export interface AccessDecision {
  type: AccessDecisionType;
  reason: AccessDecisionReason;
  /** Where to redirect, when type is a redirect_* or show_error reroute. */
  target?: string;
}

const PAYWALL_GATE_HREF = "/(onboarding)/paywall?mode=gate";
const LANDING_HREF = "/(onboarding)/landing";

/**
 * Derive a single access decision from raw inputs.
 *
 * Order of precedence (top wins):
 *   1.  Auth still loading                            → loading
 *   2.  Signed out:
 *         already on auth/onboarding                  → allow (unauth_on_allowed_route)
 *         elsewhere                                   → redirect_landing
 *   3.  Onboarding loading                            → loading (block UI)
 *   4.  Onboarding error                              → show_error
 *   5.  Onboarding incomplete:
 *         on onboarding/auth/permissions              → allow
 *         elsewhere                                   → redirect_onboarding (resume)
 *   6.  Onboarding complete + currentRoute is gated-allowlist
 *       (paywall/legal/manage-account)                → allow (no premature gate redirect)
 *   7.  Onboarding complete + RC unknown/loading      → loading
 *   8.  Onboarding complete + RC active               → allow / redirect_tabs
 *   9.  Onboarding complete + RC inactive|error:
 *         trial idle/loading                          → loading
 *         trial active (ready, isActive)              → allow / redirect_tabs
 *         trial ready + isExpired (definitive denial) → redirect_gate
 *         trial error + last-known active             → loading (revalidating)
 *         trial error + last-known none/unknown       → redirect_gate (fail closed)
 *  10.  RC error + last-known subscription_active +
 *       trial not yet ready                           → loading (revalidating)
 *
 * Note: Last-known cache only widens loading windows; it never replaces
 * a definitive denial.
 */
export function getAccessDecision(input: AccessDecisionInput): AccessDecision {
  const {
    authStatus,
    onboardingStatus,
    resumeTarget,
    rcValidationStatus,
    trialBootstrapStatus,
    trialIsActive,
    trialIsExpired,
    lastKnownAccess,
    routeFlags,
    routeContext,
  } = input;

  const { isInTabsGroup, isTrueRootIndex, isNotFoundRoute } = routeContext;

  // 1. Auth bootstrap not yet resolved.
  if (authStatus === "loading") {
    return { type: "loading", reason: "auth_loading" };
  }

  // 2. Signed-out branch.
  if (authStatus === "signedOut") {
    if (routeFlags.isAuth || routeFlags.isInsideOnboardingFlow) {
      return { type: "allow", reason: "unauth_on_allowed_route" };
    }
    return {
      type: "redirect_landing",
      reason: isTrueRootIndex ? "unauth_at_index" : "unauth_on_app_route",
      target: LANDING_HREF,
    };
  }

  // From here: signedIn.

  // 3. Onboarding still loading from server.
  if (onboardingStatus === "loading") {
    return { type: "loading", reason: "onboarding_loading" };
  }

  // 4. Onboarding errored. Surface retry UI on onboarding/index routes;
  //    elsewhere we fall through to allow rather than risk a gate flicker.
  if (onboardingStatus === "error") {
    if (
      routeFlags.isInsideOnboardingFlow ||
      isTrueRootIndex
    ) {
      return { type: "show_error", reason: "onboarding_error" };
    }
    return { type: "loading", reason: "onboarding_loading" };
  }

  // 5. Onboarding incomplete.
  if (onboardingStatus === "incomplete") {
    if (
      routeFlags.isInsideOnboardingFlow ||
      routeFlags.isAuth ||
      routeFlags.isPermissions
    ) {
      return { type: "allow", reason: "incomplete_on_onboarding_route" };
    }
    return {
      type: "redirect_onboarding",
      reason: isTrueRootIndex
        ? "incomplete_at_index"
        : "incomplete_on_app_route",
      target: resumeTarget,
    };
  }

  // From here: signedIn + onboarding complete.

  // 6. RC says active — paid entitlement live.
  if (rcValidationStatus === "active") {
    if (isInTabsGroup) {
      return { type: "allow", reason: "subscription_active" };
    }
    if (isNotFoundRoute) {
      return {
        type: "redirect_tabs",
        reason: "complete_recover_not_found",
        target: APP_ENTRY_PATH,
      };
    }
    if (routeFlags.isInsideOnboardingFlow || isTrueRootIndex) {
      return {
        type: "redirect_tabs",
        reason: isTrueRootIndex
          ? "complete_at_index"
          : "complete_on_onboarding",
        target: APP_ENTRY_PATH,
      };
    }
    return { type: "allow", reason: "subscription_active" };
  }

  // 7. RC still loading.
  if (rcValidationStatus === "unknown" || rcValidationStatus === "loading") {
    // Voluntary upgrade paywall: explicitly opened by the user — show it
    // even before RC resolves so they can scroll/read pricing while we wait.
    if (routeFlags.isVoluntaryUpgradePaywall) {
      return { type: "allow", reason: "voluntary_upgrade_paywall" };
    }
    return {
      type: "loading",
      reason: rcValidationStatus === "unknown" ? "rc_unknown" : "rc_loading",
    };
  }

  // From here: RC is "inactive" or "error" (no subscription confirmed).

  // 7a. Voluntary upgrade paywall — let user browse plans even without entitlement.
  if (routeFlags.isVoluntaryUpgradePaywall) {
    return { type: "allow", reason: "voluntary_upgrade_paywall" };
  }

  // 7b. Already on the gate paywall — never redirect-loop the user back to it.
  if (routeFlags.isPaywall) {
    return { type: "allow", reason: "on_paywall" };
  }

  // 7c. Legal / manage-account / restore / etc. — always reachable while gated.
  if (routeFlags.isGatedAllowed) {
    return { type: "allow", reason: "allowed_account_route" };
  }

  // 8. Trial bootstrap not ready — wait, do NOT gate.
  if (trialBootstrapStatus === "idle") {
    return { type: "loading", reason: "trial_idle" };
  }
  if (trialBootstrapStatus === "loading") {
    return { type: "loading", reason: "trial_loading" };
  }

  // 9. Trial fetch errored.
  if (trialBootstrapStatus === "error") {
    // Flicker shield: if our last definitive resolution said the user had
    // an active trial or subscription, prefer to keep showing loading
    // (the foreground sync will retry) rather than slam them to the gate.
    //
    // BUT: only while the grace window is still open. If revalidation has
    // failed for too long (server permanently broken), fall through to
    // the definitive outcome so the user isn't trapped on a spinner.
    if (
      !input.revalidationGraceExpired &&
      (lastKnownAccess.kind === "trial_active" ||
        lastKnownAccess.kind === "subscription_active")
    ) {
      return {
        type: "loading",
        reason: "trial_error_revalidating_with_active_cache",
      };
    }
    // No active cache, or grace expired → fail closed to gate.
    return {
      type: "redirect_gate",
      reason: "subscription_inactive_trial_expired",
      target: PAYWALL_GATE_HREF,
    };
  }

  // 10. Trial bootstrap ready.
  if (trialIsActive) {
    if (isInTabsGroup) {
      return { type: "allow", reason: "trial_active" };
    }
    if (isNotFoundRoute) {
      return {
        type: "redirect_tabs",
        reason: "complete_recover_not_found",
        target: APP_ENTRY_PATH,
      };
    }
    if (routeFlags.isInsideOnboardingFlow || isTrueRootIndex) {
      return {
        type: "redirect_tabs",
        reason: "complete_active_trial_exit_paywall_or_onboarding",
        target: APP_ENTRY_PATH,
      };
    }
    return { type: "allow", reason: "trial_active" };
  }

  // 11. RC error path with trial ready but not active.
  //     If our last-known cache has the user as active, this MIGHT be a
  //     transient RC outage — keep loading instead of bouncing to gate.
  //     Once RC retries and confirms inactive (or trial confirms expired),
  //     we'll arrive here again with a definitive denial.
  //
  //     Same grace rule as the trial-error case above: stop holding once
  //     the revalidation budget is exhausted, otherwise we'd spin forever
  //     on a permanently-broken RC backend.
  if (
    rcValidationStatus === "error" &&
    !trialIsExpired &&
    !input.revalidationGraceExpired
  ) {
    if (
      lastKnownAccess.kind === "subscription_active" ||
      lastKnownAccess.kind === "trial_active"
    ) {
      return {
        type: "loading",
        reason: "rc_error_revalidating_with_active_cache",
      };
    }
  }

  // 12. Definitive denial:
  //     - signed in
  //     - onboarding complete
  //     - RC definitively inactive or errored
  //     - trial bootstrap ready, not active
  //     → hard gate (we already short-circuited gated-allowlist routes above).
  return {
    type: "redirect_gate",
    reason: "subscription_inactive_trial_expired",
    target: PAYWALL_GATE_HREF,
  };
}

/**
 * Compute the LastKnownAccess kind from current resolved state. The gate
 * persists this whenever it makes a definitive decision so future cold
 * starts have a flicker shield.
 */
export function deriveLastKnownAccessKind(input: {
  rcValidationStatus: BillingValidationStatus;
  trialBootstrapStatus: AppTrialBootstrapStatus;
  trialIsActive: boolean;
}): LastKnownAccessKind | null {
  if (input.rcValidationStatus === "active") return "subscription_active";
  if (
    input.trialBootstrapStatus === "ready" &&
    input.trialIsActive
  ) {
    return "trial_active";
  }
  if (
    (input.rcValidationStatus === "inactive" ||
      input.rcValidationStatus === "error") &&
    input.trialBootstrapStatus === "ready" &&
    !input.trialIsActive
  ) {
    return "none";
  }
  // Inputs not definitive yet — don't overwrite the cache.
  return null;
}
