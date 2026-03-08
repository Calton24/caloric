import { Redirect } from "expo-router";
import React from "react";
import { useProfileStore } from "../src/features/profile/profile.store";

export default function IndexScreen() {
  const onboardingCompleted = useProfileStore(
    (state) => state.profile.onboardingCompleted
  );

  if (!onboardingCompleted) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <Redirect href="/(tabs)" />;
}
