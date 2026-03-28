/**
 * Caloric - Root Providers
 * Combine all providers for easy app setup
 */

import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import React, { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getAppConfig } from "./config";
import { AuthProvider } from "./features/auth/AuthProvider";
import { useAuth } from "./features/auth/useAuth";
import { initFoodRegion } from "./features/nutrition/matching/region.service";
import { rescheduleRemindersIfEnabled } from "./features/reminders/reschedule";
import { useSubscriptionStore } from "./features/subscription";
import { useScanCreditsStore } from "./features/subscription/scanCredits.store";
import { useProgressSync } from "./features/sync/useProgressSync";
import { initActivityMonitor } from "./infrastructure/activityMonitor";
import { analytics, initAnalytics } from "./infrastructure/analytics";
import {
    ErrorBoundary,
    initErrorReporting,
} from "./infrastructure/errorReporting";
import { growth, initGrowth } from "./infrastructure/growth";
import { initHaptics } from "./infrastructure/haptics";
import { initI18n } from "./infrastructure/i18n";
import { initLiveActivity } from "./infrastructure/liveActivity";
import { initMaintenance, MaintenanceGate } from "./infrastructure/maintenance";
import { initNotifications } from "./infrastructure/notifications";
import { initPresence } from "./infrastructure/presence";
import { getBillingProvider, initializeBilling } from "./lib/billing";
import { logger } from "./logging/logger";
import { ThemeProvider } from "./theme/ThemeProvider";
import { NotificationToastProvider } from "./ui/components/NotificationToast";
import { ToastProvider } from "./ui/components/Toast";
import { BottomSheetProvider } from "./ui/sheets/BottomSheetProvider";

/** Invisible component that syncs stores ↔ Supabase once auth is available */
function SyncGate({ children }: { children: React.ReactNode }) {
  useProgressSync();
  return <>{children}</>;
}

/**
 * Initialises the RevenueCat SDK once auth is ready, syncs the user identity,
 * and keeps the local subscription store up-to-date with real entitlements.
 * Must be rendered inside <AuthProvider>.
 */
function BillingGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const syncFromEntitlement = useSubscriptionStore(
    (s) => s.syncFromEntitlement
  );
  const hydrateScanCredits = useScanCreditsStore((s) => s.hydrate);
  const hydrateSubscription = useSubscriptionStore((s) => s.hydrate);

  // Hydrate persisted stores from storage on mount
  useEffect(() => {
    hydrateScanCredits();
    hydrateSubscription();
  }, [hydrateScanCredits, hydrateSubscription]);

  // Initialise billing SDK once on mount and subscribe to entitlement changes
  useEffect(() => {
    initializeBilling()
      .then(() => {
        const provider = getBillingProvider();
        // Sync current entitlement state immediately after init
        provider
          .getEntitlements()
          .then(syncFromEntitlement)
          .catch(() => {});
        // Listen for real-time changes (renewals, expirations, new purchases)
        provider.onEntitlementsChanged(syncFromEntitlement);
      })
      .catch((err) => logger.warn("[Billing] Init failed:", err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Identify / de-identify the user with RevenueCat on auth state changes
  useEffect(() => {
    const provider = getBillingProvider();
    if (user?.id) {
      provider.logIn?.(user.id);
    } else {
      provider.logOut?.();
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return <>{children}</>;
}

interface CaloricProvidersProps {
  children: React.ReactNode;
  testID?: string;
}

/**
 * Root provider that wraps all Caloric providers
 * Use this at the root of your app
 */
export function CaloricProviders({ children, testID }: CaloricProvidersProps) {
  // Initialize cross-cutting infrastructure on mount
  useEffect(() => {
    const reporter = initErrorReporting();
    if (reporter.isEnabled()) {
      console.log("[Caloric] Error reporting initialized");
    }

    // Pre-load MaterialCommunityIcons font for keyboard icon in FAB picker
    MaterialCommunityIcons.loadFont().catch(() => {});

    initAnalytics();
    initGrowth();
    initHaptics();
    initNotifications();
    rescheduleRemindersIfEnabled();
    initI18n();
    initFoodRegion();
    initPresence();
    initActivityMonitor();
    initLiveActivity();
    initMaintenance();

    if (__DEV__) {
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
                          <BottomSheetProvider>
                            <NotificationToastProvider>
                              {children}
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
