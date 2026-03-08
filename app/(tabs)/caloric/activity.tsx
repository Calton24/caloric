/**
 * Activity Monitor — Dev Debug Screen
 * In production builds, redirects to the catalog home.
 */

import { Redirect } from "expo-router";
import React from "react";
import { ActivityDebugPanel } from "../../../src/ui/dev/ActivityDebugPanel";
import { Screen } from "../../../src/ui/layout/Screen";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

export default function ActivityDebugScreen() {
  if (!__DEV__) return <Redirect href="/(tabs)/caloric" />;
  return (
    <Screen scrollable>
      <TSpacer size="lg" />
      <TText variant="heading">Activity Monitor</TText>
      <TSpacer size="xs" />
      <TText color="secondary">
        Dev panel for testing activity monitor infrastructure — start, update,
        and end in-app activities.
      </TText>

      <TSpacer size="lg" />

      <ActivityDebugPanel />

      <TSpacer size="xl" />
    </Screen>
  );
}
