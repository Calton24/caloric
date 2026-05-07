/**
 * Persisted "last-known access" cache. Used as a flicker shield by the
 * access decision state machine — see access-decision.ts invariant #3.
 *
 * NEVER consulted to grant access. Only consulted to widen the loading
 * window during a transient failure (trial fetch error, RC error). Once
 * RC and trial sync resolve definitively, the cache is rewritten to match.
 */

import { create } from "zustand";
import { getStorage } from "../../infrastructure/storage";
import type {
  LastKnownAccess,
  LastKnownAccessKind,
} from "./access-decision";

const STORAGE_KEY = "caloric:last_known_access:v1";

const INITIAL: LastKnownAccess = {
  kind: "unknown",
  checkedAt: null,
};

interface LastKnownAccessStore {
  cache: LastKnownAccess;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  /**
   * Persist a definitive resolution. No-ops if `kind` is null (transient
   * inputs — see deriveLastKnownAccessKind).
   */
  record: (kind: LastKnownAccessKind | null) => void;
  reset: () => void;
}

export const useLastKnownAccessStore = create<LastKnownAccessStore>(
  (set, get) => ({
    cache: INITIAL,
    hydrated: false,

    hydrate: async () => {
      try {
        const raw = await getStorage().getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as LastKnownAccess;
          set({
            cache: {
              kind: parsed.kind ?? "unknown",
              checkedAt: parsed.checkedAt ?? null,
            },
            hydrated: true,
          });
          return;
        }
      } catch {
        // ignore parse / storage errors — fall back to initial.
      }
      set({ hydrated: true });
    },

    record: (kind) => {
      if (kind === null) return;
      const current = get().cache;
      const next: LastKnownAccess = {
        kind,
        checkedAt: new Date().toISOString(),
      };
      // Avoid redundant writes.
      if (current.kind === kind && current.checkedAt) {
        return;
      }
      set({ cache: next });
      try {
        getStorage()
          .setItem(STORAGE_KEY, JSON.stringify(next))
          .catch(() => {});
      } catch {
        // non-critical
      }
    },

    reset: () => {
      set({ cache: INITIAL });
      try {
        getStorage()
          .setItem(STORAGE_KEY, JSON.stringify(INITIAL))
          .catch(() => {});
      } catch {
        // non-critical
      }
    },
  }),
);
