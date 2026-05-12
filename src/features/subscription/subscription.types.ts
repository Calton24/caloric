export type SubscriptionPlan = "weekly" | "monthly" | "annual" | null;

/**
 * Live validation status from RevenueCat (billing gate / access-decision input).
 *
 * This is NOT persisted to AsyncStorage — it resets to "unknown" on every
 * cold start so that RC is always re-queried before granting app access.
 *
 * State machine:
 *   unknown  — initial; no check has been attempted yet
 *   loading  — RC SDK init + getEntitlements() call is in flight
 *   active   — RC confirmed an active entitlement ("premium")
 *   inactive — RC confirmed no active entitlement (no subscription / expired)
 *   error    — RC check failed (network, SDK init error, etc.)
 *
 * Routing rule (fail closed):
 *   active           → allow /(tabs)
 *   inactive | error → route to paywall
 *   unknown | loading → block with loading overlay (wait for RC)
 */
export type BillingValidationStatus =
  | "unknown"
  | "loading"
  | "active"
  | "inactive"
  | "error";

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
