/**
 * Expo allows multiple URL schemes; OAuth and password reset need one canonical value.
 * Keep the newest brand scheme first, legacy second, for gradual migration.
 */
export function primaryNativeScheme(
  scheme: string | readonly string[]
): string {
  return typeof scheme === "string" ? scheme : scheme[0] ?? "caloric";
}
