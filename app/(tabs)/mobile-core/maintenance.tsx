/**
 * Maintenance — Dev Debug Screen
 * Accessible from Mobile Core catalog in __DEV__ only.
 */

import React from "react";
import { MaintenanceDebugPanel } from "../../../src/ui/dev/MaintenanceDebugPanel";
import { Screen } from "../../../src/ui/layout/Screen";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

export default function MaintenanceDebugScreen() {
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
