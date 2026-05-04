/**
 * Maintenance — Dev Debug Screen
 * Accessible from Caloric catalog in __DEV__ only.
 * In production builds, redirects to the catalog home.
 */

import { Redirect } from "expo-router";
import React from "react";
import { Button, View } from "react-native";
import { reportError } from "../../../src/infrastructure/errorReporting";
import { MaintenanceDebugPanel } from "../../../src/ui/dev/MaintenanceDebugPanel";
import { Screen } from "../../../src/ui/layout/Screen";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

declare global {
  var __triggerSentryTestError: (() => void) | undefined;
}

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

      {__DEV__ && (
        <>
          <TSpacer size="lg" />
          <TText variant="caption" color="secondary">
            Developer Tools
          </TText>
          <TSpacer size="xs" />
          <View>
            <Button
              title="Trigger Sentry Test Error"
              onPress={() => globalThis.__triggerSentryTestError?.()}
            />
            <TSpacer size="xs" />
            <Button
              title="Trigger reportError Test"
              onPress={() =>
                reportError(new Error("reportError test"), {
                  area: "dev",
                  action: "manual_trigger",
                  screen: "maintenance",
                  extra: {
                    imageUri: "file://test-image.jpg",
                    token: "secret-token-123",
                    safeValue: "visible-test",
                  },
                })
              }
            />
          </View>
        </>
      )}

      <TSpacer size="xl" />
    </Screen>
  );
}
