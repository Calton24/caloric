/**
 * Onboarding Layout
 *
 * Sequential funnel with smooth fade transitions.
 * Back navigation enabled for user-friendly experience.
 *
 * Screens:
 *   1. landing       — Entry for unauthenticated users (Get Started / Sign In)
 *   2. goal          — Goal selection
 *   3. body          — Body data (gender, age, height, weight)
 *   4. activity      — Activity level
 *   5. weight-goal   — Target weight
 *   6. timeframe     — Timeline selection
 *   7. calculating   — Plan calculation animation
 *   8. plan          — Personalized results
 *   9. save-progress — Auth gate (sign in / sign up / skip)
 *  10. paywall       — Subscription gate
 *  11. complete      — Celebration
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
        animation: "fade",
        animationDuration: 450,
        gestureEnabled: true,
        gestureDirection: "horizontal",
      }}
    >
      <Stack.Screen name="landing" options={{ gestureEnabled: false }} />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="goal" />
      <Stack.Screen name="body" />
      <Stack.Screen name="activity" />
      <Stack.Screen name="weight-goal" />
      <Stack.Screen name="timeframe" />
      <Stack.Screen name="calculating" options={{ gestureEnabled: false }} />
      <Stack.Screen name="plan" options={{ gestureEnabled: false }} />
      <Stack.Screen name="save-progress" />
      <Stack.Screen name="paywall" options={{ gestureEnabled: false }} />
      <Stack.Screen name="complete" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
