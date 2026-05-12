import Constants from "expo-constants";
import * as Sentry from "@sentry/react-native";

/**
 * Dev-only: verify DSN, transport, and Sentry project filters.
 */
export async function sendSentryDevPing(): Promise<{
  flushed: boolean;
  envFromProcess: string | undefined;
  envFromExtra: unknown;
  hasDsn: boolean;
  appProfile: unknown;
  releaseFromConstants: string | undefined;
  nativeBuildVersion: string | null | undefined;
  nativeApplicationVersion: string | null | undefined;
}> {
  const envFromExtra =
    Constants.expoConfig?.extra &&
    typeof Constants.expoConfig.extra === "object" &&
    "APP_ENV" in Constants.expoConfig.extra
      ? (Constants.expoConfig.extra as { APP_ENV?: string }).APP_ENV
      : undefined;

  Sentry.captureException(
    new Error(`[SentryDevPing] ${new Date().toISOString()}`)
  );

  let flushed = false;
  try {
    flushed = await Sentry.flush();
  } catch {
    flushed = false;
  }

  const out = {
    flushed,
    envFromProcess: process.env.EXPO_PUBLIC_APP_ENV,
    envFromExtra,
    hasDsn: Boolean(process.env.EXPO_PUBLIC_SENTRY_DSN),
    appProfile:
      Constants.expoConfig?.extra &&
      typeof Constants.expoConfig.extra === "object" &&
      "APP_PROFILE" in Constants.expoConfig.extra
        ? (Constants.expoConfig.extra as { APP_PROFILE?: string }).APP_PROFILE
        : undefined,
    releaseFromConstants: Constants.expoConfig?.version,
    nativeBuildVersion: Constants.nativeBuildVersion,
    nativeApplicationVersion: Constants.nativeApplicationVersion,
  };

  if (__DEV__) {
    console.log("[SentryDevPing]", out);
  }

  return out;
}
