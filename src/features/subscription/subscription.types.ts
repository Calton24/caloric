export type SubscriptionPlan = "weekly" | "monthly" | "annual" | null;

export interface SubscriptionState {
  hasActiveSubscription: boolean;
  trialStarted: boolean;
  trialEndsAt: string | null;
  plan: SubscriptionPlan;
  paywallSeen: boolean;
}
