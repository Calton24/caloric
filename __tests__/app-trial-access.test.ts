/**
 * App trial access helpers — server-backed trial mirrors subscription UX gates.
 */

import { selectTrialGrantsFullAccess } from "../src/features/subscription/app-trial.store";

describe("selectTrialGrantsFullAccess", () => {
  it("is false while bootstrap has not finished", () => {
    expect(
      selectTrialGrantsFullAccess({
        bootstrapStatus: "idle",
        trial: null,
        lastFetchedAt: null,
        setLoading: () => {},
        setTrial: () => {},
        setError: () => {},
        reset: () => {},
      })
    ).toBe(false);
    expect(
      selectTrialGrantsFullAccess({
        bootstrapStatus: "loading",
        trial: {
          startedAt: "2026-01-01T00:00:00.000Z",
          expiresAt: "2026-01-04T00:00:00.000Z",
          isActive: true,
          isExpired: false,
          source: "server",
        },
        lastFetchedAt: null,
        setLoading: () => {},
        setTrial: () => {},
        setError: () => {},
        reset: () => {},
      })
    ).toBe(false);
  });

  it("is true only when ready and trial.isActive", () => {
    expect(
      selectTrialGrantsFullAccess({
        bootstrapStatus: "ready",
        trial: {
          startedAt: "2026-01-01T00:00:00.000Z",
          expiresAt: "2026-01-04T00:00:00.000Z",
          isActive: true,
          isExpired: false,
          source: "server",
        },
        lastFetchedAt: 1,
        setLoading: () => {},
        setTrial: () => {},
        setError: () => {},
        reset: () => {},
      })
    ).toBe(true);
    expect(
      selectTrialGrantsFullAccess({
        bootstrapStatus: "ready",
        trial: {
          startedAt: "2026-01-01T00:00:00.000Z",
          expiresAt: "2026-01-04T00:00:00.000Z",
          isActive: false,
          isExpired: true,
          source: "server",
        },
        lastFetchedAt: 1,
        setLoading: () => {},
        setTrial: () => {},
        setError: () => {},
        reset: () => {},
      })
    ).toBe(false);
  });
});
