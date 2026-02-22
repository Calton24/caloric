import { MobileCoreProviders } from "@/src/MobileCoreProviders";
import { useScreenTracking } from "@/src/infrastructure/analytics";
import { Stack } from "expo-router";
import "react-native-reanimated";

export default function RootLayout() {
  useScreenTracking();

  return (
    <MobileCoreProviders testID="app-ready">
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
    </MobileCoreProviders>
  );
}
