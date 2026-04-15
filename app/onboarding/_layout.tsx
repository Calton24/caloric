/**
 * Onboarding Layout
 * Full-screen stack with no header — each step manages its own chrome.
 * 9-stage high-conversion funnel:
 *   1. Welcome / Value Hook
 *   2. Goal Selection
 *   3. Body Data (gender, age, height, weight)
 *   4. Activity Level
 *   5. Goal Weight (current → goal visual)
 *   6. Timeframe (weeks + rate labels)
 *   7. Plan Calculation (loading / anticipation)
 *   8. Personalized Results (calories, macros, projection)
 *   9. Paywall (7-day free trial)
 *  10. Completion celebration
 */

import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="goal" />
      <Stack.Screen name="body" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="weight-goal" />
      <Stack.Screen name="timeframe" />
      <Stack.Screen name="calculating" />
      <Stack.Screen name="plan" />
      <Stack.Screen name="paywall" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
