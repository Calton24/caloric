import { CaloricProviders } from "@/src/CaloricProviders";
import { useScreenTracking } from "@/src/infrastructure/analytics";
import { useGrowthScreenTracking } from "@/src/infrastructure/growth";
import { Stack } from "expo-router";
import "react-native-reanimated";

export default function RootLayout() {
  useScreenTracking();
  useGrowthScreenTracking();

  return (
    <CaloricProviders testID="app-ready">
      <Stack>
        {/* ── Entry point ── */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* ── Route Groups ── */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(onboarding)"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(modals)"
          options={{ headerShown: false, presentation: "modal" }}
        />

        {/* ── Legacy routes (kept for backward compat) ── */}
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="permissions"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="live-activity-intro"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="tracking"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen name="progress" options={{ headerShown: false }} />
        <Stack.Screen
          name="log-weight"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen
          name="confirm-meal"
          options={{ headerShown: false, presentation: "modal" }}
        />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="auth/forgot-password"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="auth/reset-password"
          options={{
            presentation: "modal",
            headerShown: false,
          }}
        />
      </Stack>
    </CaloricProviders>
  );
}
