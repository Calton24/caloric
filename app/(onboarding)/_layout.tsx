/**
 * Onboarding Layout
 *
 * Sequential funnel with slide-from-right transitions.
 * No back gesture — the user advances forward only.
 *
 * Screens:
 *   1. landing       — Entry for unauthenticated users (Get Started / Sign In)
 *   2. welcome       — Value hook
 *   3. goal          — Goal selection
 *   4. body          — Body data (gender, age, height, weight)
 *   5. activity      — Activity level
 *   6. weight-goal   — Target weight
 *   7. timeframe     — Timeline selection
 *   8. calculating   — Plan calculation animation
 *   9. plan          — Personalized results
 *  10. save-progress — Auth gate (sign in / sign up / skip)
 *  11. paywall       — Subscription gate
 *  12. complete      — Celebration
 *
 * Guard: fully authenticated + onboarded users are redirected to (tabs)
 * so they cannot re-enter this funnel accidentally.
 */

import { useAuth } from "@/src/features/auth/useAuth";
import { useProfileStore } from "@/src/features/profile/profile.store";
import { Redirect, Stack } from "expo-router";

export default function OnboardingLayout() {
  const { user, isLoading } = useAuth();
  const onboardingCompleted = useProfileStore(
    (s) => s.profile.onboardingCompleted
  );

  // Don't redirect while auth is still initialising — avoids flash.
  if (!isLoading && user && onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

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
