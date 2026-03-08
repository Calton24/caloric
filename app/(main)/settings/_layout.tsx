/**
 * Settings Group Layout
 *
 * Stack navigator for settings index + detail screens.
 */

import { Stack } from "expo-router";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="voice-text-input" />
      <Stack.Screen name="units" />
      <Stack.Screen name="body-measurements" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="apple-health" />
    </Stack>
  );
}
