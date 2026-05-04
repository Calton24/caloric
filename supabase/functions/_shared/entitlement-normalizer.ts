/// <reference lib="deno.ns" />
/**
 * Shared entitlement normalizer
 *
 * SINGLE source of truth for:
 *   "what does this RC data mean for subscription_state?"
 *
 * Used by BOTH:
 *   - revenuecat-webhook  (push path — RC fires on purchase/renewal/expiry)
 *   - sync-entitlement    (pull path — we query RC API on login / restore / recheck)
 *
 * Both paths must produce the same row shape from the same rules.
 * Any change to premium logic lives here only.
 *
 * Grace period = paying user in billing recovery = IS still active.
 * Revoked / expired = no longer active.
 */

export interface NormalizedEntitlement {
  status:
    | "free"
    | "active"
    | "trialing"
    | "grace_period"
    | "cancelled"
    | "expired";
  is_active: boolean;
  entitlement_id: string | null;
  product_id: string | null;
  store: string | null;
  expires_at: string | null;
  will_renew: boolean;
}

/**
 * Active statuses — grace_period is still active because the user is a
 * paying customer in billing recovery, not a lapsed user.
 */
export function isActiveStatus(
  status: NormalizedEntitlement["status"]
): boolean {
  return (
    status === "active" || status === "trialing" || status === "grace_period"
  );
}

/**
 * Normalize a RevenueCat webhook event into a subscription_state row shape.
 * Called by revenuecat-webhook/index.ts.
 */
export function normalizeFromWebhookEvent(event: {
  type: string;
  entitlement_ids?: string[];
  product_id?: string;
  store?: string;
  expiration_at_ms?: number;
  grace_period_expiration_at_ms?: number;
  will_renew?: boolean;
  transferred_from?: string[];
}): NormalizedEntitlement {
  const hasPremium = event.entitlement_ids?.includes("premium") ?? false;

  let status: NormalizedEntitlement["status"];

  switch (event.type) {
    case "INITIAL_PURCHASE":
    case "RENEWAL":
    case "UNCANCELLATION":
    case "PRODUCT_CHANGE":
    case "TRANSFER":
      status = hasPremium ? "active" : "free";
      break;
    case "CANCELLATION":
      // Cancelled but access may remain until period end — keep is_active
      // via expiration logic; mark as cancelled for display
      status = "cancelled";
      break;
    case "EXPIRATION":
    case "SUBSCRIPTION_PAUSED":
      status = "expired";
      break;
    case "BILLING_ISSUE":
      // Grace period: user is still a paying customer, just in billing recovery
      status = "grace_period";
      break;
    default:
      status = "free";
      break;
  }

  const expiresMs =
    event.grace_period_expiration_at_ms ?? event.expiration_at_ms;

  return {
    status,
    is_active: isActiveStatus(status),
    entitlement_id: hasPremium ? "premium" : null,
    product_id: event.product_id ?? null,
    store: event.store ?? null,
    expires_at: expiresMs ? new Date(expiresMs).toISOString() : null,
    will_renew: event.will_renew ?? true,
  };
}

/**
 * Normalize a RevenueCat REST API subscriber response into a
 * subscription_state row shape.
 * Called by sync-entitlement/index.ts.
 *
 * RC subscriber.entitlements.premium contains all we need:
 *   expires_date          — when access ends
 *   grace_period_expires_date — if in grace period
 *   product_identifier    — the product that granted access
 *   store                 — APP_STORE / PLAY_STORE / etc.
 *   will_renew            — bool
 */
export function normalizeFromSubscriberResponse(
  subscriber: Record<string, unknown>
): NormalizedEntitlement {
  const now = new Date();
  const premiumEntitlement = (
    subscriber?.entitlements as Record<string, unknown> | undefined
  )?.premium as Record<string, unknown> | undefined;

  if (!premiumEntitlement) {
    return {
      status: "free",
      is_active: false,
      entitlement_id: null,
      product_id: null,
      store: null,
      expires_at: null,
      will_renew: false,
    };
  }

  const expiresDateStr = premiumEntitlement.expires_date as string | null;
  const graceDateStr = premiumEntitlement.grace_period_expires_date as
    | string
    | null;
  const productId = premiumEntitlement.product_identifier as string | null;
  const store = premiumEntitlement.store as string | null;
  const willRenew =
    (premiumEntitlement.will_renew as boolean | undefined) ?? true;

  // In grace period?
  if (graceDateStr) {
    const graceExpires = new Date(graceDateStr);
    if (graceExpires > now) {
      return {
        status: "grace_period",
        is_active: true,
        entitlement_id: "premium",
        product_id: productId,
        store,
        expires_at: graceDateStr,
        will_renew: willRenew,
      };
    }
  }

  // Active?
  if (expiresDateStr) {
    const expires = new Date(expiresDateStr);
    if (expires > now) {
      return {
        status: "active",
        is_active: true,
        entitlement_id: "premium",
        product_id: productId,
        store,
        expires_at: expiresDateStr,
        will_renew: willRenew,
      };
    }
    // Has an entitlement but it's expired
    return {
      status: "expired",
      is_active: false,
      entitlement_id: "premium",
      product_id: productId,
      store,
      expires_at: expiresDateStr,
      will_renew: false,
    };
  }

  // Entitlement exists but no expiry date = lifetime / no-expiry grant
  return {
    status: "active",
    is_active: true,
    entitlement_id: "premium",
    product_id: productId,
    store,
    expires_at: null,
    will_renew: willRenew,
  };
}
