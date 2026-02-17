/**
 * Mobile Core UI - Root Providers
 * Combine all providers for easy app setup
 */

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./features/auth/AuthProvider";
import { ThemeProvider } from "./theme/ThemeProvider";
import { BottomSheetProvider } from "./ui/sheets/BottomSheetProvider";

interface MobileCoreProvidersProps {
  children: React.ReactNode;
}

/**
 * Root provider that wraps all Mobile Core providers
 * Use this at the root of your app
 */
export function MobileCoreProviders({ children }: MobileCoreProvidersProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <BottomSheetModalProvider>
              <BottomSheetProvider>{children}</BottomSheetProvider>
            </BottomSheetModalProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
