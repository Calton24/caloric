/**
 * Root Index — minimal loading stub.
 *
 * Routing decisions live in the global `OnboardingAuthorityGate` mounted
 * in `app/_layout.tsx`. That gate runs for EVERY pathname (including the
 * routes Expo Router can restore directly on cold start, which would
 * otherwise bypass this file entirely), so it is the single source of
 * truth for who can be where.
 *
 * This screen exists only because expo-router needs an `app/index.tsx`
 * route. When the gate decides the destination it will replace away from
 * here. Until then we render a neutral spinner so the user never sees
 * an unexpected screen flash.
 *
 * Specifically:
 *   - The gate will redirect this route to /(tabs) if status === complete.
 *   - The gate will redirect this route to /(onboarding)/landing if no user.
 *   - The gate will redirect this route to /(onboarding)/goal if status ===
 *     incomplete.
 *
 * In all of those cases this component unmounts before the user sees more
 * than a brief spinner.
 */

import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useTheme } from "../src/theme/useTheme";

export default function IndexScreen() {
  const { theme } = useTheme();
  return (
    <View
      style={[styles.center, { backgroundColor: theme.colors.background }]}
    >
      <ActivityIndicator size="small" color={theme.colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
