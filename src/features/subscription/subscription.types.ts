export type SubscriptionPlan = "monthly" | "annual" | null;

export interface SubscriptionState {
  hasActiveSubscription: boolean;
  trialStarted: boolean;
  trialEndsAt: string | null;
  plan: SubscriptionPlan;
  paywallSeen: boolean;
}
