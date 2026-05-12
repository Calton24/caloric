/**
 * OnboardingAuthorityGate — global route guard.
 *
 * Mounted in the root layout (app/_layout.tsx) so it runs for EVERY pathname.
 *
 * Architecture
 * ------------
 *   This component is a THIN ADAPTER. All routing logic lives in
 *   src/features/access/access-decision.ts as a pure, unit-tested state
 *   machine. The gate's only responsibilities are:
 *     - mount the onboarding resolver hook
 *     - read every input store (auth, onboarding, RC, trial, last-known)
 *     - call getAccessDecision(input)
 *     - apply the decision (replace, allow, render overlay)
 *     - persist last-known access on every definitive resolution
 *     - emit structured logs / Sentry breadcrumb on every gate redirect
 *
 * No conditionals scattered across the component. No bespoke "is loading"
 * checks. The decision machine handles every state — including the flicker
 * shield that fixed the "intermittent paywall after app close/reopen" bug.
 */

import {
  useGlobalSearchParams,
  usePathname,
  useRouter,
  useSegments,
  type Href,
} from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  ActivityIndicator,
  InteractionManager,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import {
  reportBreadcrumb,
  reportError,
} from "../../infrastructure/errorReporting";
import { logColdStartStep } from "../../infrastructure/tracing/coldStartTrace";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../../ui/primitives/TText";
import {
  deriveLastKnownAccessKind,
  getAccessDecision,
  type AccessDecisionInput,
  type AuthStatus,
  type OnboardingStatus,
  type RouteFlags,
} from "../access/access-decision";
import { useLastKnownAccessStore } from "../access/last-known-access.store";
import { useAppTrialStore } from "../subscription/app-trial.store";
import { trackPaywallGateShown } from "../subscription/subscription-analytics";
import { useSubscriptionStore } from "../subscription/subscription.store";
import { useAuth } from "../auth/useAuth";
import { useProfileStore } from "../profile/profile.store";
import { computeEffectiveOnboardingStatus } from "./compute-effective-onboarding-status";
import type {
  OnboardingAuthorityStatus,
  OnboardingStep,
} from "./onboarding-authority";
import { useOnboardingAuthorityStore } from "./onboarding-authority.store";
import {
  isAuthRoute,
  isGatedAllowedRoute,
  isIndexRoute,
  isInsideOnboardingFlow,
  isPaywallRoute,
  isPermissionsRoute,
  isVoluntaryUpgradePaywallPath,
} from "./onboarding-route-matchers";
import { STEP_TO_ROUTE } from "./onboarding-step-routes";
import { useOnboardingAuthority } from "./use-onboarding-authority";
import {
  APP_ENTRY_PATH,
  evaluateAppEntryNotFoundRedirectGuard,
} from "../navigation/app-entry-href";
import { buildRouteContext } from "../navigation/route-segments";

interface Props {
  children: React.ReactNode;
}

/**
 * Grace window before the access-decision flicker shield gives up.
 * Long enough to absorb a slow-network cold start; short enough that a
 * permanently-broken backend (missing migration / dead RPC) doesn't
 * trap the user on an infinite spinner.
 */
const REVALIDATION_GRACE_MS = 8_000;
/** If server onboarding stays "loading" this long, allow safe fallbacks (local proof). */
const ONBOARDING_GATE_WAIT_MS = 8_000;
/** Ignore duplicate redirect_tabs to the same target (remount / segment lag). */
const REDIRECT_DEDUPE_MS = 1_500;

/** Decision targets are strings; map to Expo Router Href. */
function targetToHref(target: string): Href {
  if (target === "/(onboarding)/paywall?mode=gate") {
    return { pathname: "/(onboarding)/paywall", params: { mode: "gate" } };
  }
  if (target === APP_ENTRY_PATH) {
    return "/(tabs)" as Href;
  }
  return target as Href;
}

export function OnboardingAuthorityGate({ children }: Props) {
  // Mount the resolver UNCONDITIONALLY. It populates the authority store
  // (server onboarding status). Calling it before any early-return is the
  // only way to guarantee it runs even when the gate is rendering an
  // overlay instead of children.
  useOnboardingAuthority();

  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  // `useSegments()` often returns a new array reference every render even when
  // the logical path is unchanged. That would recreate `routeContext`, re-fire
  // the redirect `useEffect`, and can spiral into "Maximum update depth" via
  // React Navigation's internal store subscribers.
  const segmentsKey = (segments as string[]).join("\0");
  const routeContext = useMemo(
    () => buildRouteContext(pathname, segments as string[]),
    [pathname, segmentsKey],
  );
  const globalSearchParams = useGlobalSearchParams<{
    mode?: string | string[];
  }>();
  const globalPaywallMode = globalSearchParams.mode;
  const { user, isLoading: authLoading } = useAuth();
  const profileUserId = useProfileStore((s) => s.profile.id);
  const profileOnboardingCompleted = useProfileStore(
    (s) => s.profile.onboardingCompleted,
  );
  /**
   * IMPORTANT: `setResolved` mints a new `resolvedAt` on every write. Subscribing
   * to the whole `state` object makes the gate re-render (and re-run the redirect
   * `useEffect`) even when routing-relevant fields are unchanged — that can spiral
   * into "Maximum update depth" with React Navigation's internal sync store.
   *
   * `useShallow` + a slice that omits `resolvedAt` keeps renders aligned with
   * actual routing input changes only.
   */
  const authorityRouting = useOnboardingAuthorityStore(
    useShallow((s) => {
      const st = s.state;
      if (st.kind === "unknown") return { kind: "unknown" as const };
      if (st.kind === "resolving") {
        return { kind: "resolving" as const, userId: st.userId };
      }
      return {
        kind: "resolved" as const,
        userId: st.userId,
        status: st.status,
        onboardingCompleted: st.onboardingCompleted,
        onboardingStep: st.onboardingStep,
        errorMessage: st.errorMessage,
      };
    }),
  );
  const requestRetry = useOnboardingAuthorityStore((s) => s.requestRetry);
  const { theme } = useTheme();

  // Subscription + trial state
  const rcValidationStatus = useSubscriptionStore((s) => s.rcValidationStatus);
  const cachedHasSubscription = useSubscriptionStore(
    (s) => s.subscription.hasActiveSubscription,
  );
  const appTrialBootstrap = useAppTrialStore((s) => s.bootstrapStatus);
  const trial = useAppTrialStore((s) => s.trial);
  const trialIsActive = trial?.isActive ?? false;
  const trialIsExpired = trial?.isExpired ?? false;

  // Last-known access (flicker shield)
  const lastKnownAccess = useLastKnownAccessStore((s) => s.cache);
  const hydrateLastKnown = useLastKnownAccessStore((s) => s.hydrate);
  useEffect(() => {
    void hydrateLastKnown();
  }, [hydrateLastKnown]);

  // Dedupe guard for redirects (pathname "/" is ambiguous with route groups).
  const lastRedirectRef = useRef<{
    from: string;
    to: string;
    userId: string | null;
    decisionReason: string;
    at: number;
  } | null>(null);

  /** Timestamp of last `router.replace(APP_ENTRY)` while on `+not-found`. */
  const lastAppEntryFromNotFoundAtRef = useRef<number | null>(null);
  /** After a fatal not-found loop, stop spamming redirects until route recovers. */
  const appEntryNotFoundBlockedRef = useRef(false);
  /** Cancels superseded deferred `router.replace` work (avoids piling nav on RN dev RedBox). */
  const pendingNavigationRef = useRef<{ cancel: () => void } | null>(null);

  // Revalidation grace timer. The flicker shield holds the gate in
  // "loading" while a transient RC/trial error is being retried — but
  // only for a bounded budget. If the server is permanently broken
  // (e.g. missing migration), we must give up and let the gate make a
  // definitive decision so the user isn't trapped on a spinner.
  const [revalidationGraceExpired, setRevalidationGraceExpired] =
    useState(false);

  // ── Map raw stores → decision input ─────────────────────────────────────
  // Auth-status derivation rule (release-blocker fix):
  //   - userId present                 → signedIn (regardless of isLoading)
  //   - no userId + auth still booting → loading
  //   - no userId + auth boot finished → signedOut
  //
  // The previous derivation `authLoading ? loading : (userId ? signedIn : signedOut)`
  // could trap a real authenticated user in the "loading" branch when
  // AuthProvider's `setUser(...)` ran before `setIsLoading(false)` —
  // e.g. when supabase.auth.onAuthStateChange fires INITIAL_SESSION
  // before getSession() resolves. The fix: treat a known userId as the
  // definitive signedIn signal, regardless of the bootstrap flag.
  const userId = user?.id ?? null;
  const authStatus: AuthStatus = userId
    ? "signedIn"
    : authLoading
      ? "loading"
      : "signedOut";

  const resolvedForCurrentUser =
    authorityRouting.kind === "resolved" &&
    authorityRouting.userId === (userId ?? "");
  const serverDerivedOnboardingStatus: OnboardingStatus = !resolvedForCurrentUser
    ? "loading"
    : (() => {
        const status = authorityRouting.status as OnboardingAuthorityStatus;
        if (status === "complete") return "complete";
        if (status === "incomplete") return "incomplete";
        if (status === "missing") return "loading"; // resolver is creating row
        return "error";
      })();
  const onboardingStep: OnboardingStep | null = resolvedForCurrentUser
    ? (authorityRouting.onboardingStep ?? null)
    : null;
  const resumeTarget =
    (onboardingStep && STEP_TO_ROUTE[onboardingStep]) || "/(onboarding)/goal";

  const [onboardingWaitExpired, setOnboardingWaitExpired] = useState(false);
  useEffect(() => {
    if (serverDerivedOnboardingStatus !== "loading") {
      setOnboardingWaitExpired(false);
      return;
    }
    const handle = setTimeout(() => {
      setOnboardingWaitExpired(true);
      if (__DEV__) {
        console.log("[OnboardingAuthorityLifecycle]", {
          event: "timeout_fallback",
          userId,
          reason: "onboarding_loading_exceeded_budget",
          budgetMs: ONBOARDING_GATE_WAIT_MS,
        });
      }
    }, ONBOARDING_GATE_WAIT_MS);
    return () => clearTimeout(handle);
  }, [serverDerivedOnboardingStatus, userId]);

  const localOnboardingProof =
    Boolean(userId) &&
    profileUserId === userId &&
    profileOnboardingCompleted;

  const onboardingStatus: OnboardingStatus = computeEffectiveOnboardingStatus(
    serverDerivedOnboardingStatus,
    {
      userId,
      profileUserId,
      profileOnboardingCompleted,
      rcValidationStatus,
      trialBootstrapStatus: appTrialBootstrap,
      trialIsActive,
      onboardingWaitExpired,
    },
  );

  const routeFlags: RouteFlags = {
    isAuth: isAuthRoute(pathname),
    isInsideOnboardingFlow: isInsideOnboardingFlow(pathname),
    isPermissions: isPermissionsRoute(pathname),
    isIndex: isIndexRoute(pathname),
    isPaywall: isPaywallRoute(pathname),
    isVoluntaryUpgradePaywall: isVoluntaryUpgradePaywallPath(
      pathname,
      globalPaywallMode,
    ),
    isGatedAllowed: isGatedAllowedRoute(pathname, globalPaywallMode),
  };

  const decisionInput: AccessDecisionInput = {
    authStatus,
    onboardingStatus,
    resumeTarget,
    rcValidationStatus,
    trialBootstrapStatus: appTrialBootstrap,
    trialIsActive,
    trialIsExpired,
    lastKnownAccess,
    revalidationGraceExpired,
    currentPathname: pathname,
    routeContext,
    routeFlags,
  };

  const decision = getAccessDecision(decisionInput);

  // Manage grace timer. Start it the moment the decision becomes
  // "loading because of last-known-active flicker shield"; clear it
  // when we leave that state.
  const inFlickerShield =
    decision.type === "loading" &&
    (decision.reason === "trial_error_revalidating_with_active_cache" ||
      decision.reason === "rc_error_revalidating_with_active_cache");
  useEffect(() => {
    return () => {
      pendingNavigationRef.current?.cancel?.();
      pendingNavigationRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!inFlickerShield) {
      if (revalidationGraceExpired) setRevalidationGraceExpired(false);
      return;
    }
    if (revalidationGraceExpired) return; // already expired this session
    const timer = setTimeout(() => {
      if (__DEV__) {
        console.warn(
          "[AccessDecision] revalidation grace expired — falling through to definitive decision",
        );
      }
      setRevalidationGraceExpired(true);
    }, REVALIDATION_GRACE_MS);
    return () => clearTimeout(timer);
  }, [inFlickerShield, revalidationGraceExpired]);

  // ── Apply decision (side effects) ───────────────────────────────────────
  useEffect(() => {
    // Persist last-known access whenever inputs are definitive.
    const derivedKind = deriveLastKnownAccessKind({
      rcValidationStatus,
      trialBootstrapStatus: appTrialBootstrap,
      trialIsActive,
    });
    if (derivedKind !== null) {
      useLastKnownAccessStore.getState().record(derivedKind);
    }

    // Structured log + Sentry breadcrumb for EVERY decision.
    const logPayload = {
      pathname,
      segments: routeContext.segments,
      isInTabsGroup: routeContext.isInTabsGroup,
      isTrueRootIndex: routeContext.isTrueRootIndex,
      isNotFoundRoute: routeContext.isNotFoundRoute,
      userId,
      authStatus,
      authBootstrapReady: !authLoading,
      hasSession: Boolean(userId),
      authorityKind: authorityRouting.kind,
      serverDerivedOnboardingStatus,
      onboardingStatus,
      onboardingStep,
      localOnboardingProof,
      profileUserId,
      onboardingWaitExpired,
      rcValidationStatus,
      cachedHasSubscription,
      trialBootstrapStatus: appTrialBootstrap,
      trialIsActive,
      trialIsExpired,
      lastKnownAccessKind: lastKnownAccess.kind,
      lastKnownCheckedAt: lastKnownAccess.checkedAt,
      decisionType: decision.type,
      decisionReason: decision.reason,
      decisionTarget: decision.target ?? null,
    };
    if (__DEV__) {
      console.log("[RouteState]", {
        pathname,
        segments: routeContext.segments,
        isInTabsGroup: routeContext.isInTabsGroup,
        isTrueRootIndex: routeContext.isTrueRootIndex,
        isNotFoundRoute: routeContext.isNotFoundRoute,
      });
      console.log("[AuthState]", {
        authBootstrapReady: !authLoading,
        authLoading,
        hasSession: Boolean(userId),
        userId,
        authStatusForGate: authStatus,
      });
      console.log("[AccessDecision]", logPayload);
    }
    logColdStartStep("authority_gate_decision", logPayload);

    if (
      decision.type === "redirect_gate" ||
      decision.type === "redirect_landing" ||
      decision.type === "redirect_onboarding" ||
      decision.type === "redirect_tabs"
    ) {
      reportBreadcrumb(`access-gate:${decision.type}:${decision.reason}`, {
        area: "bootstrap",
        action: "access_gate_decision",
        extra: logPayload,
      });
    }

    // Apply redirects.
    if (
      decision.type === "redirect_gate" ||
      decision.type === "redirect_landing" ||
      decision.type === "redirect_onboarding" ||
      decision.type === "redirect_tabs"
    ) {
      const target = decision.target;
      if (!target) return;

      const now = Date.now();

      if (!routeContext.isNotFoundRoute) {
        lastAppEntryFromNotFoundAtRef.current = null;
        appEntryNotFoundBlockedRef.current = false;
      }

      if (
        decision.type === "redirect_tabs" &&
        routeContext.isInTabsGroup &&
        target === APP_ENTRY_PATH
      ) {
        if (__DEV__) {
          console.log("[RouteRedirectSkipped]", {
            reason: "already_in_tabs",
            target,
            pathname,
            segments: routeContext.segments,
            userId,
          });
        }
        return;
      }

      const entryGuard = evaluateAppEntryNotFoundRedirectGuard({
        isRedirectTabsToAppEntry:
          decision.type === "redirect_tabs" && target === APP_ENTRY_PATH,
        isNotFoundRoute: routeContext.isNotFoundRoute,
        blocked: appEntryNotFoundBlockedRef.current,
        lastAttemptAt: lastAppEntryFromNotFoundAtRef.current,
        now,
      });

      if (entryGuard.action === "skip_blocked") {
        if (__DEV__) {
          console.log("[RouteRedirectSkipped]", {
            reason: "app_entry_not_found_blocked",
            target,
            pathname,
            segments: routeContext.segments,
            userId,
          });
        }
        return;
      }

      if (entryGuard.action === "fatal_config") {
        appEntryNotFoundBlockedRef.current = true;
        const payload = {
          ...entryGuard.payload,
          pathname,
          segments: routeContext.segments,
        };
        if (__DEV__) {
          console.warn("[RouteConfigError]", payload);
        }
        reportError(
          new Error(String(entryGuard.payload.message)),
          {
            area: "bootstrap",
            action: "app_entry_route_config",
            extra: payload,
          },
        );
        return;
      }

      if (entryGuard.action === "proceed_mark_attempt") {
        lastAppEntryFromNotFoundAtRef.current = now;
      }

      const last = lastRedirectRef.current;
      if (
        last &&
        last.to === target &&
        last.userId === userId &&
        last.decisionReason === decision.reason &&
        now - last.at < REDIRECT_DEDUPE_MS
      ) {
        if (__DEV__) {
          console.log("[RouteRedirectSkipped]", {
            reason: "duplicate_recent_redirect",
            target,
            pathname,
            segments: routeContext.segments,
            userId,
          });
        }
        return;
      }

      if (last && last.from === pathname && last.to === target) {
        if (__DEV__) {
          console.log("[RouteRedirectSkipped]", {
            reason: "same_from_to",
            target,
            pathname,
            userId,
          });
        }
        return;
      }

      lastRedirectRef.current = {
        from: pathname,
        to: target,
        userId,
        decisionReason: decision.reason,
        at: now,
      };

      if (__DEV__) {
        console.log("[RouteRedirect]", {
          from: pathname,
          to: target,
          reason: decision.reason,
          userId,
          decisionType: decision.type,
          segments: routeContext.segments,
        });
      }

      if (decision.type === "redirect_gate") {
        trackPaywallGateShown({ rc: rcValidationStatus, pathname });
      }

      const href = targetToHref(target);
      pendingNavigationRef.current?.cancel?.();
      pendingNavigationRef.current = InteractionManager.runAfterInteractions(
        () => {
          pendingNavigationRef.current = null;
          requestAnimationFrame(() => {
            try {
              router.replace(href);
            } catch (err) {
              reportError(err instanceof Error ? err : new Error(String(err)), {
                area: "bootstrap",
                action: "authority_gate_replace",
                extra: { target, pathname, decisionReason: decision.reason },
              });
              if (decision.type !== "redirect_gate") {
                requestAnimationFrame(() => {
                  try {
                    router.replace({
                      pathname: "/(onboarding)/paywall",
                      params: { mode: "gate" },
                    });
                  } catch {
                    /* swallow */
                  }
                });
              }
            }
          });
        },
      );
    }
  }, [
    appTrialBootstrap,
    authLoading,
    authStatus,
    authorityRouting,
    cachedHasSubscription,
    decision.reason,
    decision.target,
    decision.type,
    lastKnownAccess.checkedAt,
    lastKnownAccess.kind,
    onboardingStatus,
    onboardingStep,
    onboardingWaitExpired,
    pathname,
    profileOnboardingCompleted,
    profileUserId,
    rcValidationStatus,
    routeContext.isInOnboardingGroup,
    routeContext.isInTabsGroup,
    routeContext.isNotFoundRoute,
    routeContext.isTrueRootIndex,
    segmentsKey,
    serverDerivedOnboardingStatus,
    trialIsActive,
    trialIsExpired,
    userId,
  ]);

  // ── Render ──────────────────────────────────────────────────────────────
  // Always mount `children` (root Stack). Unmounting the navigator during
  // loading/redirect left Expo Router with no outlet while `router.replace`
  // ran, which could thrash React Navigation's `useSyncState` → "Maximum
  // update depth exceeded". Overlays use absolute fill on top instead.
  const showBlockingOverlay =
    decision.type === "loading" ||
    decision.type === "show_error" ||
    decision.type === "redirect_gate" ||
    decision.type === "redirect_landing" ||
    decision.type === "redirect_onboarding" ||
    decision.type === "redirect_tabs";

  return (
    <View style={styles.gateRoot} pointerEvents="box-none">
      {children}
      {showBlockingOverlay ? (
        decision.type === "show_error" ? (
          <ErrorOverlay theme={theme} onRetry={requestRetry} />
        ) : (
          <LoadingOverlay theme={theme} />
        )
      ) : null}
    </View>
  );
}

// ── Overlays ──────────────────────────────────────────────────────────────

function LoadingOverlay({
  theme,
}: {
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  return (
    <View
      style={[styles.overlay, { backgroundColor: theme.colors.background }]}
    >
      <ActivityIndicator size="small" color={theme.colors.textSecondary} />
    </View>
  );
}

function ErrorOverlay({
  theme,
  onRetry,
}: {
  theme: ReturnType<typeof useTheme>["theme"];
  onRetry: () => void;
}) {
  return (
    <View
      style={[styles.overlay, { backgroundColor: theme.colors.background }]}
    >
      <TText
        variant="heading"
        style={[styles.errorTitle, { color: theme.colors.text }]}
      >
        Something went wrong
      </TText>
      <TText variant="body" color="secondary" style={styles.errorBody}>
        We couldn&apos;t check your account status. Please try again.
      </TText>
      <Pressable
        onPress={onRetry}
        style={[styles.retryButton, { backgroundColor: theme.colors.accent }]}
        accessibilityRole="button"
        accessibilityLabel="Retry"
      >
        <TText variant="body" color="inverse">
          Retry
        </TText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  gateRoot: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  errorTitle: {
    textAlign: "center",
    marginBottom: 8,
  },
  errorBody: {
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
  },
});
