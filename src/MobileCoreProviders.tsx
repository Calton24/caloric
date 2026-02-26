/**
 * Mobile Core UI - Root Providers
 * Combine all providers for easy app setup
 */

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import React, { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { getAppConfig } from "./config";
import { AuthProvider } from "./features/auth/AuthProvider";
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
import { ThemeProvider } from "./theme/ThemeProvider";
import { NotificationToastProvider } from "./ui/components/NotificationToast";
import { ToastProvider } from "./ui/components/Toast";
import { BottomSheetProvider } from "./ui/sheets/BottomSheetProvider";

interface MobileCoreProvidersProps {
  children: React.ReactNode;
  testID?: string;
}

/**
 * Root provider that wraps all Mobile Core providers
 * Use this at the root of your app
 */
export function MobileCoreProviders({
  children,
  testID,
}: MobileCoreProvidersProps) {
  // Initialize cross-cutting infrastructure on mount
  useEffect(() => {
    const reporter = initErrorReporting();
    if (reporter.isEnabled()) {
      console.log("[MobileCore] Error reporting initialized");
    }

    initAnalytics();
    initGrowth();
    initHaptics();
    initNotifications();
    initI18n();
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
                    <BottomSheetModalProvider>
                      <BottomSheetProvider>
                        <NotificationToastProvider>
                          {children}
                        </NotificationToastProvider>
                      </BottomSheetProvider>
                    </BottomSheetModalProvider>
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
