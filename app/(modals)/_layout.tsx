/**
 * Modals Layout
 *
 * Modal presentation stack for contextual screens:
 * food logging, weight entry, meal confirmation, permissions.
 *
 * Includes its own GestureHandlerRootView + BottomSheetModalProvider
 * so that bottom sheets (e.g. ReportFoodSheet) render ABOVE the
 * native modal layer. Without this, sheets opened from modal screens
 * appear behind the modal and are invisible/untappable — the native
 * iOS modal creates a separate UIViewController outside the root
 * gesture handler's view hierarchy.
 *
 * Route guard: on mount, if there is no previous screen to go back to
 * (which happens when Expo Router restores a modal as the root state
 * after hot reload or a force-quit), we redirect to /(tabs) so the user
 * never gets trapped inside a modal with no escape.
 */

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetProvider } from "../../src/ui/sheets/BottomSheetProvider";

/**
 * Detects whether the modals group was restored as the root navigation state
 * (i.e. there is no underlying tab/screen to go back to after a hot reload
 * or cold-start while the app happened to be showing a modal).
 *
 * When that happens, we replace the stack with /(tabs) so the user lands on
 * Home instead of being permanently trapped inside the modal.
 */
function useModalRootGuard() {
  const router = useRouter();

  useEffect(() => {
    // canGoBack() === false means this modal IS the root. We can only test
    // this after the first render, since navigation state isn't ready before.
    const canGoBack = router.canGoBack();
    if (!canGoBack) {
      if (__DEV__) {
        console.log("[RouteRecovery]", {
          currentPath: "(modals)",
          reason: "modal_is_root_after_reload",
          targetRoute: "/(tabs)",
        });
      }
      // Use replace so the modal doesn't stay in the back stack.
      router.replace("/(tabs)");
    }
    // Only run on mount — we don't want to redirect every time canGoBack changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

export default function ModalsLayout() {
  useModalRootGuard();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <BottomSheetProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              presentation: "modal",
            }}
          >
            <Stack.Screen name="tracking" />
            <Stack.Screen name="voice-log" />
            <Stack.Screen name="manual-log" />
            <Stack.Screen
              name="camera-log"
              options={{ presentation: "fullScreenModal" }}
            />
            <Stack.Screen name="confirm-meal" />
            <Stack.Screen name="meal-analysis" />
            <Stack.Screen name="edit-meal" />
            <Stack.Screen name="log-weight" />
            <Stack.Screen name="permissions-setup" />
            <Stack.Screen name="live-activity-intro" />
            <Stack.Screen name="guide" />
            <Stack.Screen
              name="scan-result"
              options={{ headerShown: false, presentation: "modal" }}
            />
            <Stack.Screen
              name="web-viewer"
              options={{ presentation: "modal" }}
            />
          </Stack>
        </BottomSheetProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
