/**
 * useScreenTracking
 *
 * Calls `analytics.screen(routeName)` on every expo-router route change.
 * Drop this hook into your root layout and screen tracking is automatic.
 *
 * Screen name derivation:
 *   expo-router's `usePathname()` returns the current URL pathname,
 *   e.g. "/(tabs)/home", "/auth/forgot-password", "/modal".
 *   We strip leading group markers like "(tabs)" and normalise to a clean
 *   slash-separated path: "home", "auth/forgot-password", "modal".
 *
 * @example
 * ```tsx
 * // app/_layout.tsx
 * import { useScreenTracking } from "@/src/infrastructure/analytics";
 * export default function RootLayout() {
 *   useScreenTracking();
 *   return <Stack />;
 * }
 * ```
 */

import { usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { analytics } from "./analytics";
import { normalisePathname, shouldTrackScreen } from "./screenTrackingUtils";

export function useScreenTracking(): void {
  const pathname = usePathname();
  const prevScreen = useRef<string | null>(null);

  useEffect(() => {
    const screen = normalisePathname(pathname);

    if (shouldTrackScreen(screen, prevScreen.current)) {
      analytics.screen(screen!);
      prevScreen.current = screen;
    }
  }, [pathname]);
}
