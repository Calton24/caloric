import { CalCutProviders } from "@/src/CalCutProviders";
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
import Constants from "expo-constants";
import { useFonts } from "expo-font";
import { Stack, usePathname, useRouter } from "expo-router";
import { readRuntimeAppEnv } from "../src/config/runtime-app-env";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  ActivityIndicator,
  InteractionManager,
  View,
} from "react-native";
import "react-native-reanimated";
import * as Sentry from "@sentry/react-native";
import { triggerFoodLoggingTestError } from "../src/infrastructure/errorReporting/foodLoggingErrors";
import { useAuth } from "../src/features/auth/useAuth";
import { assertFoodLogSafeModeImport } from "../src/features/debug/safe-mode-flags";
import { APP_ENTRY_PATH } from "../src/features/navigation/app-entry-href";

assertFoodLogSafeModeImport("app/_layout");
import { OnboardingAuthorityGate } from "../src/features/onboarding/OnboardingAuthorityGate";
import { useOnboardingAuthorityStore } from "../src/features/onboarding/onboarding-authority.store";
import {
  useSettingsHydrated,
  useSettingsStore,
} from "../src/features/settings/settings.store";

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const runtimeAppEnv = readRuntimeAppEnv();

const sentryRelease =
  Constants.expoConfig?.slug && Constants.expoConfig?.version
    ? `${Constants.expoConfig.slug}@${Constants.expoConfig.version}`
    : undefined;
const sentryDist =
  Constants.nativeBuildVersion != null
    ? String(Constants.nativeBuildVersion)
    : (Constants.expoConfig?.version ?? undefined);

Sentry.init({
  enabled: Boolean(sentryDsn),
  dsn: sentryDsn,
  environment: runtimeAppEnv,
  release: sentryRelease,
  dist: sentryDist,
  tracesSampleRate: __DEV__ ? 1.0 : 0.1,
  debug: __DEV__,
  attachStacktrace: true,
  enableAutoSessionTracking: true,
  enableNativeCrashHandling: true,
});

SplashScreen.preventAutoHideAsync();

const TRANSIENT_MODAL_PATHS = new Set([
  "/(modals)/tracking",
  "/tracking",
  "/(modals)/camera-log",
  "/camera-log",
  "/(modals)/scan-result",
  "/scan-result",
  "/(modals)/confirm-meal",
  "/confirm-meal",
]);

function isTransientModalPath(pathname: string): boolean {
  return TRANSIENT_MODAL_PATHS.has(pathname);
}

function RouteSanitizerGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const settingsHydrated = useSettingsHydrated();
  const hasSeenPermissions = useSettingsStore(
    (state) => state.settings.hasSeenPermissions
  );
  // Omit `resolvedAt` / full object identity so resolver timestamp-only
  // writes do not re-run this gate's effects alongside the authority gate.
  const authorityForSanitizer = useOnboardingAuthorityStore(
    useShallow((s) => {
      const st = s.state;
      if (st.kind === "unknown") return { kind: "unknown" as const };
      if (st.kind === "resolving") {
        return { kind: "resolving" as const, userId: st.userId };
      }
      return {
        kind: "resolved" as const,
        userId: st.userId,
        status: st.status,
      };
    }),
  );
  const sanitizedThisBootstrap = useRef(false);
  const pendingSanitizerNavRef = useRef<{ cancel: () => void } | null>(null);

  // Authoritative complete signal: the resolver has confirmed THIS user has
  // onboarding_completed=true server-side. Anything else (unknown, resolving,
  // error, stale-user, missing, incomplete) is NOT "stable home state".
  const onboardingComplete =
    !!user &&
    authorityForSanitizer.kind === "resolved" &&
    authorityForSanitizer.userId === user.id &&
    authorityForSanitizer.status === "complete";

  const isStableAuthenticatedHomeState = useMemo(() => {
    if (!user) return false;
    if (isLoading) return false;
    if (!settingsHydrated) return false;
    if (!onboardingComplete) return false;
    if (!hasSeenPermissions) return false;
    return true;
  }, [user, isLoading, settingsHydrated, onboardingComplete, hasSeenPermissions]);

  useEffect(() => {
    // Reset bootstrap marker on full auth teardown so next sign-in can sanitize.
    if (!user) {
      sanitizedThisBootstrap.current = false;
    }
  }, [user]);

  useEffect(() => {
    return () => {
      pendingSanitizerNavRef.current?.cancel?.();
      pendingSanitizerNavRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (sanitizedThisBootstrap.current) return;
    if (!isStableAuthenticatedHomeState) return;
    if (!isTransientModalPath(pathname)) {
      // First stable route is already safe; mark so we don't sanitize
      // intentional modal opens later in this same runtime session.
      sanitizedThisBootstrap.current = true;
      return;
    }

    sanitizedThisBootstrap.current = true;
    if (__DEV__) {
      console.log("[RouteSanitizer] transient route replaced", {
        from: pathname,
        to: APP_ENTRY_PATH,
        userIdPresent: Boolean(user?.id),
      });
    }
    pendingSanitizerNavRef.current?.cancel?.();
    pendingSanitizerNavRef.current = InteractionManager.runAfterInteractions(
      () => {
        pendingSanitizerNavRef.current = null;
        requestAnimationFrame(() => {
          router.replace(APP_ENTRY_PATH as never);
        });
      },
    );
  }, [isStableAuthenticatedHomeState, pathname, router, user?.id]);

  return null;
}

function RootStack() {
  const { theme } = useTheme();

  const stackScreenOptions = useMemo(
    () => ({
      contentStyle: { backgroundColor: theme.colors.background },
    }),
    [theme.colors.background],
  );

  return (
    <Stack screenOptions={stackScreenOptions}>
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
    const extra = Constants.expoConfig?.extra as
      | Record<string, unknown>
      | undefined;
    const env =
      process.env.EXPO_PUBLIC_APP_ENV ??
      (extra?.APP_ENV as string | undefined) ??
      runtimeAppEnv;
    console.log("[BundleCheck]", {
      bundleIdentifier: Constants.expoConfig?.ios?.bundleIdentifier,
      appProfile: extra?.APP_PROFILE,
      appEnvFromExtra: extra?.APP_ENV,
      expoPublicAppEnv: process.env.EXPO_PUBLIC_APP_ENV,
      runtimeAppEnv,
      env,
      expoVersion: Constants.expoConfig?.version,
      nativeAppVersion: Constants.nativeApplicationVersion,
      nativeBuildVersion: Constants.nativeBuildVersion,
    });
  }, []);

  useEffect(() => {
    if (!__DEV__) return;
    // Dev-only manual test hooks (JS debugger / console) to verify ingestion.
    const g = globalThis as typeof globalThis & {
      __triggerSentryTestError?: () => void;
      __triggerSentryPromiseTestError?: () => void;
      __triggerFoodLoggingTestError?: () => void;
      __triggerTrackCaloriesTestError?: () => void;
    };
    g.__triggerSentryTestError = () => {
      Sentry.captureException(new Error("Sentry JS test"));
    };
    g.__triggerSentryPromiseTestError = () => {
      void Promise.reject(new Error("Sentry promise test"));
    };
    g.__triggerFoodLoggingTestError = () => {
      triggerFoodLoggingTestError();
    };

    g.__triggerTrackCaloriesTestError = () => {
      Sentry.captureException(
        new Error("Track Calories global test trigger (confirm_meal)"),
      );
    };

    return () => {
      delete g.__triggerSentryTestError;
      delete g.__triggerSentryPromiseTestError;
      delete g.__triggerFoodLoggingTestError;
      delete g.__triggerTrackCaloriesTestError;
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
      <CalCutProviders testID="app-ready">
        <RouteSanitizerGate />
        <OnboardingAuthorityGate>
          <RootStack />
        </OnboardingAuthorityGate>
      </CalCutProviders>
    </ErrorBoundary>
  );
}

export default Sentry.wrap(RootLayout);
