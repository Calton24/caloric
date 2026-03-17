/**
 * Onboarding Layout
 *
 * Sequential funnel with slide-from-right transitions.
 * No back gesture — the user advances forward only.
 *
 * Screens:
 *   1. welcome — Value hook
 *   2. goal — Goal selection
 *   3. body — Body data (gender, age, height, weight)
 *   4. activity — Activity level
 *   5. weight-goal — Target weight
 *   6. timeframe — Timeline selection
 *   7. calculating — Plan calculation animation
 *   8. plan — Personalized results
 *   9. save-progress — Auth gate (sign in / sign up / skip)
 *  10. paywall — Subscription gate
 *  11. complete — Celebration
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
      <Stack.Screen name="landing" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="goal" />
      <Stack.Screen name="body" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="weight-goal" />
      <Stack.Screen name="timeframe" />
      <Stack.Screen name="calculating" />
      <Stack.Screen name="plan" />
      <Stack.Screen name="save-progress" />
      <Stack.Screen name="paywall" />
      <Stack.Screen name="complete" />
    </Stack>
  );
}
