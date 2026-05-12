/**
 * useOnboardingAuthority
 *
 * Resolves authoritative onboarding status from Supabase whenever the
 * authenticated user changes, and writes the result into the
 * `useOnboardingAuthorityStore`.
 *
 * The routing layer reads from that store — it never queries Supabase
 * directly. This hook is the single funnel by which server truth becomes
 * routing input.
 *
 * Behavior:
 *   - userId becomes null      → reset store to `unknown`
 *   - userId becomes <id>      → set `resolving`, then `resolved`
 *   - status === "missing"     → create profile row, then re-resolve
 *   - status === "error"       → store the error so UI can show a retry CTA
 *   - manual retry()           → re-runs the resolution for the current user
 *   - 8s timeout watchdog      → if a resolve hasn't completed in 8s, set
 *                                status = "error" so the UI can recover.
 *                                Without this watchdog any hung network
 *                                call would leave the routing layer stuck
 *                                in `resolving` indefinitely.
 */

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "../auth/useAuth";
import {
  createMissingProfileRow,
  resolveOnboardingStatus,
  type OnboardingResolveResult,
} from "./onboarding-authority";
import { useOnboardingAuthorityStore } from "./onboarding-authority.store";
import { finalizeOnboardingResolveWithPaywallHandoff } from "./post-auth-onboarding-handoff";

const RESOLVE_TIMEOUT_MS = 8000;

function logResolverStep(step: string, data: Record<string, unknown> = {}): void {
  if (__DEV__) {
    console.log("[OnboardingAuthorityResolver]", { step, ...data });
  }
}

function outcomesDiffer(
  a: OnboardingResolveResult,
  b: OnboardingResolveResult,
): boolean {
  return (
    a.status !== b.status ||
    a.onboardingCompleted !== b.onboardingCompleted ||
    a.onboardingStep !== b.onboardingStep ||
    a.updatedAt !== b.updatedAt ||
    a.error?.message !== b.error?.message
  );
}

async function commitResolvedOutcome(id: string, outcome: OnboardingResolveResult) {
  // Commit the resolver result **immediately** so OnboardingAuthorityGate
  // stops reporting onboarding_loading while post-auth handoff reads
  // SecureStorage / runs optional network work. Previously we only called
  // setResolved after await finalize…, which could strand paid users on the
  // bootstrap spinner even though resolveOnboardingStatus had already
  // returned `complete`.
  useOnboardingAuthorityStore.getState().setResolved(
    id,
    outcome.status,
    outcome.onboardingCompleted,
    outcome.onboardingStep,
    outcome.updatedAt,
    outcome.error?.message,
  );
  if (__DEV__) {
    console.log("[OnboardingAuthorityLifecycle]", {
      event: "commit",
      source: "resolver_immediate",
      userId: id,
      status: outcome.status,
    });
  }

  const finalized = await finalizeOnboardingResolveWithPaywallHandoff(id, outcome);
  if (!outcomesDiffer(outcome, finalized)) return;

  useOnboardingAuthorityStore.getState().setResolved(
    id,
    finalized.status,
    finalized.onboardingCompleted,
    finalized.onboardingStep,
    finalized.updatedAt,
    finalized.error?.message,
  );
  if (__DEV__) {
    console.log("[OnboardingAuthorityLifecycle]", {
      event: "commit",
      source: "post_auth_handoff",
      userId: id,
      previousStatus: outcome.status,
      nextStatus: finalized.status,
    });
  }
}

export function useOnboardingAuthority(): { retry: () => void } {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id;
  const retryRequestId = useOnboardingAuthorityStore(
    (s) => s.retryRequestId
  );
  const lastUserIdRef = useRef<string | null>(null);
  const inFlightForRef = useRef<string | null>(null);
  const retryTickRef = useRef(0);
  const lastRetryRequestIdRef = useRef(retryRequestId);
  const mountLoggedRef = useRef(false);

  if (!mountLoggedRef.current) {
    mountLoggedRef.current = true;
    logResolverStep("mounted", {
      userId: userId ?? null,
      authLoading,
    });
  }

  const resolveFor = useCallback(
    async (id: string, attempt: number) => {
      if (inFlightForRef.current === id && attempt === 0) return;
      inFlightForRef.current = id;
      useOnboardingAuthorityStore.getState().startResolving(id);
      logResolverStep("resolve_started", { userId: id, attempt });

      // Watchdog: if the network call hangs (or any part of the create-
      // missing → re-resolve chain hangs), surface as `error` after the
      // timeout. The gate's error overlay will let the user retry.
      let timedOut = false;
      const timeoutHandle = setTimeout(() => {
        if (lastUserIdRef.current !== id) return;
        if (inFlightForRef.current !== id) return;
        timedOut = true;
        logResolverStep("resolve_timeout", { userId: id, attempt });
        useOnboardingAuthorityStore
          .getState()
          .setResolved(id, "error", null, null, null, "resolve_timeout");
        inFlightForRef.current = null;
      }, RESOLVE_TIMEOUT_MS);

      const finish = () => clearTimeout(timeoutHandle);

      const result = await resolveOnboardingStatus(id);
      if (timedOut) {
        // Timeout already fired and surfaced the error — don't double-write.
        return;
      }

      // Ignore stale results (user changed while in flight).
      if (lastUserIdRef.current !== id) {
        finish();
        return;
      }

      if (result.status === "missing") {
        // First sign-in for this user — no row yet. Create one and
        // re-resolve so the store ends up at "incomplete" (the only
        // legal terminal state for a brand-new account).
        const created = await createMissingProfileRow(id);
        if (timedOut) return;
        if (lastUserIdRef.current !== id) {
          finish();
          return;
        }
        if (created.ok) {
          // Re-resolve once. If THIS round still says "missing" something
          // is fundamentally wrong (RLS, schema), so surface as error
          // rather than ping-ponging forever.
          const second = await resolveOnboardingStatus(id);
          if (timedOut) return;
          if (lastUserIdRef.current !== id) {
            finish();
            return;
          }
          finish();
          if (second.status === "missing") {
            logResolverStep("resolve_error", {
              userId: id,
              reason: "row-still-missing-after-create",
            });
            useOnboardingAuthorityStore
              .getState()
              .setResolved(
                id,
                "error",
                null,
                null,
                null,
                "row-still-missing-after-create"
              );
          } else {
            logResolverStep("resolve_success", {
              userId: id,
              status: second.status,
              onboardingStep: second.onboardingStep,
              path: "create_then_resolve",
            });
            await commitResolvedOutcome(id, second);
          }
        } else {
          finish();
          logResolverStep("resolve_error", {
            userId: id,
            reason: "create_missing_failed",
            message: created.error?.message,
          });
          useOnboardingAuthorityStore
            .getState()
            .setResolved(
              id,
              "error",
              null,
              null,
              null,
              created.error?.message
            );
        }
        inFlightForRef.current = null;
        return;
      }

      finish();
      if (result.status === "error") {
        logResolverStep("resolve_error", {
          userId: id,
          message: result.error?.message,
        });
      } else {
        logResolverStep("resolve_success", {
          userId: id,
          status: result.status,
          onboardingStep: result.onboardingStep,
          path: "direct",
        });
      }
      await commitResolvedOutcome(id, result);
      inFlightForRef.current = null;
    },
    []
  );

  useEffect(() => {
    const previousUserId = lastUserIdRef.current;
    lastUserIdRef.current = userId ?? null;
    if (!userId) {
      if (authLoading) {
        if (__DEV__) {
          console.log("[AuthCleanupDecision]", {
            area: "onboarding_authority",
            authBootstrapReady: false,
            authLoading: true,
            didReset: false,
            reason: "defer_authority_reset_until_auth_resolves",
          });
        }
        return;
      }
      useOnboardingAuthorityStore.getState().reset();
      inFlightForRef.current = null;
      return;
    }
    // If we're switching users, clear any stale resolved entry for the
    // previous user so the routing layer doesn't read it for one render
    // before the new resolution lands.
    if (previousUserId && previousUserId !== userId) {
      useOnboardingAuthorityStore.getState().reset();
      inFlightForRef.current = null;
    }
    // React to retry requests from any surface in the app (e.g. the
    // global gate's error overlay). We bump our local tick to bypass the
    // dedupe guard inside `resolveFor`.
    if (retryRequestId !== lastRetryRequestIdRef.current) {
      lastRetryRequestIdRef.current = retryRequestId;
      retryTickRef.current += 1;
      inFlightForRef.current = null;
    }
    void resolveFor(userId, retryTickRef.current);
  }, [userId, resolveFor, retryRequestId, authLoading]);

  const retry = useCallback(() => {
    if (!userId) return;
    retryTickRef.current += 1;
    inFlightForRef.current = null;
    void resolveFor(userId, retryTickRef.current);
  }, [userId, resolveFor]);

  return { retry };
}
