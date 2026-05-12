/**
 * CalCut - Root Providers
 * Combine all providers for easy app setup
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getAppConfig } from "./config";
import { logLastCrashMarkersOnBoot } from "./features/debug/home-crash-markers";
import {
  FOOD_LOG_SAFE_MODE,
  assertFoodLogSafeModeImport,
} from "./features/debug/safe-mode-flags";

assertFoodLogSafeModeImport("CalCutProviders");
import { preloadExperimentAssignments } from "./experiments";
import { DeleteAccountDialogHost } from "./features/account/DeleteAccountDialogHost";
import { AuthProvider } from "./features/auth/AuthProvider";
import { useAuth } from "./features/auth/useAuth";
import { useChallengeStore } from "./features/challenge/challenge.store";
import { useGoalsStore } from "./features/goals/goals.store";
import { initFoodRegion } from "./features/nutrition/matching/region.service";
import { useNutritionStore } from "./features/nutrition/nutrition.store";
import { useProfileStore } from "./features/profile/profile.store";
import { useProgressStore } from "./features/progress/progress.store";
import { rescheduleRemindersIfEnabled } from "./features/reminders/reschedule";
import { useRetentionStore } from "./features/retention/retention.store";
import { useShareStore } from "./features/share/share.store";
import { useStreakStore } from "./features/streak/streak.store";
import { useSubscriptionStore } from "./features/subscription";
import { useAppTrialStore } from "./features/subscription/app-trial.store";
import { useAppTrialSync } from "./features/subscription/use-app-trial-sync";
import { useLastKnownAccessStore } from "./features/access/last-known-access.store";
import { useScanCreditsStore } from "./features/subscription/scanCredits.store";
import { useProgressSync } from "./features/sync/useProgressSync";
import { useWaterStore } from "./features/water/water.store";
import { initActivityMonitor } from "./infrastructure/activityMonitor";
import { analytics, initAnalytics } from "./infrastructure/analytics";
import {
    ErrorBoundary,
    initErrorReporting,
    reportError,
} from "./infrastructure/errorReporting";
import { growth, initGrowth } from "./infrastructure/growth";
import { initHaptics } from "./infrastructure/haptics";
import { initI18n, bootstrapI18nSync } from "./infrastructure/i18n";
import { mealDataSafety } from "./features/sync/meal-data-safety";
import { initLiveActivity } from "./infrastructure/liveActivity";
import { initMaintenance, MaintenanceGate } from "./infrastructure/maintenance";
import { initNotifications } from "./infrastructure/notifications";
import { initPresence } from "./infrastructure/presence";
import { getBillingProvider, initializeBilling } from "./lib/billing";
import { getSupabaseClient } from "./lib/supabase/client";
import { logger } from "./logging/logger";
import { ThemeProvider } from "./theme/ThemeProvider";
import { NotificationToastProvider } from "./ui/components/NotificationToast";
import { ToastProvider } from "./ui/components/Toast";
import { BottomSheetProvider } from "./ui/sheets/BottomSheetProvider";

// Synchronously seed i18next with English so any screen that renders before
// the async initI18n() finishes (e.g. a modal restored by Expo Router on hot
// reload) shows real copy instead of raw translation keys.
bootstrapI18nSync();

/** Invisible component that syncs stores ↔ Supabase once auth is available */
function SyncGate({ children }: { children: React.ReactNode }) {
  useProgressSync();
  // NOTE: useOnboardingAuthority() is intentionally NOT called here.
  // It lives inside <OnboardingAuthorityGate /> (mounted in app/_layout.tsx)
  // so that the resolver and the gate share the same lifecycle. Mounting
  // it both here and in the gate would issue duplicate Supabase queries
  // on every cold start.
  return <>{children}</>;
}

/**
 * Resets all persisted Zustand stores when the signed-in user changes.
 * Prevents a new user from seeing the previous user's cached meals,
 * weight logs, streaks, etc.
 *
 * Triggers on BOTH transitions:
 *   null → user  (onboarding guest signs into existing account)
 *   userA → userB (direct account switch)
 *
 * Does NOT trigger on first mount (undefined → null/user) when stores are
 * already owned by the correct user from a prior session.
 */
function useResetStoresOnUserChange() {
  const { user, isLoading } = useAuth();
  const prevUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // Wait until auth bootstrap is resolved. Without this guard, cold start
    // often goes undefined -> null (loading) -> user, which looked like a real
    // account switch and incorrectly reset persisted profile preferences
    // (including units) back to defaults before cloud/local hydration settled.
    if (isLoading) return;

    const currentId = user?.id ?? null;

    // Skip very first mount — stores are either fresh or already belong to
    // the current user from a previous session on this device.
    if (prevUserId.current === undefined) {
      prevUserId.current = currentId;
      if (__DEV__) {
        console.log("[AccountHydration] initial mount", {
          userId: currentId ?? "anonymous",
        });
      }
      return;
    }

    // Reset on ANY identity change: null → user, userA → userB, user → null.
    // Previously this only ran on userA → userB (prevUserId !== null guard),
    // which meant onboarding guests signing into an existing account kept
    // all their stale local challenge/subscription/streak state.
    if (prevUserId.current !== currentId) {
      const previousUserId = prevUserId.current;
      const nutritionBefore = useNutritionStore.getState();
      const localMealsBeforeReset = nutritionBefore.meals.length;
      const deletedMealIdsBeforeReset = nutritionBefore.deletedMealIds.length;

      // null → user (guest signs into account mid-onboarding) is a
      // *promotion*, not a real account switch. The onboarding inputs the
      // user just entered (gender, height, weight, etc.) live in the
      // local profile store and goals store. Wiping them here would force
      // the user to re-enter everything OR end up with an empty server row.
      //
      // For this transition we preserve onboarding-relevant state and let
      // the post-login sync push it to the new user's row. Other stores
      // (challenge, subscription, scan credits, streak, meals/weight logs)
      // are still reset because those represent real user-scoped data
      // that should not leak from the previous anonymous session.
      const isAnonymousToUser =
        previousUserId === null && currentId !== null;

      // FAIL CLOSED: enter `account_switch` phase BEFORE clearing local state,
      // so the meal store subscription cannot interpret the upcoming
      // `resetMeals()` as a wave of user-intent deletes and push them as
      // soft-deletes to Supabase. This was the root cause of the 2026-04-29
      // incident where 75 valid remote rows were deleted on account switch.
      mealDataSafety.beginAccountSwitch(
        previousUserId ?? null,
        currentId ?? null
      );

      if (__DEV__) {
        console.log("[AccountHydration] user changed — resetting stores", {
          previousUserId: previousUserId ?? "anonymous",
          currentUserId: currentId ?? "anonymous",
          preserveOnboardingInputs: isAnonymousToUser,
        });
      }

      useNutritionStore.getState().resetMeals();
      useProgressStore.getState().resetWeightLogs();
      // Goals + profile carry the user's onboarding inputs. Only wipe them
      // for genuine account switches (userA → userB) so an anonymous-onboarding
      // → social-signin handoff doesn't lose data the user just entered.
      if (!isAnonymousToUser) {
        useGoalsStore.getState().clearPlan();
        useProfileStore.getState().resetProfile();
      }
      useRetentionStore.getState().resetRetention();
      useChallengeStore.getState().clearChallenge();
      useShareStore.getState().reset();
      useStreakStore.getState().resetFreeze();
      useStreakStore.getState().setStreak({
        currentStreak: 0,
        longestStreak: 0,
        lastLogDate: null,
        streakStartDate: null,
      });
      useWaterStore.setState({ intakeByDate: {} });
      useSubscriptionStore.getState().resetSubscription();
      useAppTrialStore.getState().reset();
      useLastKnownAccessStore.getState().reset();
      useScanCreditsStore.getState().resetCredits();
      const nutritionAfter = useNutritionStore.getState();

      if (__DEV__) {
        console.log("[AccountHydration] stores reset complete", {
          stores: [
            "nutrition",
            "goals",
            "progress",
            "profile",
            "retention",
            "challenge",
            "share",
            "streak",
            "water",
            "subscription",
            "scanCredits",
          ],
        });
        console.log("[DataLossAudit] reset-on-user-change", {
          previousUserId: previousUserId ?? "anonymous",
          userId: currentId ?? "anonymous",
          localMealCountBeforeReset: localMealsBeforeReset,
          localMealCountAfterReset: nutritionAfter.meals.length,
          deletedMealIdsCountBeforeReset: deletedMealIdsBeforeReset,
          deletedMealIdsCountAfterReset: nutritionAfter.deletedMealIds.length,
        });
      }
    }

    prevUserId.current = currentId;
  }, [user?.id, isLoading]);
}

/**
 * Initialises the RevenueCat SDK once auth is ready, syncs the user identity,
 * and keeps the local subscription store up-to-date with real entitlements.
 * Must be rendered inside <AuthProvider>.
 */
function BillingGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  useAppTrialSync();
  useResetStoresOnUserChange();
  const syncFromEntitlement = useSubscriptionStore(
    (s) => s.syncFromEntitlement
  );
  const syncFromServer = useSubscriptionStore((s) => s.syncFromServer);
  const setRcValidationStatus = useSubscriptionStore(
    (s) => s.setRcValidationStatus
  );
  const hydrateScanCredits = useScanCreditsStore((s) => s.hydrate);
  const hydrateSubscription = useSubscriptionStore((s) => s.hydrate);
  const hydrateLastKnownAccess = useLastKnownAccessStore((s) => s.hydrate);

  // Hydrate persisted stores from storage on mount
  useEffect(() => {
    hydrateScanCredits();
    hydrateSubscription();
    void hydrateLastKnownAccess();
  }, [hydrateScanCredits, hydrateSubscription, hydrateLastKnownAccess]);

  // Initialise billing SDK once on mount and subscribe to entitlement changes.
  //
  // rcValidationStatus state machine (owned here):
  //   "unknown"  → "loading"  : we set this before init starts
  //   "loading"  → "active"   : syncFromEntitlement sets this when RC confirms
  //   "loading"  → "inactive" : syncFromEntitlement sets this when RC says no
  //   "loading"  → "error"    : we set this on any init / getEntitlements failure
  //
  // The OnboardingAuthorityGate blocks routing until status leaves "loading".
  // Fail closed: any error → "error" → gate routes to paywall, never to tabs.
  useEffect(() => {
    // Signal that the RC check is starting. The gate will show a loading
    // overlay until this resolves to "active", "inactive", or "error".
    setRcValidationStatus("loading");

    initializeBilling()
      .then(() => {
        const provider = getBillingProvider();

        // NoBillingProvider = billing explicitly disabled.
        // In production/TestFlight/staging builds this must NEVER bypass the
        // paywall gate — a misconfigured provider name must not create a free
        // access hole in a live build. Fail closed to "error" instead.
        // Only real __DEV__ (Metro JS server) + non-production env allows bypass.
        if (provider.getProviderName() === "none") {
          const isBypassAllowed =
            __DEV__ &&
            process.env.EXPO_PUBLIC_APP_ENV !== "production" &&
            process.env.EXPO_PUBLIC_APP_ENV !== "staging";

          if (!isBypassAllowed) {
            logger.error(
              "[Billing] Provider is 'none' in a non-dev build — " +
                "failing closed to prevent accidental premium bypass. " +
                "Check EXPO_PUBLIC_REVENUECAT_API_KEY and billing config."
            );
            setRcValidationStatus("error");
            return;
          }

          logger.log("[Billing] Provider is none — dev bypass, granting access");
          setRcValidationStatus("active");
          return;
        }

        // Sync current entitlement state immediately after init.
        // syncFromEntitlement will set rcValidationStatus to "active" or "inactive".
        provider
          .getEntitlements()
          .then(syncFromEntitlement)
          .catch((err) => {
            // RC check failed — fail closed: user goes to paywall until next session
            // resolves cleanly or they restore purchases manually.
            logger.warn("[Billing] getEntitlements failed — setting error status", err);
            setRcValidationStatus("error");
            reportError(err, {
              area: "billing",
              action: "getEntitlements_postInit",
              provider: "revenuecat",
            });
          });

        // Listen for real-time changes (renewals, expirations, new purchases).
        // These also update rcValidationStatus via syncFromEntitlement.
        provider.onEntitlementsChanged(syncFromEntitlement);
      })
      .catch((err) => {
        // SDK init failed — fail closed.
        logger.warn("[Billing] Init failed — setting error status:", err);
        setRcValidationStatus("error");
        reportError(err, {
          area: "billing",
          action: "initializeBilling",
          provider: "revenuecat",
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Identify / de-identify the user with RevenueCat on auth state changes.
  // After logIn, call sync-entitlement to close the anonymous-purchase gap:
  //   user buys while RC is anonymous → webhook fires under $RCAnonymousID
  //   → webhook drops it (UUID check) → subscription_state never written.
  //   This pull-sync ensures the DB reflects reality on every login.
  useEffect(() => {
    const provider = getBillingProvider();
    if (authLoading) {
      if (__DEV__) {
        console.log("[AuthCleanupDecision]", {
          area: "billing",
          authBootstrapReady: false,
          authLoading: true,
          hasSession: Boolean(user?.id),
          userId: user?.id ?? null,
          didRcLogOut: false,
          reason: "defer_revenuecat_logOut_until_auth_resolves",
        });
      }
      return;
    }

    if (user?.id) {
      // Crash isolation: skip every account-hydration side effect (RC.logIn,
      // sync-entitlement RPC, retry timers) before we touch the network.
      // The base provider is already initialised in the effect above and the
      // cached customerInfo carries the entitlement state, so access gating
      // remains accurate without re-identifying.
      if (FOOD_LOG_SAFE_MODE) {
        if (__DEV__) {
          console.log(
            "[AccountHydration] disabled_food_log_safe_mode (skip rc.logIn + sync-entitlement)"
          );
        }
        return;
      }

      // Keep a ref to syncFromServer that's stable inside this closure
      const applyServerData = (data: {
        isPro: boolean;
        status: string;
        expiresAt: string | null;
        lastServerVerifiedAt: string;
      }) =>
        syncFromServer({
          isPro: data.isPro,
          status: data.status,
          expiresAt: data.expiresAt,
          lastServerVerifiedAt: data.lastServerVerifiedAt,
        });

      // One retry after 5 s if the first call fails.
      // Failure bias: preserve last known state (don't pessimistically free).
      // The RC SDK listener acts as the final safety net if both fail.
      const invokeSync = (attempt = 1) => {
        getSupabaseClient()
          .functions.invoke("sync-entitlement")
          .then(({ data, error }) => {
            if (!error && data?.ok) {
              applyServerData({
                isPro: data.isPro as boolean,
                status: data.status as string,
                expiresAt: (data.expiresAt as string | null) ?? null,
                lastServerVerifiedAt: data.lastServerVerifiedAt as string,
              });
              if (__DEV__) {
                console.log("[AccountHydration] sync-entitlement response", {
                  userId: user.id,
                  isPro: data.isPro,
                  status: data.status,
                  hasActiveSubscription:
                    useSubscriptionStore.getState().subscription
                      .hasActiveSubscription,
                  challengeStatus:
                    useChallengeStore.getState().challenge?.status ?? "none",
                });
              }
            } else if (attempt === 1) {
              // Non-authoritative response — retry once; keep current store state
              setTimeout(() => invokeSync(2), 5_000);
            } else if (error) {
              // attempt 2 failure with a real error: report. RC SDK listener
              // still acts as the safety net for real-time entitlement state.
              reportError(error, {
                area: "billing",
                action: "sync-entitlement_final_failure",
                provider: "supabase",
                userId: user.id,
              });
            }
          })
          .catch((err) => {
            if (attempt === 1) {
              setTimeout(() => invokeSync(2), 5_000);
            } else {
              reportError(err, {
                area: "billing",
                action: "sync-entitlement_final_failure",
                provider: "supabase",
                userId: user.id,
              });
            }
          });
      };

      provider
        .logIn?.(user.id)
        ?.then(() => {
          if (__DEV__) {
            console.log("[AccountHydration] RC logIn complete", {
              rcAppUserId: user.id,
            });
          }
        })
        ?.catch((err: unknown) => {
          reportError(err, {
            area: "billing",
            action: "rc_logIn",
            provider: "revenuecat",
            userId: user.id,
          });
        })
        .finally(() => {
          if (FOOD_LOG_SAFE_MODE) {
            if (__DEV__) {
              console.log("[AccountHydration] disabled_food_log_safe_mode");
            }
            return;
          }
          invokeSync();
        });
    } else {
      if (__DEV__) {
        console.log("[AuthCleanupDecision]", {
          area: "billing",
          authBootstrapReady: true,
          authLoading: false,
          hasSession: false,
          userId: null,
          didRcLogOut: true,
          reason: "signed_out_confirmed_rc_logOut",
        });
      }
      provider.logOut?.();
    }
  }, [user?.id, authLoading, syncFromServer]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}

interface CalCutProvidersProps {
  children: React.ReactNode;
  testID?: string;
}

/**
 * Root provider that wraps infrastructure and feature providers.
 * Use at the root of the app.
 */
export function CalCutProviders({ children, testID }: CalCutProvidersProps) {
  useEffect(() => {
    void logLastCrashMarkersOnBoot();
  }, []);

  // Initialize cross-cutting infrastructure on mount
  useEffect(() => {
    // Wire up the ErrorReporter singleton to the Sentry SDK that was init'd
    // at module-load time in app/_layout.tsx. Idempotent.
    initErrorReporting();

    // Pre-load MaterialCommunityIcons font for keyboard icon in FAB picker
    MaterialCommunityIcons.loadFont().catch(() => {});

    initAnalytics();
    if (!FOOD_LOG_SAFE_MODE) {
      preloadExperimentAssignments();
    }
    initGrowth();
    initHaptics();
    initNotifications();
    if (!FOOD_LOG_SAFE_MODE) {
      rescheduleRemindersIfEnabled();
    }
    initI18n();
    initFoodRegion();
    initPresence();
    initActivityMonitor();
    initLiveActivity();
    initMaintenance();

    if (__DEV__ && !FOOD_LOG_SAFE_MODE) {
      const cfg = getAppConfig();
      analytics.track("app_booted", { profile: cfg.profile });
      growth.track("growth_booted", { profile: cfg.profile });
    }
  }, []);

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={{ flex: 1 }} testID={testID}>
          <SafeAreaProvider>
            <ThemeProvider>
              <ToastProvider>
                <MaintenanceGate>
                  <AuthProvider>
                    <BillingGate>
                      <SyncGate>
                        <BottomSheetModalProvider>
                          <BottomSheetProvider isRoot>
                            <NotificationToastProvider>
                              <>
                                {children}
                                <DeleteAccountDialogHost />
                              </>
                            </NotificationToastProvider>
                          </BottomSheetProvider>
                        </BottomSheetModalProvider>
                      </SyncGate>
                    </BillingGate>
                  </AuthProvider>
                </MaintenanceGate>
              </ToastProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </View>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
