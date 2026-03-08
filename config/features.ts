/**
 * Static Feature Flags
 *
 * Single source of truth for tab/screen visibility.
 * Auth capabilities are in src/features/auth/authCapabilities.ts.
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
  | "SHOW_CALORIC";

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

  /** Caloric dev tools — dev only */
  SHOW_CALORIC: __DEV__,
};

export type FeatureFlag = keyof typeof FeatureFlags;
