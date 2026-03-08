/**
 * Main App Layout
 *
 * Primary navigation stack after onboarding is complete.
 * Contains the home dashboard, progress, and settings screens.
 * Mounts the Live Activity sync hook so it stays alive across all screens.
 */

import { Stack } from "expo-router";
import { useLiveActivitySync } from "../../src/features/live-activity";

export default function MainLayout() {
  useLiveActivitySync();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="progress" />
    </Stack>
  );
}
