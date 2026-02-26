/**
 * Growth Layer - Catalog Demo
 * In production builds, redirects to the catalog home.
 */

import { Redirect } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useTheme } from "../../../src/theme/useTheme";
import { GlassCard } from "../../../src/ui/glass/GlassCard";
import { FeatureRequestSheet } from "../../../src/ui/growth/FeatureRequestSheet";
import { Screen } from "../../../src/ui/layout/Screen";
import { TButton } from "../../../src/ui/primitives/TButton";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";
import { useBottomSheet } from "../../../src/ui/sheets/useBottomSheet";

export default function GrowthLayerScreen() {
  const { theme } = useTheme();
  const { open } = useBottomSheet();

  // DEV-only gate — all hooks must be called before this
  if (!__DEV__) return <Redirect href="/(tabs)/mobile-core" />;

  const openSheet = () => {
    open(<FeatureRequestSheet />, {
      snapPoints: ["85%"],
    });
  };

  return (
    <Screen scrollable>
      <TSpacer size="lg" />
      <TText variant="heading">Growth Layer</TText>
      <TSpacer size="xs" />
      <TText color="secondary">
        Lightweight feedback loop for feature requests and milestone tracking.
      </TText>

      <TSpacer size="lg" />

      <GlassCard>
        <TText variant="subheading" style={{ marginBottom: theme.spacing.xs }}>
          Feature requests
        </TText>
        <TText color="muted" style={{ marginBottom: theme.spacing.md }}>
          Collect short, structured requests without a full survey engine.
        </TText>
        <View>
          <TButton onPress={openSheet}>Open Feature Request Sheet</TButton>
        </View>
      </GlassCard>

      <TSpacer size="xl" />
    </Screen>
  );
}
