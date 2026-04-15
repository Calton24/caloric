/**
 * Maintenance — Dev Debug Screen
 * Accessible from Caloric catalog in __DEV__ only.
 * In production builds, redirects to the catalog home.
 */

import { Redirect } from "expo-router";
import React from "react";
import { MaintenanceDebugPanel } from "../../../src/ui/dev/MaintenanceDebugPanel";
import { Screen } from "../../../src/ui/layout/Screen";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

export default function MaintenanceDebugScreen() {
  if (!__DEV__) return <Redirect href="/(tabs)/caloric" />;

  return (
    <Screen scrollable>
      <TSpacer size="lg" />
      <TText variant="heading">Maintenance / Degraded-Mode</TText>
      <TSpacer size="xs" />
      <TText color="secondary">
        Dev panel for testing maintenance infrastructure — state inspection,
        local overrides, and on-demand health checks.
      </TText>

      <TSpacer size="lg" />

      <MaintenanceDebugPanel />

      <TSpacer size="xl" />
    </Screen>
  );
}
