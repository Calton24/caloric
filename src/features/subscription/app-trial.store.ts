/**
 * In-memory app trial snapshot (authoritative data from get_app_trial_state RPC).
 * Store is driven by use-app-trial-sync / app-trial.service.
 */

import { create } from "zustand";
import type { TrialStatus } from "./app-trial.service";

export type AppTrialBootstrapStatus =
  | "idle"
  | "loading"
  | "ready"
  | "error";

interface AppTrialStore {
  bootstrapStatus: AppTrialBootstrapStatus;
  trial: TrialStatus | null;
  lastFetchedAt: number | null;
  setLoading: () => void;
  setTrial: (trial: TrialStatus) => void;
  setError: () => void;
  reset: () => void;
}

export const useAppTrialStore = create<AppTrialStore>((set) => ({
  bootstrapStatus: "idle",
  trial: null,
  lastFetchedAt: null,
  setLoading: () => set({ bootstrapStatus: "loading" }),
  setTrial: (trial) =>
    set({
      trial,
      bootstrapStatus: "ready",
      lastFetchedAt: Date.now(),
    }),
  setError: () =>
    set({
      bootstrapStatus: "error",
      trial: null,
    }),
  reset: () =>
    set({
      bootstrapStatus: "idle",
      trial: null,
      lastFetchedAt: null,
    }),
}));

/** Trial unlocks premium-style features during the server-validated window. */
export function selectTrialGrantsFullAccess(state: AppTrialStore): boolean {
  return state.bootstrapStatus === "ready" && (state.trial?.isActive ?? false);
}
