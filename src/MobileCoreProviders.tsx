/**
 * Mobile Core UI - Root Providers
 * Combine all providers for easy app setup
 */

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import React, { useEffect } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./features/auth/AuthProvider";
import {
    ErrorBoundary,
    initErrorReporting,
} from "./infrastructure/errorReporting";
import { ThemeProvider } from "./theme/ThemeProvider";
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
  // Initialize error reporting on mount
  useEffect(() => {
    const reporter = initErrorReporting();
    if (reporter.isEnabled()) {
      console.log("[MobileCore] Error reporting initialized");
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
                  <BottomSheetProvider>{children}</BottomSheetProvider>
                </BottomSheetModalProvider>
              </AuthProvider>
            </ThemeProvider>
          </SafeAreaProvider>
        </View>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
