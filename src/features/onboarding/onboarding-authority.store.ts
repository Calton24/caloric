/**
 * Onboarding Authority Store — in-memory, non-persisted.
 *
 * Holds the routing-layer's source of truth for onboarding status:
 * the result of the most recent `resolveOnboardingStatus(userId)` call.
 *
 * Why non-persisted:
 *   The whole point of the authority is that local state must never decide
 *   routing. Persisting this store would defeat the purpose — on cold start
 *   the routing layer must wait for a fresh server resolve before it knows
 *   whether to show /(tabs) or onboarding.
 *
 * Lifecycle:
 *   - Reset to `unknown` on user change (sign-in, sign-out, account switch).
 *   - Set to `resolving` while the network call is in flight.
 *   - Set to a concrete `OnboardingAuthorityStatus` when the call returns.
 *   - On `error`, the routing layer shows a retry screen, never onboarding.
 */

import { create } from "zustand";
import type {
  OnboardingAuthorityStatus,
  OnboardingStep,
} from "./onboarding-authority";

export type OnboardingAuthorityState =
  | { kind: "unknown" }
  | { kind: "resolving"; userId: string }
  | {
      kind: "resolved";
      userId: string;
      status: OnboardingAuthorityStatus;
      onboardingCompleted: boolean | null;
      onboardingStep: OnboardingStep | null;
      updatedAt: string | null;
      resolvedAt: string;
      errorMessage?: string;
    };

interface OnboardingAuthorityStore {
  state: OnboardingAuthorityState;
  /**
   * Counter incremented whenever a UI surface requests a re-resolve (the
   * retry button on the error overlay). The resolver hook subscribes to
   * this counter and re-runs on each tick. Held in the store so any UI
   * (gate overlay, fallback retry buttons elsewhere) can request a retry
   * without holding a closure over the hook instance.
   */
  retryRequestId: number;
  /** Mark resolution in flight for a given user. */
  startResolving: (userId: string) => void;
  /** Record a resolved (or errored) status for a given user. */
  setResolved: (
    userId: string,
    status: OnboardingAuthorityStatus,
    onboardingCompleted: boolean | null,
    onboardingStep: OnboardingStep | null,
    updatedAt: string | null,
    errorMessage?: string
  ) => void;
  /**
   * Optimistically update the cached step (no server round-trip). Used
   * by the checkpoint write hook so the gate's resume logic reflects the
   * latest known step even before the server write returns.
   */
  setOptimisticStep: (userId: string, step: OnboardingStep) => void;
  /** Reset to the unknown state — e.g. on sign-out. */
  reset: () => void;
  /** Ask the resolver hook to re-run resolution for the current user. */
  requestRetry: () => void;
}

export const useOnboardingAuthorityStore = create<OnboardingAuthorityStore>()(
  (set, get) => ({
    state: { kind: "unknown" },
    retryRequestId: 0,
    startResolving: (userId) => set({ state: { kind: "resolving", userId } }),
    setResolved: (
      userId,
      status,
      onboardingCompleted,
      onboardingStep,
      updatedAt,
      errorMessage
    ) =>
      set({
        state: {
          kind: "resolved",
          userId,
          status,
          onboardingCompleted,
          onboardingStep,
          updatedAt,
          resolvedAt: new Date().toISOString(),
          errorMessage,
        },
      }),
    setOptimisticStep: (userId, step) => {
      const current = get().state;
      // Only patch if we're already resolved for this user. If we're
      // mid-resolve or unknown, ignore — the next resolve will pick up
      // the server value of record.
      if (current.kind !== "resolved" || current.userId !== userId) return;
      set({
        state: {
          ...current,
          onboardingStep: step,
        },
      });
    },
    reset: () => set({ state: { kind: "unknown" } }),
    requestRetry: () => set({ retryRequestId: get().retryRequestId + 1 }),
  })
);
