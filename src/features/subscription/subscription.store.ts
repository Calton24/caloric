import { create } from "zustand";
import { SubscriptionPlan, SubscriptionState } from "./subscription.types";

interface SubscriptionStore {
  subscription: SubscriptionState;
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

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  subscription: initialSubscription,

  startTrial: (plan, trialEndsAt) =>
    set({
      subscription: {
        hasActiveSubscription: true,
        trialStarted: true,
        trialEndsAt,
        plan,
        paywallSeen: true,
      },
    }),

  activateSubscription: (plan) =>
    set((state) => ({
      subscription: {
        ...state.subscription,
        hasActiveSubscription: true,
        plan,
      },
    })),

  markPaywallSeen: () =>
    set((state) => ({
      subscription: {
        ...state.subscription,
        paywallSeen: true,
      },
    })),

  resetSubscription: () => set({ subscription: initialSubscription }),

  syncFromEntitlement: (entitlement) =>
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
    }),
}));
