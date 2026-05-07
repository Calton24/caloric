/**
 * Access-decision state machine — the "no random paywall" contract.
 *
 * This is the single source of truth for routing decisions across the app.
 * If any of these tests start failing, a release-blocker access-leak or
 * paywall-flicker has been introduced.
 */

import {
  deriveLastKnownAccessKind,
  getAccessDecision,
  type AccessDecisionInput,
  type LastKnownAccess,
  type RouteFlags,
} from "../src/features/access/access-decision";
import { APP_ENTRY_PATH } from "../src/features/navigation/app-entry-href";
import { buildRouteContext } from "../src/features/navigation/route-segments";

const TABS_ROUTE = "/(tabs)";
const NEUTRAL_ROUTE_CONTEXT = buildRouteContext(TABS_ROUTE, ["(tabs)", "index"]);
const ROOT_STUB_ROUTE_CONTEXT = buildRouteContext("/", []);
/** Pathname still `/` while tabs are active (Expo Router quirk). */
const TABS_WITH_ROOT_PATHNAME_CONTEXT = buildRouteContext("/", ["(tabs)", "index"]);
const NOT_FOUND_ROUTE_CONTEXT = buildRouteContext("/", ["+not-found"]);

const NO_LAST_KNOWN: LastKnownAccess = { kind: "unknown", checkedAt: null };
const LAST_KNOWN_TRIAL_ACTIVE: LastKnownAccess = {
  kind: "trial_active",
  checkedAt: "2026-01-01T00:00:00.000Z",
};
const LAST_KNOWN_SUB_ACTIVE: LastKnownAccess = {
  kind: "subscription_active",
  checkedAt: "2026-01-01T00:00:00.000Z",
};
const LAST_KNOWN_NONE: LastKnownAccess = {
  kind: "none",
  checkedAt: "2026-01-01T00:00:00.000Z",
};

const NEUTRAL_ROUTE_FLAGS: RouteFlags = {
  isAuth: false,
  isInsideOnboardingFlow: false,
  isPermissions: false,
  isIndex: false,
  isPaywall: false,
  isVoluntaryUpgradePaywall: false,
  isGatedAllowed: false,
};

const PAYWALL_ROUTE_FLAGS: RouteFlags = {
  ...NEUTRAL_ROUTE_FLAGS,
  isPaywall: true,
  isGatedAllowed: true,
};

const MANAGE_ACCOUNT_ROUTE_FLAGS: RouteFlags = {
  ...NEUTRAL_ROUTE_FLAGS,
  isGatedAllowed: true,
};

const ONBOARDING_ROUTE_FLAGS: RouteFlags = {
  ...NEUTRAL_ROUTE_FLAGS,
  isInsideOnboardingFlow: true,
};

const INDEX_ROUTE_FLAGS: RouteFlags = {
  ...NEUTRAL_ROUTE_FLAGS,
  isIndex: true,
};

const AUTH_ROUTE_FLAGS: RouteFlags = {
  ...NEUTRAL_ROUTE_FLAGS,
  isAuth: true,
};

function input(
  overrides: Partial<AccessDecisionInput> = {},
): AccessDecisionInput {
  return {
    authStatus: "signedIn",
    onboardingStatus: "complete",
    resumeTarget: "/(onboarding)/goal",
    rcValidationStatus: "active",
    trialBootstrapStatus: "ready",
    trialIsActive: false,
    trialIsExpired: false,
    lastKnownAccess: NO_LAST_KNOWN,
    revalidationGraceExpired: false,
    currentPathname: TABS_ROUTE,
    routeContext: NEUTRAL_ROUTE_CONTEXT,
    routeFlags: NEUTRAL_ROUTE_FLAGS,
    ...overrides,
  };
}

// ── 1. Loading states (must NEVER gate) ────────────────────────────────────

describe("getAccessDecision — never gates while loading", () => {
  it("auth loading → loading", () => {
    const d = getAccessDecision(input({ authStatus: "loading" }));
    expect(d.type).toBe("loading");
    expect(d.reason).toBe("auth_loading");
  });

  it("onboarding loading → loading", () => {
    const d = getAccessDecision(input({ onboardingStatus: "loading" }));
    expect(d.type).toBe("loading");
    expect(d.reason).toBe("onboarding_loading");
  });

  it("RC unknown → loading (never gate)", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "unknown",
        trialBootstrapStatus: "ready",
        trialIsExpired: true,
      }),
    );
    expect(d.type).toBe("loading");
    expect(d.reason).toBe("rc_unknown");
  });

  it("RC loading → loading (never gate)", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "loading",
        trialBootstrapStatus: "ready",
        trialIsExpired: true,
      }),
    );
    expect(d.type).toBe("loading");
    expect(d.reason).toBe("rc_loading");
  });

  it("RC inactive + trial idle → loading (never gate before trial bootstrap)", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "idle",
      }),
    );
    expect(d.type).toBe("loading");
    expect(d.reason).toBe("trial_idle");
  });

  it("RC inactive + trial loading → loading (never gate before trial bootstrap)", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "loading",
      }),
    );
    expect(d.type).toBe("loading");
    expect(d.reason).toBe("trial_loading");
  });
});

// ── 2. Allow paths ─────────────────────────────────────────────────────────

describe("getAccessDecision — allows access", () => {
  it("RC active on app route → allow (subscription_active)", () => {
    const d = getAccessDecision(input({ rcValidationStatus: "active" }));
    expect(d.type).toBe("allow");
    expect(d.reason).toBe("subscription_active");
  });

  it("RC inactive + trial active → allow (trial_active)", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "ready",
        trialIsActive: true,
      }),
    );
    expect(d.type).toBe("allow");
    expect(d.reason).toBe("trial_active");
  });

  it("expired user on paywall route → allow (no redirect loop)", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "ready",
        trialIsExpired: true,
        currentPathname: "/(onboarding)/paywall",
        routeFlags: PAYWALL_ROUTE_FLAGS,
      }),
    );
    expect(d.type).toBe("allow");
    expect(d.reason).toBe("on_paywall");
  });

  it("expired user on manage-account → allow (gated allowlist)", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "ready",
        trialIsExpired: true,
        currentPathname: "/(modals)/manage-account",
        routeFlags: MANAGE_ACCOUNT_ROUTE_FLAGS,
      }),
    );
    expect(d.type).toBe("allow");
    expect(d.reason).toBe("allowed_account_route");
  });

  it("RC unknown + voluntary upgrade paywall → allow (let user browse)", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "unknown",
        currentPathname: "/(onboarding)/paywall",
        routeFlags: {
          ...PAYWALL_ROUTE_FLAGS,
          isVoluntaryUpgradePaywall: true,
        },
      }),
    );
    expect(d.type).toBe("allow");
    expect(d.reason).toBe("voluntary_upgrade_paywall");
  });
});

// ── 3. Redirects ───────────────────────────────────────────────────────────

describe("getAccessDecision — redirects", () => {
  it("signed out at root → redirect_landing", () => {
    const d = getAccessDecision(
      input({
        authStatus: "signedOut",
        routeFlags: INDEX_ROUTE_FLAGS,
        currentPathname: "/",
        routeContext: ROOT_STUB_ROUTE_CONTEXT,
      }),
    );
    expect(d.type).toBe("redirect_landing");
    expect(d.reason).toBe("unauth_at_index");
  });

  it("signed out on auth route → allow (no kick)", () => {
    const d = getAccessDecision(
      input({
        authStatus: "signedOut",
        routeFlags: AUTH_ROUTE_FLAGS,
        currentPathname: "/auth/signin",
      }),
    );
    expect(d.type).toBe("allow");
    expect(d.reason).toBe("unauth_on_allowed_route");
  });

  it("incomplete onboarding at index → redirect to resume target", () => {
    const d = getAccessDecision(
      input({
        onboardingStatus: "incomplete",
        resumeTarget: "/(onboarding)/body",
        routeFlags: INDEX_ROUTE_FLAGS,
        currentPathname: "/",
        routeContext: ROOT_STUB_ROUTE_CONTEXT,
      }),
    );
    expect(d.type).toBe("redirect_onboarding");
    expect(d.target).toBe("/(onboarding)/body");
    expect(d.reason).toBe("incomplete_at_index");
  });

  it("incomplete onboarding inside flow → allow", () => {
    const d = getAccessDecision(
      input({
        onboardingStatus: "incomplete",
        routeFlags: ONBOARDING_ROUTE_FLAGS,
      }),
    );
    expect(d.type).toBe("allow");
    expect(d.reason).toBe("incomplete_on_onboarding_route");
  });

  it("complete + RC active at onboarding → redirect_tabs to concrete entry", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "active",
        routeFlags: ONBOARDING_ROUTE_FLAGS,
        currentPathname: "/(onboarding)/paywall",
        routeContext: buildRouteContext("/(onboarding)/paywall", [
          "(onboarding)",
          "paywall",
        ]),
      }),
    );
    expect(d.type).toBe("redirect_tabs");
    expect(d.reason).toBe("complete_on_onboarding");
    expect(d.target).toBe(APP_ENTRY_PATH);
  });

  it("complete + active trial at stub index → redirect_tabs to concrete entry", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "ready",
        trialIsActive: true,
        routeFlags: INDEX_ROUTE_FLAGS,
        currentPathname: "/",
        routeContext: ROOT_STUB_ROUTE_CONTEXT,
      }),
    );
    expect(d.type).toBe("redirect_tabs");
    expect(d.reason).toBe("complete_active_trial_exit_paywall_or_onboarding");
    expect(d.target).toBe(APP_ENTRY_PATH);
  });
});

// ── 4. Definitive denial → gate ────────────────────────────────────────────

describe("getAccessDecision — gates only on definitive denial", () => {
  it("RC inactive + trial ready + expired + on app route → redirect_gate", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "ready",
        trialIsActive: false,
        trialIsExpired: true,
      }),
    );
    expect(d.type).toBe("redirect_gate");
    expect(d.reason).toBe("subscription_inactive_trial_expired");
    expect(d.target).toBe("/(onboarding)/paywall?mode=gate");
  });

  it("RC error + trial ready + not active + no last-known active → redirect_gate", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "error",
        trialBootstrapStatus: "ready",
        trialIsActive: false,
        trialIsExpired: true,
        lastKnownAccess: NO_LAST_KNOWN,
      }),
    );
    expect(d.type).toBe("redirect_gate");
  });
});

// ── 5. Flicker shield (release-blocker bug fix) ────────────────────────────

describe("getAccessDecision — flicker shield (last-known active)", () => {
  it("trial bootstrap error + last-known trial_active → loading (revalidating)", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "error",
        trialIsActive: false,
        lastKnownAccess: LAST_KNOWN_TRIAL_ACTIVE,
      }),
    );
    expect(d.type).toBe("loading");
    expect(d.reason).toBe("trial_error_revalidating_with_active_cache");
  });

  it("trial bootstrap error + last-known subscription_active → loading", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "error",
        trialIsActive: false,
        lastKnownAccess: LAST_KNOWN_SUB_ACTIVE,
      }),
    );
    expect(d.type).toBe("loading");
    expect(d.reason).toBe("trial_error_revalidating_with_active_cache");
  });

  it("trial bootstrap error + last-known none → fail closed to gate", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "error",
        trialIsActive: false,
        lastKnownAccess: LAST_KNOWN_NONE,
      }),
    );
    expect(d.type).toBe("redirect_gate");
  });

  it("RC error + trial ready not-active not-expired + last-known sub active → loading", () => {
    // Pathological scenario: RC returned error but trial server says
    // "not active and not expired" (e.g. user never started trial, but
    // the cache says they were paying). Last-known shield should hold.
    const d = getAccessDecision(
      input({
        rcValidationStatus: "error",
        trialBootstrapStatus: "ready",
        trialIsActive: false,
        trialIsExpired: false,
        lastKnownAccess: LAST_KNOWN_SUB_ACTIVE,
      }),
    );
    expect(d.type).toBe("loading");
    expect(d.reason).toBe("rc_error_revalidating_with_active_cache");
  });

  it("RC error + trial ready expired → gate even with last-known active (definitive denial)", () => {
    // Trial definitively expired wins over last-known cache. The cache is
    // a flicker shield, NOT an unlock mechanism.
    const d = getAccessDecision(
      input({
        rcValidationStatus: "error",
        trialBootstrapStatus: "ready",
        trialIsActive: false,
        trialIsExpired: true,
        lastKnownAccess: LAST_KNOWN_TRIAL_ACTIVE,
      }),
    );
    expect(d.type).toBe("redirect_gate");
  });
});

// ── 5b. Grace-expired override (no infinite spinner) ──────────────────────

describe("getAccessDecision — revalidation grace expired", () => {
  it("trial bootstrap error + last-known active + grace expired → gate (no infinite spinner)", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "error",
        lastKnownAccess: LAST_KNOWN_TRIAL_ACTIVE,
        revalidationGraceExpired: true,
      }),
    );
    expect(d.type).toBe("redirect_gate");
    expect(d.reason).toBe("subscription_inactive_trial_expired");
  });

  it("trial bootstrap error + last-known subscription_active + grace expired → gate", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "error",
        lastKnownAccess: LAST_KNOWN_SUB_ACTIVE,
        revalidationGraceExpired: true,
      }),
    );
    expect(d.type).toBe("redirect_gate");
  });

  it("RC error + grace expired → fall through (no rc_error_revalidating loading)", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "error",
        trialBootstrapStatus: "ready",
        trialIsActive: false,
        trialIsExpired: false,
        lastKnownAccess: LAST_KNOWN_SUB_ACTIVE,
        revalidationGraceExpired: true,
      }),
    );
    // Falls through to gate (no active subscription, no active trial)
    expect(d.type).toBe("redirect_gate");
  });

  it("RC active still wins even with grace expired", () => {
    // Grace flag must never override a genuine active subscription.
    const d = getAccessDecision(
      input({
        rcValidationStatus: "active",
        revalidationGraceExpired: true,
      }),
    );
    expect(d.type).toBe("allow");
    expect(d.reason).toBe("subscription_active");
  });

  it("trial active still wins even with grace expired", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "ready",
        trialIsActive: true,
        revalidationGraceExpired: true,
      }),
    );
    expect(d.type).toBe("allow");
    expect(d.reason).toBe("trial_active");
  });
});

// ── 6. Cold-start / hot-reload simulations ────────────────────────────────

describe("getAccessDecision — cold start / hot reload sequences", () => {
  it("active trial user — close + reopen with slow trial fetch never flashes paywall", () => {
    // Frame 1: auth still loading
    expect(
      getAccessDecision(input({ authStatus: "loading" })).type,
    ).toBe("loading");
    // Frame 2: signed in, RC loading, trial idle
    expect(
      getAccessDecision(
        input({
          rcValidationStatus: "loading",
          trialBootstrapStatus: "idle",
        }),
      ).type,
    ).toBe("loading");
    // Frame 3: RC came back inactive, trial still loading
    expect(
      getAccessDecision(
        input({
          rcValidationStatus: "inactive",
          trialBootstrapStatus: "loading",
          lastKnownAccess: LAST_KNOWN_TRIAL_ACTIVE,
        }),
      ).type,
    ).toBe("loading");
    // Frame 4: trial resolves active → tabs
    expect(
      getAccessDecision(
        input({
          rcValidationStatus: "inactive",
          trialBootstrapStatus: "ready",
          trialIsActive: true,
          routeFlags: INDEX_ROUTE_FLAGS,
          currentPathname: "/",
          routeContext: ROOT_STUB_ROUTE_CONTEXT,
        }),
      ).type,
    ).toBe("redirect_tabs");
  });

  it("paying user — RC active overrides everything", () => {
    expect(
      getAccessDecision(
        input({
          rcValidationStatus: "active",
          trialBootstrapStatus: "ready",
          trialIsActive: false,
          trialIsExpired: true,
        }),
      ).type,
    ).toBe("allow");
  });

  it("trial fetch transient failure on cold start (last-known active) → loading not gate", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "error",
        lastKnownAccess: LAST_KNOWN_TRIAL_ACTIVE,
      }),
    );
    expect(d.type).toBe("loading");
  });
});

describe("getAccessDecision — Expo route groups vs pathname", () => {
  it("APP_ENTRY_PATH must not be invalid /(tabs)/index href", () => {
    expect(APP_ENTRY_PATH).not.toBe("/(tabs)/index");
    expect(APP_ENTRY_PATH).toBe("/(tabs)");
  });

  it("pathname / but segments include (tabs) — RC active → allow", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "active",
        currentPathname: "/",
        routeContext: TABS_WITH_ROOT_PATHNAME_CONTEXT,
      }),
    );
    expect(d.type).toBe("allow");
    expect(d.reason).toBe("subscription_active");
  });

  it("stub root index only — RC active → redirect to APP_ENTRY_PATH", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "active",
        routeFlags: INDEX_ROUTE_FLAGS,
        currentPathname: "/",
        routeContext: ROOT_STUB_ROUTE_CONTEXT,
      }),
    );
    expect(d.type).toBe("redirect_tabs");
    expect(d.target).toBe(APP_ENTRY_PATH);
  });

  it("complete + RC active on +not-found → recover redirect once (decision)", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "active",
        currentPathname: "/",
        routeContext: NOT_FOUND_ROUTE_CONTEXT,
      }),
    );
    expect(d.type).toBe("redirect_tabs");
    expect(d.reason).toBe("complete_recover_not_found");
    expect(d.target).toBe(APP_ENTRY_PATH);
  });

  it("complete + active trial on +not-found → same recover decision", () => {
    const d = getAccessDecision(
      input({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "ready",
        trialIsActive: true,
        currentPathname: "/",
        routeContext: NOT_FOUND_ROUTE_CONTEXT,
      }),
    );
    expect(d.type).toBe("redirect_tabs");
    expect(d.reason).toBe("complete_recover_not_found");
  });
});

// ── 7. deriveLastKnownAccessKind ──────────────────────────────────────────

describe("deriveLastKnownAccessKind", () => {
  it("RC active → subscription_active", () => {
    expect(
      deriveLastKnownAccessKind({
        rcValidationStatus: "active",
        trialBootstrapStatus: "ready",
        trialIsActive: false,
      }),
    ).toBe("subscription_active");
  });

  it("RC active beats trial state", () => {
    expect(
      deriveLastKnownAccessKind({
        rcValidationStatus: "active",
        trialBootstrapStatus: "idle",
        trialIsActive: false,
      }),
    ).toBe("subscription_active");
  });

  it("trial ready + active → trial_active", () => {
    expect(
      deriveLastKnownAccessKind({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "ready",
        trialIsActive: true,
      }),
    ).toBe("trial_active");
  });

  it("RC inactive + trial ready + not active → none", () => {
    expect(
      deriveLastKnownAccessKind({
        rcValidationStatus: "inactive",
        trialBootstrapStatus: "ready",
        trialIsActive: false,
      }),
    ).toBe("none");
  });

  it("transient states → null (do not overwrite cache)", () => {
    expect(
      deriveLastKnownAccessKind({
        rcValidationStatus: "loading",
        trialBootstrapStatus: "loading",
        trialIsActive: false,
      }),
    ).toBeNull();
    expect(
      deriveLastKnownAccessKind({
        rcValidationStatus: "unknown",
        trialBootstrapStatus: "idle",
        trialIsActive: false,
      }),
    ).toBeNull();
    expect(
      deriveLastKnownAccessKind({
        rcValidationStatus: "error",
        trialBootstrapStatus: "error",
        trialIsActive: false,
      }),
    ).toBeNull();
  });
});
