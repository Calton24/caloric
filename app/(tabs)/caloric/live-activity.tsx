/**
 * Live Activities — Dev Debug Screen
 * In production builds, redirects to the catalog home.
 */

import { Redirect } from "expo-router";
import React from "react";
import { CalorieBudgetActivityDebugPanel } from "../../../src/ui/dev/CalorieBudgetActivityDebugPanel";
import { FitnessActivityDebugPanel } from "../../../src/ui/dev/FitnessActivityDebugPanel";
import { LiveActivityDebugPanel } from "../../../src/ui/dev/LiveActivityDebugPanel";
import { LiveActivityLifecyclePanel } from "../../../src/ui/dev/LiveActivityLifecyclePanel";
import { PedometerActivityDebugPanel } from "../../../src/ui/dev/PedometerActivityDebugPanel";
import { Screen } from "../../../src/ui/layout/Screen";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

export default function LiveActivityDebugScreen() {
  if (!__DEV__) return <Redirect href="/(tabs)/caloric" />;

  return (
    <Screen scrollable>
      <TSpacer size="lg" />
      <TText variant="heading">Live Activities</TText>
      <TSpacer size="xs" />
      <TText color="secondary">
        Dev panel for testing Live Activities via native ActivityKit. Activities
        appear in the Dynamic Island and Lock Screen. Requires iOS dev build.
      </TText>

      <TSpacer size="lg" />

      <LiveActivityDebugPanel />

      <TSpacer size="lg" />

      <FitnessActivityDebugPanel />

      <TSpacer size="lg" />

      <PedometerActivityDebugPanel />

      <TSpacer size="lg" />

      <CalorieBudgetActivityDebugPanel />

      <TSpacer size="lg" />

      <LiveActivityLifecyclePanel />

      <TSpacer size="xl" />
    </Screen>
  );
}
