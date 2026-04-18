/**
 * Root Index — auth-based routing only.
 *
 * Deep links (e.g. caloric://auth/callback?code=X) are routed directly
 * by Expo Router to the matching file under app/. This screen only
 * handles normal app-launch routing based on auth state.
 *
 * Waits for both auth AND profile store hydration before redirecting,
 * preventing hot-reload from falsely routing to onboarding.
 */
import { Redirect } from "expo-router";
import { useAuth } from "../src/features/auth/useAuth";
import {
    useProfileHydrated,
    useProfileStore,
} from "../src/features/profile/profile.store";

export default function IndexScreen() {
  const { user, isLoading } = useAuth();
  const hydrated = useProfileHydrated();
  const onboardingCompleted = useProfileStore(
    (state) => state.profile.onboardingCompleted
  );

  if (isLoading || !hydrated) return null;

  if (!user) return <Redirect href="/(onboarding)/landing" />;
  if (!onboardingCompleted) return <Redirect href="/(onboarding)/landing" />;

  return <Redirect href="/(tabs)" />;
}
