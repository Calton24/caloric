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
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useAuth } from "../src/features/auth/useAuth";
import {
    useProfileHydrated,
    useProfileStore,
} from "../src/features/profile/profile.store";
import {
    useSettingsHydrated,
    useSettingsStore,
} from "../src/features/settings/settings.store";
import { useTheme } from "../src/theme/useTheme";

export default function IndexScreen() {
  const { user, isLoading } = useAuth();
  const { theme } = useTheme();
  const profileHydrated = useProfileHydrated();
  const settingsHydrated = useSettingsHydrated();
  const onboardingCompleted = useProfileStore(
    (state) => state.profile.onboardingCompleted
  );
  const hasSeenPermissions = useSettingsStore(
    (state) => state.settings.hasSeenPermissions
  );

  if (isLoading || !profileHydrated || !settingsHydrated) {
    return (
      <View
        style={[styles.loading, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
      </View>
    );
  }

  if (!user) return <Redirect href="/(onboarding)/landing" />;
  if (!onboardingCompleted) return <Redirect href="/(onboarding)/landing" />;
  if (!hasSeenPermissions)
    return <Redirect href="/(modals)/permissions-setup" />;

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
