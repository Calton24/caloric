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
import { analytics, initAnalytics } from "./infrastructure/analytics";
import {
    ErrorBoundary,
    initErrorReporting,
} from "./infrastructure/errorReporting";
import { growth, initGrowth } from "./infrastructure/growth";
import { initHaptics } from "./infrastructure/haptics";
import { initNotifications } from "./infrastructure/notifications";
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
              <AuthProvider>
                <BottomSheetModalProvider>
                  <BottomSheetProvider>
                    <ToastProvider>
                      <NotificationToastProvider>
                        {children}
                      </NotificationToastProvider>
                    </ToastProvider>
                  </BottomSheetProvider>
                </BottomSheetModalProvider>
              </AuthProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </View>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
