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
 * Intentionally does **not** use `useTheme()`: during native/JS mismatch,
 * Fast Refresh, or ErrorBoundary recovery, this route can render before
 * `CalCutProviders` re-mounts; hardcoded neutrals avoid a fatal invariant.
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

const STUB_BG = "#000000";
const STUB_SPINNER = "#9CA3AF";

export default function IndexScreen() {
  return (
    <View style={[styles.center, { backgroundColor: STUB_BG }]}>
      <ActivityIndicator size="small" color={STUB_SPINNER} />
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
