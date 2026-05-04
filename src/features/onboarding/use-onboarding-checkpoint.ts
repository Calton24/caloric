/**
 * useOnboardingCheckpoint
 *
 * Watches the current pathname and, whenever the user is on an
 * onboarding step screen, writes that step name to
 * `user_profiles.onboarding_step` so a force-quit + reopen resumes them
 * at the same step instead of restarting at /goal.
 *
 * Mounted ONCE inside the `(onboarding)/_layout.tsx` so:
 *   - It only runs while the user is actually inside onboarding
 *     (avoiding a write storm on every tab change).
 *   - It can read the pathname via `usePathname()` and react to step
 *     changes inside the same nested layout that owns the steps.
 *
 * Behaviour notes:
 *   - Writes are best-effort. A failed write does NOT block navigation
 *     and does NOT surface to the UI. The user can keep going; the next
 *     successful write supersedes any prior miss. If every write fails,
 *     resume falls back to /goal — which is functionally identical to
 *     today's behaviour.
 *   - A ref-based dedupe prevents writing the same step twice in a row
 *     across re-renders.
 *   - Writes are skipped if there's no authenticated user, no resolved
 *     authority entry for that user, or if the user's status is not
 *     "incomplete" (a "complete" user shouldn't be in the flow at all,
 *     but defensively we don't want to overwrite their cleared
 *     checkpoint).
 */

import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { useAuth } from "../auth/useAuth";
import { setOnboardingStepRemote } from "./onboarding-authority";
import { useOnboardingAuthorityStore } from "./onboarding-authority.store";
import { pathnameToCheckpointStep } from "./onboarding-step-routes";

export function useOnboardingCheckpoint(): void {
  const pathname = usePathname();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const lastWrittenStepRef = useRef<string | null>(null);
  const lastWrittenForUserRef = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      lastWrittenStepRef.current = null;
      lastWrittenForUserRef.current = null;
      return;
    }

    // If the user changed (e.g. account switch mid-onboarding), reset
    // dedupe so the new user gets a fresh write on their first matching
    // pathname.
    if (lastWrittenForUserRef.current !== userId) {
      lastWrittenStepRef.current = null;
      lastWrittenForUserRef.current = userId;
    }

    const step = pathnameToCheckpointStep(pathname);
    if (!step) return;
    if (lastWrittenStepRef.current === step) return;

    // Only write if we're already in a known-incomplete state. If the
    // resolver hasn't landed yet, skip — the resolver will fire its own
    // pull and the user will move forward to their next step soon.
    const authority = useOnboardingAuthorityStore.getState().state;
    if (
      authority.kind !== "resolved" ||
      authority.userId !== userId ||
      authority.status !== "incomplete"
    ) {
      return;
    }

    lastWrittenStepRef.current = step;

    // Optimistic update so the gate's resume logic sees the latest step
    // immediately (e.g. on a hot reload before the server write returns).
    useOnboardingAuthorityStore.getState().setOptimisticStep(userId, step);

    // Fire-and-forget. We do not await; the user's flow doesn't pause on
    // this write. Errors are logged inside the helper but never surfaced.
    void setOnboardingStepRemote(userId, step);
  }, [pathname, userId]);
}
