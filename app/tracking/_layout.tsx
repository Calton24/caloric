/**
 * Tracking Stack Layout
 *
 * Wraps tracking sub-screens (launcher, voice, manual, camera)
 * in a headerless Stack navigator.
 */

import { Stack } from "expo-router";

export default function TrackingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="voice" />
      <Stack.Screen name="manual" />
      <Stack.Screen name="camera" />
    </Stack>
  );
}
