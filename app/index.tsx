import { Redirect } from "expo-router";
import React from "react";
import { useAuth } from "../src/features/auth/useAuth";
import { useProfileStore } from "../src/features/profile/profile.store";

export default function IndexScreen() {
  const { user, isLoading } = useAuth();
  const onboardingCompleted = useProfileStore(
    (state) => state.profile.onboardingCompleted
  );

  // Wait for auth to initialize
  if (isLoading) return null;

  // Not signed in → landing screen
  if (!user) {
    return <Redirect href="/(onboarding)/landing" />;
  }

  // Signed in but hasn't onboarded → onboarding
  if (!onboardingCompleted) {
    return <Redirect href="/(onboarding)/goal" />;
  }

  // Signed in + onboarded → main app
  return <Redirect href="/(tabs)" />;
}
