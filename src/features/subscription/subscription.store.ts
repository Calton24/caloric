import { create } from "zustand";
import { getStorage } from "../../infrastructure/storage";
import { SubscriptionPlan, SubscriptionState } from "./subscription.types";

const STORAGE_KEY = "caloric:subscription_state";

interface SubscriptionStore {
  subscription: SubscriptionState;
  loaded: boolean;
  /** Hydrate from persistent storage on app launch */
  hydrate: () => Promise<void>;
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
   */
  syncFromEntitlement: (entitlement: {
    isActive: boolean;
    productId?: string;
  }) => void;
}

export const initialSubscription: SubscriptionState = {
  hasActiveSubscription: false,
  trialStarted: false,
  trialEndsAt: null,
  plan: null,
  paywallSeen: false,
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

    startTrial: (plan, trialEndsAt) => {
      set({
        subscription: {
          hasActiveSubscription: true,
          trialStarted: true,
          trialEndsAt,
          plan,
          paywallSeen: true,
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
      set({ subscription: initialSubscription });
      persist();
    },

    syncFromEntitlement: (entitlement) => {
      set((state) => {
        if (!entitlement.isActive) {
          return {
            subscription: {
              ...state.subscription,
              hasActiveSubscription: false,
              plan: null,
            },
          };
        }
        const plan: Exclude<SubscriptionPlan, null> = entitlement.productId
          ?.toLowerCase()
          .includes("annual")
          ? "annual"
          : "monthly";
        return {
          subscription: {
            ...state.subscription,
            hasActiveSubscription: true,
            plan,
          },
        };
      });
      persist();
    },
  };
});
