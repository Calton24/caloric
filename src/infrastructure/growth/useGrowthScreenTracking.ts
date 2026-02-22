/**
 * useGrowthScreenTracking
 * Keeps Growth Layer screen context in sync with expo-router.
 */

import { usePathname } from "expo-router";
import { useEffect } from "react";
import { normalisePathname } from "../analytics/screenTrackingUtils";
import { setGrowthScreen } from "./growthContext";

export function useGrowthScreenTracking(): void {
  const pathname = usePathname();

  useEffect(() => {
    setGrowthScreen(normalisePathname(pathname));
  }, [pathname]);
}
