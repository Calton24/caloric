import { CaloricProviders } from "@/src/CaloricProviders";
import { useScreenTracking } from "@/src/infrastructure/analytics";
import { useGrowthScreenTracking } from "@/src/infrastructure/growth";
import { ErrorBoundary } from "@/src/logging/ErrorBoundary";
import { useTheme } from "@/src/theme/useTheme";
import {
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    PlusJakartaSans_800ExtraBold_Italic,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-reanimated";
import * as Sentry from "@sentry/react-native";

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const sentryEnvironment =
  process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? "development" : "production");

Sentry.init({
  enabled: Boolean(sentryDsn),
  dsn: sentryDsn,
  environment: sentryEnvironment,
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  debug: __DEV__,
  enableNativeCrashHandling: true,
});

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      {/* ── Entry point ── */}
      <Stack.Screen
        name="index"
        options={{ headerShown: false, animation: "fade" }}
      />

      {/* ── Route Groups ── */}
      <Stack.Screen
        name="(tabs)"
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="(onboarding)"
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: "fade",
        }}
      />
      <Stack.Screen name="(main)" options={{ headerShown: false }} />
      <Stack.Screen
        name="(modals)"
        options={{ headerShown: false, presentation: "modal" }}
      />

      {/* ── Auth screens ── */}
      <Stack.Screen
        name="auth/sign-in"
        options={{
          headerShown: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="auth/forgot-password"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="auth/callback"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="auth/reset-password"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />

      {/* ── Standalone screens (custom headers) ── */}
      <Stack.Screen name="progress" options={{ headerShown: false }} />
      <Stack.Screen name="goals" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="log-weight" options={{ headerShown: false }} />
      <Stack.Screen name="confirm-meal" options={{ headerShown: false }} />
      <Stack.Screen name="permissions" options={{ headerShown: false }} />
      <Stack.Screen
        name="live-activity-intro"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="modal"
        options={{ headerShown: false, presentation: "modal" }}
      />
    </Stack>
  );
}

function RootLayout() {
  useScreenTracking();
  useGrowthScreenTracking();

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    PlusJakartaSans_800ExtraBold_Italic,
  });

  useEffect(() => {
    // Hide splash once fonts load (success or error — don't block forever)
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (!__DEV__) return;
    // Dev-only manual test hook: run `globalThis.__triggerSentryTestError?.()`
    // from JS debugger/console to verify event ingestion.
    (globalThis as typeof globalThis & {
      __triggerSentryTestError?: () => void;
    }).__triggerSentryTestError = () => {
      Sentry.captureException(new Error("Sentry test error"));
    };

    return () => {
      delete (globalThis as typeof globalThis & {
        __triggerSentryTestError?: () => void;
      }).__triggerSentryTestError;
    };
  }, []);

  if (!fontsLoaded && !fontError) {
    // Return an opaque background so the underlying white native view
    // never bleeds through while fonts load (e.g. on dev-client hot reload
    // where the native splash is no longer blocking)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <CaloricProviders testID="app-ready">
        <RootStack />
      </CaloricProviders>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
