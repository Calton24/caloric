/**
 * Auth Capabilities
 *
 * Determines which auth providers are available for this app.
 * Email/password is always on. OAuth providers are opt-in via env vars.
 *
 * caloric owns the screens/flows; each app owns the config.
 * Fork an app → set env vars → same auth code, new credentials.
 */

const isE2E = process.env.EXPO_PUBLIC_E2E === "1";

const envOn = (v?: string) => v === "1" || v?.toLowerCase() === "true";

export const AuthCapabilities = {
  /** Email/password — always on */
  emailPassword: true,

  /** Google OAuth — default OFF. Enable per app via EXPO_PUBLIC_AUTH_GOOGLE=1 */
  google: envOn(process.env.EXPO_PUBLIC_AUTH_GOOGLE) || isE2E,

  /** Apple OAuth — default OFF. Enable per app via EXPO_PUBLIC_AUTH_APPLE=1 */
  apple: envOn(process.env.EXPO_PUBLIC_AUTH_APPLE) || isE2E,
} as const;

export type OAuthProviderEnabled = Exclude<
  keyof typeof AuthCapabilities,
  "emailPassword"
>;
