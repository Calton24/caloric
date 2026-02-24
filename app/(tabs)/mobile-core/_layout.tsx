/**
 * Mobile Core — Stack layout
 * Wraps all catalog sub-screens in a headerless stack.
 */

import { Stack } from "expo-router";

export default function MobileCoreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="primitives" />
      <Stack.Screen name="glass" />
      <Stack.Screen name="patterns" />
      <Stack.Screen name="widgets" />
      <Stack.Screen name="growth" />
      <Stack.Screen name="maintenance" />
    </Stack>
  );
}
