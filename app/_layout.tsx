import { MobileCoreProviders } from "@/src/MobileCoreProviders";
import { setLogger } from "@/src/logging/logger";
import { SentryLogger } from "@/src/logging/sentryLogger";
import Constants from "expo-constants";
import { Stack } from "expo-router";
import { useEffect } from "react";
import "react-native-reanimated";
import * as Sentry from "sentry-expo";

// Initialize Sentry if DSN is provided
const SENTRY_DSN =
  Constants.expoConfig?.extra?.sentryDSN || process.env.EXPO_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    enableInExpoDevelopment: false,
    debug: __DEV__,
    environment: __DEV__ ? "development" : "production",
    tracesSampleRate: 1.0,
  });
}

export default function RootLayout() {
  // Bootstrap logger on mount
  useEffect(() => {
    if (SENTRY_DSN && !__DEV__) {
      // Production: Use Sentry logger
      setLogger(new SentryLogger());
    }
    // Dev: ConsoleLogger is already the default
  }, []);

  return (
    <MobileCoreProviders>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </MobileCoreProviders>
  );
}
