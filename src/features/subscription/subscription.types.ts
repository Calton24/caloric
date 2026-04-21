export type SubscriptionPlan = "weekly" | "monthly" | "annual" | null;

export interface SubscriptionState {
  hasActiveSubscription: boolean;
  trialStarted: boolean;
  trialEndsAt: string | null;
  plan: SubscriptionPlan;
  paywallSeen: boolean;
  /**
   * ISO timestamp returned by the server (sync-entitlement or webhook) when it
   * last wrote/confirmed this user's entitlement. Never set by the client clock.
   * Device clock tampering can skew freshness classification but cannot forge
   * premium entitlement — the server controls the write path.
   */
  lastServerVerifiedAt: string | null;
}
