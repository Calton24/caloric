/**
 * Root Index — auth-based routing only.
 *
 * Deep links (e.g. caloric://auth/callback?code=X) are routed directly
 * by Expo Router to the matching file under app/. This screen only
 * handles normal app-launch routing based on auth state.
 */
import { Redirect } from "expo-router";
import { useAuth } from "../src/features/auth/useAuth";
import { useProfileStore } from "../src/features/profile/profile.store";

export default function IndexScreen() {
  const { user, isLoading } = useAuth();
  const onboardingCompleted = useProfileStore(
    (state) => state.profile.onboardingCompleted
  );

  if (isLoading) return null;

  if (!user) return <Redirect href="/(onboarding)/landing" />;
  if (!onboardingCompleted) return <Redirect href="/(onboarding)/goal" />;

  return <Redirect href="/(tabs)" />;
}
