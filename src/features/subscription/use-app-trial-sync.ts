/**
 * Syncs server trial state after login and on resume from background (deferred expiry).
 * Does not poll while the app stays continuously foregrounded — avoids mid-session hard locks.
 *
 * Failure handling (release-blocker fix)
 * --------------------------------------
 *   - Successful fetch     → setTrial → bootstrapStatus = "ready"
 *   - RPC / network error  → setError → bootstrapStatus = "error"
 *
 * The access-decision state machine treats `error` as "still resolving"
 * when the user has a last-known active access cached, preventing the
 * "transient network blip → instant paywall" flicker that this fix
 * targets. See src/features/access/access-decision.ts.
 */

import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";
import { useAuth } from "../auth/useAuth";
import { fetchAppTrialState } from "./app-trial.service";
import { useAppTrialStore } from "./app-trial.store";
import { trackTrialExpired, trackTrialStarted } from "./subscription-analytics";

export function useAppTrialSync(): void {
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const hadTrialActiveRef = useRef(false);
  const trialStartedLoggedRef = useRef(false);
  const syncedUserIdRef = useRef<string | null>(null);

  const refresh = async (reason: "bootstrap" | "foreground") => {
    if (!userId) return;
    const prev = useAppTrialStore.getState().trial;
    useAppTrialStore.getState().setLoading();

    const result = await fetchAppTrialState();

    if (!result.ok) {
      useAppTrialStore.getState().setError();
      if (__DEV__) {
        console.warn(
          "[AppTrial] refresh failed — keeping last snapshot, gate will hold loading",
          { reason, errorReason: result.reason, message: result.message },
        );
      }
      return;
    }

    const next = result.trial;
    useAppTrialStore.getState().setTrial(next);

    if (next.isActive && next.startedAt && !trialStartedLoggedRef.current) {
      trialStartedLoggedRef.current = true;
      trackTrialStarted({
        reason,
        started_at: next.startedAt,
        expires_at: next.expiresAt,
      });
    }

    if (
      reason === "foreground" &&
      hadTrialActiveRef.current &&
      !next.isActive &&
      prev?.isActive
    ) {
      trackTrialExpired({
        started_at: prev.startedAt,
        expires_at: prev.expiresAt,
      });
    }

    hadTrialActiveRef.current = next.isActive;

    if (next.startedAt) {
      trialStartedLoggedRef.current = true;
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      syncedUserIdRef.current = null;
      trialStartedLoggedRef.current = false;
      hadTrialActiveRef.current = false;
      useAppTrialStore.getState().reset();
      return;
    }

    if (syncedUserIdRef.current !== userId) {
      syncedUserIdRef.current = userId;
      trialStartedLoggedRef.current = false;
      hadTrialActiveRef.current = false;
    }

    void refresh("bootstrap");

    const sub = AppState.addEventListener("change", (next) => {
      const prevState = appStateRef.current;
      appStateRef.current = next;
      if (prevState.match(/inactive|background/) && next === "active") {
        void refresh("foreground");
      }
    });

    return () => sub.remove();
  }, [userId, authLoading]);
}
