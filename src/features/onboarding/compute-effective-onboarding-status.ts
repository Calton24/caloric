import type { OnboardingStatus } from "../access/access-decision";
import type { BillingValidationStatus } from "../subscription/subscription.types";
import type { AppTrialBootstrapStatus } from "../subscription/app-trial.store";

export interface EffectiveOnboardingStatusContext {
  userId: string | null;
  profileUserId: string;
  profileOnboardingCompleted: boolean;
  rcValidationStatus: BillingValidationStatus;
  trialBootstrapStatus: AppTrialBootstrapStatus;
  trialIsActive: boolean;
  /** True after onboarding has stayed in "loading" longer than the grace budget. */
  onboardingWaitExpired: boolean;
}

/**
 * Maps server-driven onboarding status into what the access gate should use.
 *
 * Release fix (2026-05-08): `commitResolvedOutcome` used to await async
 * storage + optional network (post-auth handoff) *before* calling
 * `setResolved`, so the store stayed `resolving` and the gate saw
 * `onboarding_loading` even after `resolveOnboardingStatus` had already
 * logged `status: complete`. We now commit immediately in the resolver; this
 * helper is a safety net so paid / active-trial users with local proof of
 * onboarding completion never spin forever if the resolver stalls again.
 */
export function computeEffectiveOnboardingStatus(
  server: OnboardingStatus,
  ctx: EffectiveOnboardingStatusContext,
): OnboardingStatus {
  if (server !== "loading") return server;

  const localProof =
    Boolean(ctx.userId) &&
    ctx.profileUserId === ctx.userId &&
    ctx.profileOnboardingCompleted;

  if (!localProof) return server;

  if (ctx.rcValidationStatus === "active") return "complete";
  if (ctx.trialBootstrapStatus === "ready" && ctx.trialIsActive) {
    return "complete";
  }
  if (ctx.onboardingWaitExpired) return "complete";

  return server;
}
