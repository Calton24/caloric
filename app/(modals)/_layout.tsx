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
 * We intentionally do **not** run a global `router.replace("/(tabs)")` “orphan
 * modal recovery” here. That guard was unreliable (`canGoBack()` / parent
 * state during the first modal frame) and dismissed valid flows such as
 * onboarding paywall → `manage-account` or `web-viewer` (Privacy / Terms).
 * If a specific modal ever needs reload recovery, handle it in that screen.
 */

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { BottomSheetProvider } from "../../src/ui/sheets/BottomSheetProvider";

export default function ModalsLayout() {
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
            {/* meal-analysis: registered for deep linking / future UX; camera pipeline uses confirm-meal */}
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
            <Stack.Screen
              name="manage-account"
              options={{ presentation: "modal" }}
            />
            <Stack.Screen
              name="delete-account"
              options={{ presentation: "modal" }}
            />
          </Stack>
        </BottomSheetProvider>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
