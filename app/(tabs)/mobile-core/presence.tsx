/**
 * Presence / Lifecycle — Dev Debug Screen
 * Accessible from Mobile Core catalog in __DEV__ only.
 */

import React from "react";
import { PresenceDebugPanel } from "../../../src/ui/dev/PresenceDebugPanel";
import { Screen } from "../../../src/ui/layout/Screen";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

export default function PresenceDebugScreen() {
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
