/**
 * Release-blocker: RC-truth-wins guard.
 *
 * If RevenueCat's local SDK has already confirmed an active entitlement
 * (rcValidationStatus === "active"), a stale or eventually-consistent
 * backend response saying isPro:false MUST NOT downgrade the user. This
 * protects paying users from briefly losing access during bootstrap when
 * Supabase's sync-entitlement edge function lags RC webhooks.
 */

jest.mock("../src/infrastructure/storage", () => {
  const memory = new Map<string, string>();
  return {
    getStorage: () => ({
      getItem: async (k: string) => memory.get(k) ?? null,
      setItem: async (k: string, v: string) => {
        memory.set(k, v);
      },
      removeItem: async (k: string) => {
        memory.delete(k);
      },
    }),
  };
});

jest.mock("../src/features/subscription/package-utils", () => ({
  getPackageType: () => "MONTHLY",
}));

import { useSubscriptionStore } from "../src/features/subscription/subscription.store";

describe("syncFromServer — RC active wins over stale backend inactive", () => {
  beforeEach(() => {
    useSubscriptionStore.getState().resetSubscription();
    useSubscriptionStore.getState().setRcValidationStatus("unknown");
  });

  it("does NOT downgrade rcValidationStatus from active → inactive when backend says isPro:false", () => {
    // RC SDK has just confirmed active entitlement.
    useSubscriptionStore.getState().syncFromEntitlement({
      isActive: true,
      productId: "premium_yearly",
    });
    expect(useSubscriptionStore.getState().rcValidationStatus).toBe("active");

    // Backend (sync-entitlement) is stale and reports inactive.
    useSubscriptionStore.getState().syncFromServer({
      isPro: false,
      status: "inactive",
      expiresAt: null,
      lastServerVerifiedAt: new Date().toISOString(),
    });

    // RC wins — user keeps active access.
    expect(useSubscriptionStore.getState().rcValidationStatus).toBe("active");
    expect(
      useSubscriptionStore.getState().subscription.hasActiveSubscription,
    ).toBe(true);
  });

  it("still records the server timestamp even when refusing to downgrade", () => {
    useSubscriptionStore.getState().syncFromEntitlement({
      isActive: true,
      productId: "premium_yearly",
    });

    const serverTs = "2026-05-07T13:00:00.000Z";
    useSubscriptionStore.getState().syncFromServer({
      isPro: false,
      status: "inactive",
      expiresAt: null,
      lastServerVerifiedAt: serverTs,
    });

    expect(
      useSubscriptionStore.getState().subscription.lastServerVerifiedAt,
    ).toBe(serverTs);
  });

  it("DOES downgrade when rcValidationStatus is not yet active (e.g. unknown)", () => {
    useSubscriptionStore.getState().setRcValidationStatus("unknown");

    useSubscriptionStore.getState().syncFromServer({
      isPro: false,
      status: "inactive",
      expiresAt: null,
      lastServerVerifiedAt: new Date().toISOString(),
    });

    expect(useSubscriptionStore.getState().rcValidationStatus).toBe("inactive");
  });

  it("still upgrades unknown → active when backend confirms isPro:true", () => {
    useSubscriptionStore.getState().setRcValidationStatus("unknown");

    useSubscriptionStore.getState().syncFromServer({
      isPro: true,
      status: "active",
      expiresAt: "2027-05-07T00:00:00.000Z",
      lastServerVerifiedAt: new Date().toISOString(),
    });

    expect(useSubscriptionStore.getState().rcValidationStatus).toBe("active");
    expect(
      useSubscriptionStore.getState().subscription.hasActiveSubscription,
    ).toBe(true);
  });
});
