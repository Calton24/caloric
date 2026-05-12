import { create } from "zustand";
import { getStorage } from "../../infrastructure/storage";
import { getPackageType } from "./package-utils";
import {
  type BillingValidationStatus,
  SubscriptionPlan,
  SubscriptionState,
} from "./subscription.types";

const STORAGE_KEY = "caloric:subscription_state";

interface SubscriptionStore {
  subscription: SubscriptionState;
  loaded: boolean;
  /**
   * Live RevenueCat validation mirror — not persisted. Server sync must not
   * downgrade when this reads "active" (see syncFromServer RC-wins guard).
   */
  rcValidationStatus: BillingValidationStatus;
  /** Hydrate from persistent storage on app launch */
  hydrate: () => Promise<void>;
  /**
   * Set the RC validation status directly.
   * Called by BillingGate to signal "loading" (before RC init) and
   * "error" (when init or getEntitlements fails). "active" / "inactive"
   * are set automatically by syncFromEntitlement and syncFromServer.
   */
  setRcValidationStatus: (status: BillingValidationStatus) => void;
  startTrial: (
    plan: Exclude<SubscriptionPlan, null>,
    trialEndsAt: string
  ) => void;
  activateSubscription: (plan: Exclude<SubscriptionPlan, null>) => void;
  markPaywallSeen: () => void;
  resetSubscription: () => void;
  /**
   * Sync the store from a live RevenueCat (or other billing provider) entitlement.
   * Called automatically by BillingGate on init and whenever RC fires an update.
   * Sets rcValidationStatus to "active" or "inactive".
   */
  syncFromEntitlement: (entitlement: {
    isActive: boolean;
    productId?: string;
  }) => void;
  /**
   * Sync the store from a server-side entitlement check (sync-entitlement function).
   * Server truth ALWAYS overwrites the local AsyncStorage cache.
   * Called after login, restore, and on the denial recheck path.
   * Sets rcValidationStatus to "active" or "inactive".
   *
   * lastServerVerifiedAt MUST come from the server response — never mint it
   * client-side. This timestamp drives the fresh/stale/expired trust model.
   */
  syncFromServer: (data: {
    isPro: boolean;
    status: string;
    expiresAt: string | null;
    lastServerVerifiedAt: string;
  }) => void;
}

export const initialSubscription: SubscriptionState = {
  hasActiveSubscription: false,
  trialStarted: false,
  trialEndsAt: null,
  plan: null,
  paywallSeen: false,
  lastServerVerifiedAt: null,
};

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => {
  /** Persist current subscription to storage (fire-and-forget) */
  const persist = () => {
    try {
      const { subscription } = get();
      getStorage()
        .setItem(STORAGE_KEY, JSON.stringify(subscription))
        .catch(() => {});
    } catch {
      // non-critical
    }
  };

  return {
    subscription: initialSubscription,
    loaded: false,
    rcValidationStatus: "unknown",

    hydrate: async () => {
      try {
        const raw = await getStorage().getItem(STORAGE_KEY);
        if (raw) {
          const parsed: SubscriptionState = JSON.parse(raw);
          set({
            subscription: { ...initialSubscription, ...parsed },
            loaded: true,
          });
        } else {
          set({ loaded: true });
        }
      } catch {
        set({ loaded: true });
      }
    },

    setRcValidationStatus: (status) => {
      set({ rcValidationStatus: status });
    },

    startTrial: (plan, trialEndsAt) => {
      set({
        subscription: {
          hasActiveSubscription: true,
          trialStarted: true,
          trialEndsAt,
          plan,
          paywallSeen: true,
          lastServerVerifiedAt: null,
        },
      });
      persist();
    },

    activateSubscription: (plan) => {
      set((state) => ({
        subscription: {
          ...state.subscription,
          hasActiveSubscription: true,
          plan,
        },
      }));
      persist();
    },

    markPaywallSeen: () => {
      set((state) => ({
        subscription: {
          ...state.subscription,
          paywallSeen: true,
        },
      }));
      persist();
    },

    resetSubscription: () => {
      set({ subscription: initialSubscription, rcValidationStatus: "unknown" });
      persist();
    },

    syncFromEntitlement: (entitlement) => {
      set((state) => {
        if (!entitlement.isActive) {
          return {
            rcValidationStatus: "inactive" as const,
            subscription: {
              ...state.subscription,
              hasActiveSubscription: false,
              plan: null,
            },
          };
        }
        const detected = getPackageType(entitlement.productId);
        const plan: Exclude<SubscriptionPlan, null> =
          detected === "weekly"
            ? "weekly"
            : detected === "annual"
              ? "annual"
              : "monthly";
        return {
          rcValidationStatus: "active" as const,
          subscription: {
            ...state.subscription,
            hasActiveSubscription: true,
            plan,
          },
        };
      });
      persist();
    },

    syncFromServer: ({
      isPro,
      status: _status,
      lastServerVerifiedAt: serverTs,
    }) => {
      // RC-truth-wins: if the local SDK already says "active", a stale
      // sync-entitlement `isPro: false` must not revoke access.
      set((state) => {
        if (!isPro) {
          if (state.rcValidationStatus === "active") {
            if (__DEV__) {
              console.warn(
                "[Billing] sync-entitlement says inactive but RC SDK says active — keeping access (RC wins).",
                {
                  serverTs,
                  cachedHasSubscription:
                    state.subscription.hasActiveSubscription,
                }
              );
            }
            return {
              subscription: {
                ...state.subscription,
                lastServerVerifiedAt: serverTs,
              },
            };
          }
          return {
            rcValidationStatus: "inactive" as const,
            subscription: {
              ...state.subscription,
              hasActiveSubscription: false,
              plan: null,
              lastServerVerifiedAt: serverTs,
            },
          };
        }
        return {
          rcValidationStatus: "active" as const,
          subscription: {
            ...state.subscription,
            hasActiveSubscription: true,
            lastServerVerifiedAt: serverTs,
          },
        };
      });
      persist();
    },
  };
});
