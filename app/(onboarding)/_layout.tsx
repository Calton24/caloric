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
 * Routing guard: enforced by the global `OnboardingAuthorityGate` mounted
 * in `app/_layout.tsx`. We intentionally do NOT read local
 * `profile.onboardingCompleted` here — that's the bug class we already
 * eliminated; the server is the only source of truth for routing.
 *
 * Side effect: the checkpoint hook persists the user's current step to
 * `user_profiles.onboarding_step` so a force-quit + reopen resumes them
 * at the same screen.
 */

import { useOnboardingCheckpoint } from "@/src/features/onboarding/use-onboarding-checkpoint";
import { Stack } from "expo-router";

export default function OnboardingLayout() {
  // Persists the user's current step to the server on every advance.
  useOnboardingCheckpoint();

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
      <Stack.Screen
        name="goal"
        options={{ animation: "slide_from_right", animationDuration: 300 }}
      />
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
