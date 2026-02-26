/**
 * Presence / Lifecycle — Dev Debug Screen
 * In production builds, redirects to the catalog home.
 */

import { Redirect } from "expo-router";
import React from "react";
import { PresenceDebugPanel } from "../../../src/ui/dev/PresenceDebugPanel";
import { Screen } from "../../../src/ui/layout/Screen";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

export default function PresenceDebugScreen() {
  if (!__DEV__) return <Redirect href="/(tabs)/mobile-core" />;
  return (
    <Screen scrollable>
      <TSpacer size="lg" />
      <TText variant="heading">Presence / Lifecycle</TText>
      <TSpacer size="xs" />
      <TText color="secondary">
        Dev panel for testing presence infrastructure — lifecycle state
        detection and transition logging.
      </TText>

      <TSpacer size="lg" />

      <PresenceDebugPanel />

      <TSpacer size="xl" />
    </Screen>
  );
}
