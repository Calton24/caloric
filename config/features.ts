/**
 * Static Feature Flags
 *
 * Single source of truth for tab/screen visibility and auth capabilities.
 * Defaults can depend on __DEV__ — that's fine.
 * E2E tests force-enable what they need via EXPO_PUBLIC_E2E=1.
 *
 * Forked apps: replace this file or flip flags. Tabs disappear without
 * hacking routing logic.
 */

const isE2E = process.env.EXPO_PUBLIC_E2E === "1";

type FlagName =
  | "SHOW_HOME"
  | "SHOW_NOTES"
  | "SHOW_AUTH"
  | "SHOW_PLAYGROUND"
  | "SHOW_MOBILE_CORE"
  | "AUTH_EMAIL_ENABLED"
  | "AUTH_GOOGLE_ENABLED"
  | "AUTH_APPLE_ENABLED";

type Flags = Record<FlagName, boolean>;

export const FeatureFlags: Flags = {
  /** Home tab — always visible */
  SHOW_HOME: true,

  /** Notes harness — dev + E2E only */
  SHOW_NOTES: __DEV__ || isE2E,

  /** Auth tab (demo) — dev only, forked apps should remove */
  SHOW_AUTH: __DEV__,

  /** Playground tab — dev + E2E only */
  SHOW_PLAYGROUND: __DEV__ || isE2E,

  /** Mobile Core dev tools — dev only */
  SHOW_MOBILE_CORE: __DEV__,

  // ── Auth capabilities ────────────────────────────────────────────────────
  // Email/password is the default "always works" path.
  // OAuth providers are opt-in — set to true only when credentials are configured.

  /** Email/password auth — always available */
  AUTH_EMAIL_ENABLED: true,

  /** Google OAuth — off by default, enable when EXPO_PUBLIC_GOOGLE_OAUTH_ENABLED=1 */
  AUTH_GOOGLE_ENABLED:
    process.env.EXPO_PUBLIC_GOOGLE_OAUTH_ENABLED === "1" ||
    (__DEV__ && isE2E),

  /** Apple OAuth — off by default, enable when EXPO_PUBLIC_APPLE_OAUTH_ENABLED=1 */
  AUTH_APPLE_ENABLED:
    process.env.EXPO_PUBLIC_APPLE_OAUTH_ENABLED === "1" ||
    (__DEV__ && isE2E),
};

export type FeatureFlag = keyof typeof FeatureFlags;
