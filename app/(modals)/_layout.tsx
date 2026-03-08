/**
 * Modals Layout
 *
 * Modal presentation stack for contextual screens:
 * food logging, weight entry, meal confirmation, permissions.
 */

import { Stack } from "expo-router";

export default function ModalsLayout() {
  return (
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
      <Stack.Screen name="edit-meal" />
      <Stack.Screen name="log-weight" />
      <Stack.Screen name="permissions-setup" />
      <Stack.Screen name="live-activity-intro" />
    </Stack>
  );
}
