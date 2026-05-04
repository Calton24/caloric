/**
 * sync-ready.store
 *
 * Non-persisted, in-memory signal that tracks whether the initial
 * restoreFromSupabase() has completed for the current authenticated user
 * AND that the local profile store now contains data verified for that user.
 *
 * Used by app/index.tsx to prevent redirecting an authenticated user to
 * the onboarding flow before the server profile (including onboardingCompleted)
 * has had a chance to hydrate into the local profile store.
 *
 * Reset to null whenever the user changes so a new login always waits for
 * a fresh restore cycle before making routing decisions.
 *
 * profileConfirmedFor: ensures the profile store's onboardingCompleted value
 * belongs to the current user. This closes the race where a persisted profile
 * from a previous user (or anonymous default) misleads the routing guard.
 */

import { create } from "zustand";

interface SyncReadyState {
  /** The userId for whom restoreFromSupabase has completed, or null if not yet. */
  syncRestoredFor: string | null;
  /** The userId whose profile data is confirmed loaded in the profile store. */
  profileConfirmedFor: string | null;
  /** Mark restore complete for the given userId. */
  markSyncRestored: (userId: string) => void;
  /** Mark that the profile store now holds verified data for the given user. */
  markProfileConfirmed: (userId: string) => void;
  /** Reset when user changes so the gate re-arms. */
  resetSyncReady: () => void;
}

export const useSyncReadyStore = create<SyncReadyState>()((set) => ({
  syncRestoredFor: null,
  profileConfirmedFor: null,
  markSyncRestored: (userId) => set({ syncRestoredFor: userId }),
  markProfileConfirmed: (userId) => set({ profileConfirmedFor: userId }),
  resetSyncReady: () => set({ syncRestoredFor: null, profileConfirmedFor: null }),
}));
