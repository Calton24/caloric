/**
 * Caloric — Stack layout
 * Wraps all catalog sub-screens in a headerless stack.
 */

import { useTheme } from "@/src/theme/useTheme";
import { Stack } from "expo-router";

export default function CaloricLayout() {
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
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
