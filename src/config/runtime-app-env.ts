import Constants from "expo-constants";

/**
 * Canonical app environment for runtime (Sentry, diagnostics).
 * Prefers `expo.extra` from app.config; falls back to inlined `EXPO_PUBLIC_APP_ENV`.
 */
export function readRuntimeAppEnv(): string {
  const extra = Constants.expoConfig?.extra;
  const fromExtra =
    extra && typeof extra === "object" && "APP_ENV" in extra
      ? String((extra as { APP_ENV?: unknown }).APP_ENV ?? "").trim()
      : "";
  const fromProcess = (process.env.EXPO_PUBLIC_APP_ENV ?? "").trim();
  const v = fromExtra || fromProcess;
  if (!v) {
    console.error(
      "[ConfigFatal] APP_ENV missing: set EXPO_PUBLIC_APP_ENV in .env (e.g. dev) and restart Metro / rebuild."
    );
    throw new Error(
      "EXPO_PUBLIC_APP_ENV is required (e.g. EXPO_PUBLIC_APP_ENV=dev)."
    );
  }
  return v;
}
