/**
 * Push Notifications — Dev Debug Screen
 * In production builds, redirects to the catalog home.
 */

import { Redirect } from "expo-router";
import React from "react";
import { PushDebugPanel } from "../../../src/ui/dev/PushDebugPanel";
import { Screen } from "../../../src/ui/layout/Screen";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

export default function PushDebugScreen() {
  if (!__DEV__) return <Redirect href="/(tabs)/mobile-core" />;
  return (
    <Screen scrollable>
      <TSpacer size="lg" />
      <TText variant="heading">Push Notifications</TText>
      <TSpacer size="xs" />
      <TText color="secondary">
        Dev panel for testing push notification infrastructure.
      </TText>

      <TSpacer size="lg" />

      <PushDebugPanel />

      <TSpacer size="xl" />
    </Screen>
  );
}
