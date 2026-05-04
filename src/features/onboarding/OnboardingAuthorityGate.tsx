/**
 * OnboardingAuthorityGate — global route guard.
 *
 * Mounted in the root layout (app/_layout.tsx) so it runs for EVERY
 * pathname, including routes that Expo Router restores directly on cold
 * start (e.g. /(onboarding)/goal). This is critical because app/index.tsx
 * is NOT guaranteed to run on cold start — Expo Router restores the user
 * back into whatever route they last had open.
 *
 * Authority for routing: useOnboardingAuthorityStore (server-resolved).
 * Local persisted onboardingCompleted is NEVER consulted.
 *
 * Architecture rule (do not break):
 *   The resolver hook (`useOnboardingAuthority`) is called HERE, at the
 *   top of the gate, BEFORE any conditional render. This guarantees the
 *   resolver mounts even when the gate is about to block its children
 *   with a loading overlay. Without this guarantee a "block children"
 *   render path would prevent the resolver from running and the spinner
 *   would hang forever.
 *
 * Behavior matrix:
 *
 *   auth loading                         → render children (let Stack draw splash)
 *   no user, on onboarding/auth routes   → render children
 *   no user, anywhere else (including /) → router.replace("/(onboarding)/landing")
 *   user, status unknown/resolving/stale → on onboarding route or index:
 *                                          BLOCK render (loading overlay)
 *                                          on other routes: render children
 *   user, status === error               → on onboarding route or index:
 *                                          BLOCK render (retry overlay)
 *                                          on other routes: render children
 *   user, status === complete            → on onboarding route or index:
 *                                          replace("/(tabs)")
 *                                          on other routes: render children
 *   user, status === incomplete          → on onboarding/auth/permissions:
 *                                          render children (DO NOT FORCE
 *                                          BACK TO /goal — let them progress
 *                                          through the steps)
 *                                          on app route or index:
 *                                          replace("/(onboarding)/goal")
 *
 * The "incomplete user on onboarding route is allowed" rule is critical:
 * earlier versions of the gate matched only `/(onboarding)*` prefixes, but
 * Expo Router strips group segments from `usePathname()` so that
 * `/(onboarding)/activity` arrives here as `/activity`. The matcher must
 * recognise bare step names too — otherwise every "Continue" button press
 * during onboarding looks like a jump to an app route, and the gate
 * snaps the user back to /goal in an infinite loop.
 */

import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { logColdStartStep } from "../../infrastructure/tracing/coldStartTrace";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../../ui/primitives/TText";
import { useAuth } from "../auth/useAuth";
import type { OnboardingStep } from "./onboarding-authority";
import { useOnboardingAuthorityStore } from "./onboarding-authority.store";
import {
  isAuthRoute,
  isIndexRoute,
  isInsideOnboardingFlow,
  isPermissionsRoute,
  isProtectedAppRoute,
} from "./onboarding-route-matchers";
import { STEP_TO_ROUTE } from "./onboarding-step-routes";
import { useOnboardingAuthority } from "./use-onboarding-authority";

interface Props {
  children: React.ReactNode;
}

type GateAction =
  | "allow"
  | "replace_to_tabs"
  | "replace_to_landing"
  | "replace_to_onboarding_goal"
  | "block_loading"
  | "block_error";

export function OnboardingAuthorityGate({ children }: Props) {
  // ── Mount the resolver hook UNCONDITIONALLY, before any other logic. ──
  // The resolver is what populates the authority store. If it doesn't run
  // the gate hangs forever waiting for a resolution that never arrives.
  // Calling it here, at the very top of the gate, guarantees it runs
  // regardless of whether we end up returning children or a loading
  // overlay below. (React rules-of-hooks: hooks must run unconditionally
  // before any early return.)
  useOnboardingAuthority();

  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading: authLoading } = useAuth();
  const authorityState = useOnboardingAuthorityStore((s) => s.state);
  const requestRetry = useOnboardingAuthorityStore((s) => s.requestRetry);
  const { theme } = useTheme();

  // Dedupe guard: prevents replace loops if the destination pathname
  // happens to look like the source to our matcher (e.g. router.replace
  // bounces us between /(onboarding)/goal and /goal). We track the last
  // (pathname, target) tuple we attempted and bail on a repeat.
  const lastRedirectRef = useRef<{ from: string; to: string } | null>(null);

  // Derive route category once.
  const insideOnboardingFlow = isInsideOnboardingFlow(pathname);
  const authRoute = isAuthRoute(pathname);
  const permissionsRoute = isPermissionsRoute(pathname);
  const indexRoute = isIndexRoute(pathname);
  const protectedAppRoute = isProtectedAppRoute(pathname);

  // Derive resolved status FOR THE CURRENT USER (stale entries → null).
  const userId = user?.id ?? null;
  const resolvedForCurrentUser =
    authorityState.kind === "resolved" &&
    authorityState.userId === (userId ?? "");
  const status = resolvedForCurrentUser
    ? (authorityState as { status: string }).status
    : null;
  const onboardingStep: OnboardingStep | null = resolvedForCurrentUser
    ? ((authorityState as { onboardingStep: OnboardingStep | null })
        .onboardingStep ?? null)
    : null;
  // Resume target: where to send an incomplete user when they're at `/`
  // or an app route. Falls back to /goal when no checkpoint exists.
  const resumeTarget: string =
    (onboardingStep && STEP_TO_ROUTE[onboardingStep]) ?? "/(onboarding)/goal";

  useEffect(() => {
    const baseLogPayload = {
      pathname,
      userId,
      authLoading,
      authorityKind: authorityState.kind,
      resolvedForCurrentUser,
      insideOnboardingFlow,
      protectedAppRoute,
      status,
      onboardingStep,
    };

    const safeReplace = (target: string, reason: string, action: GateAction) => {
      // Same-path no-op: if the gate's target is already the current
      // pathname (in any of its rendered forms), don't dispatch a redirect.
      if (target === pathname) {
        logGateDecision({
          ...baseLogPayload,
          action: "allow",
          targetRoute: null,
          reason: `${reason}__same_path_skip`,
        });
        return;
      }
      // Replay-of-same-tuple no-op: if we already tried to go from
      // `pathname` to `target`, don't try again — that's how loops form.
      const last = lastRedirectRef.current;
      if (last && last.from === pathname && last.to === target) {
        logGateDecision({
          ...baseLogPayload,
          action: "allow",
          targetRoute: null,
          reason: `${reason}__dedupe_skip`,
        });
        return;
      }
      lastRedirectRef.current = { from: pathname, to: target };
      logGateDecision({
        ...baseLogPayload,
        action,
        targetRoute: target,
        reason,
      });
      router.replace(target as never);
    };

    const allow = (reason: string) => {
      logGateDecision({
        ...baseLogPayload,
        action: "allow",
        targetRoute: null,
        reason,
      });
    };

    const block = (action: "block_loading" | "block_error", reason: string) => {
      logGateDecision({
        ...baseLogPayload,
        action,
        targetRoute: null,
        reason,
      });
    };

    if (authLoading) {
      allow("auth_loading");
      return;
    }

    if (!userId) {
      // Unauthenticated. Allow onboarding flow + auth screens; otherwise
      // funnel to the landing page. Permissions and index also funnel
      // back to landing because no part of the app should be visible
      // before the user picks an auth path.
      if (insideOnboardingFlow || authRoute) {
        allow("unauth_on_allowed_route");
        return;
      }
      safeReplace(
        "/(onboarding)/landing",
        indexRoute
          ? "unauth_at_index"
          : permissionsRoute
            ? "unauth_at_permissions"
            : "unauth_on_app_route",
        "replace_to_landing"
      );
      return;
    }

    // Authenticated. Wait for the authority store to resolve THIS user.
    if (!resolvedForCurrentUser) {
      block(
        "block_loading",
        authorityState.kind === "unknown"
          ? "authority_unknown"
          : authorityState.kind === "resolving"
            ? "authority_resolving"
            : "authority_stale_user"
      );
      return;
    }

    if (status === "error" || status === "missing") {
      block(
        status === "error" ? "block_error" : "block_loading",
        status === "error" ? "authority_error" : "authority_missing"
      );
      return;
    }

    if (status === "complete") {
      // Completed users belong in the app. Kick them out of onboarding
      // (it has nothing left to do) and out of the index loader.
      if (insideOnboardingFlow || indexRoute) {
        safeReplace(
          "/(tabs)",
          indexRoute ? "complete_at_index" : "complete_on_onboarding_route",
          "replace_to_tabs"
        );
        return;
      }
      allow("complete_on_app_route");
      return;
    }

    if (status === "incomplete") {
      // Critical rule: if the user is inside the onboarding flow, ALLOW
      // the current pathname exactly as-is. Do NOT force-replace to
      // /goal, otherwise every "Continue" button kicks the user back to
      // step 1.
      //
      // Auth and permissions are also fine — those are valid sub-flows
      // an incomplete user can be in.
      if (insideOnboardingFlow || authRoute || permissionsRoute) {
        allow("incomplete_on_allowed_route");
        return;
      }
      // Index or any actual app route → resume the user from their last
      // onboarding checkpoint (server `onboarding_step`). Falls back to
      // /goal when no checkpoint exists yet (brand-new user, or row was
      // just created by the resolver's missing-row recovery).
      safeReplace(
        resumeTarget,
        indexRoute ? "incomplete_at_index_resume" : "incomplete_on_app_route_resume",
        "replace_to_onboarding_goal"
      );
      return;
    }
  }, [
    authLoading,
    userId,
    pathname,
    insideOnboardingFlow,
    authRoute,
    permissionsRoute,
    indexRoute,
    protectedAppRoute,
    resolvedForCurrentUser,
    status,
    onboardingStep,
    resumeTarget,
    authorityState.kind,
    router,
  ]);

  // ── Block-render guards ───────────────────────────────────────────────
  //
  // For an authenticated user whose authority status hasn't been confirmed
  // yet, we cannot let an /(onboarding)/* screen render — they may turn
  // out to be a fully-onboarded Apple/Google user whose last session was
  // restored into goal.tsx. Showing onboarding while we wait for the
  // resolver would visibly contradict the redirect that's about to fire.
  //
  // We also block-render at the index route while resolving, because the
  // simplified IndexScreen is a passive spinner that has no redirect logic
  // of its own — the gate is the only thing that moves the user away from
  // /, and we don't want to risk seeing anything else there.

  const blockableRoute = insideOnboardingFlow || indexRoute;

  if (userId && blockableRoute && !resolvedForCurrentUser && !authLoading) {
    return <LoadingOverlay theme={theme} />;
  }

  if (
    userId &&
    blockableRoute &&
    resolvedForCurrentUser &&
    status === "error"
  ) {
    return <ErrorOverlay theme={theme} onRetry={requestRetry} />;
  }

  if (
    userId &&
    blockableRoute &&
    resolvedForCurrentUser &&
    status === "missing"
  ) {
    // Resolver hook is creating the row + re-resolving. This is transient.
    return <LoadingOverlay theme={theme} />;
  }

  return <>{children}</>;
}

// ── Overlays ────────────────────────────────────────────────────────────

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

// ── Logging ─────────────────────────────────────────────────────────────

function logGateDecision(input: {
  pathname: string;
  userId: string | null;
  authLoading: boolean;
  authorityKind: string;
  resolvedForCurrentUser: boolean;
  insideOnboardingFlow: boolean;
  protectedAppRoute: boolean;
  status: string | null;
  onboardingStep: OnboardingStep | null;
  action: GateAction;
  targetRoute: string | null;
  reason: string;
}): void {
  if (__DEV__) {
    // Single canonical log line per decision. Format mirrors the
    // [OnboardingState] shape so logs from the resolver and the gate
    // can be grep-correlated by userId across cold start.
    console.log("[OnboardingState] route_decision", {
      authUserId: input.userId,
      serverUserProfileFound: input.resolvedForCurrentUser,
      serverOnboardingCompleted:
        input.status === "complete"
          ? true
          : input.status === "incomplete"
            ? false
            : null,
      serverOnboardingStep: input.onboardingStep,
      pathname: input.pathname,
      authLoading: input.authLoading,
      authorityStatus: input.authorityKind,
      insideOnboardingFlow: input.insideOnboardingFlow,
      isProtectedAppRoute: input.protectedAppRoute,
      action: input.action,
      chosenRoute: input.targetRoute,
      reason: input.reason,
    });
  }
  logColdStartStep("authority_gate_decision", input);
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
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

