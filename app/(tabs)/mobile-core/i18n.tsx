/**
 * i18n — Dev Debug Screen
 * In production builds, redirects to the catalog home.
 */

import { Redirect } from "expo-router";
import React from "react";
import { I18nDebugPanel } from "../../../src/ui/dev/I18nDebugPanel";
import { Screen } from "../../../src/ui/layout/Screen";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

export default function I18nDebugScreen() {
  if (!__DEV__) return <Redirect href="/(tabs)/mobile-core" />;
  return (
    <Screen scrollable>
      <TSpacer size="lg" />
      <TText variant="heading">Internationalisation</TText>
      <TSpacer size="xs" />
      <TText color="secondary">
        Dev panel for testing i18n infrastructure — language switching, live
        translations, and formatting.
      </TText>

      <TSpacer size="lg" />

      <I18nDebugPanel />

      <TSpacer size="xl" />
    </Screen>
  );
}
