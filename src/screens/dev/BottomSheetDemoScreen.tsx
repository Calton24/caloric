/**
 * BottomSheetDemoScreen
 * Demonstrates bottom sheet functionality
 */

import React from "react";
import { View } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { GlassCard } from "../../ui/glass/GlassCard";
import { Screen } from "../../ui/layout/Screen";
import { TButton } from "../../ui/primitives/TButton";
import { TInput } from "../../ui/primitives/TInput";
import { TSpacer } from "../../ui/primitives/TSpacer";
import { TText } from "../../ui/primitives/TText";
import { useBottomSheet } from "../../ui/sheets/useBottomSheet";

export function BottomSheetDemoScreen() {
  const { theme } = useTheme();
  const { open: openSheet } = useBottomSheet();

  const openSimpleSheet = () => {
    openSheet(
      <View style={{ padding: theme.spacing.md }}>
        <TText variant="heading" style={{ marginBottom: theme.spacing.md }}>
          Simple Sheet
        </TText>
        <TText
          variant="body"
          style={{
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.base,
            marginBottom: theme.spacing.md,
          }}
        >
          This is a simple bottom sheet with some content. You can put any React
          components here.
        </TText>
        <TButton onPress={() => {}}>Action Button</TButton>
      </View>,
      {
        snapPoints: [300],
      }
    );
  };

  const openFormSheet = () => {
    openSheet(
      <View style={{ padding: theme.spacing.md }}>
        <TText variant="heading" style={{ marginBottom: theme.spacing.md }}>
          Form Sheet
        </TText>
        <TInput placeholder="Enter your name" />
        <TSpacer size="md" />
        <TInput placeholder="Enter your email" keyboardType="email-address" />
        <TSpacer size="md" />
        <TInput
          placeholder="Enter message"
          multiline
          numberOfLines={4}
          style={{ height: 100, textAlignVertical: "top" }}
        />
        <TSpacer size="lg" />
        <TButton onPress={() => {}}>Submit</TButton>
      </View>,
      {
        snapPoints: [450],
      }
    );
  };

  const openTallSheet = () => {
    openSheet(
      <View style={{ padding: theme.spacing.md }}>
        <TText variant="heading" style={{ marginBottom: theme.spacing.md }}>
          Tall Sheet
        </TText>
        <TText
          color="secondary"
          style={{ fontSize: theme.typography.fontSize.sm }}
        >
          This sheet takes up more vertical space. You can scroll the content if
          it exceeds the sheet height.
        </TText>
        <TSpacer size="md" />
        {Array.from({ length: 10 }, (_, i) => (
          <View key={i}>
            <GlassCard padding="md">
              <TText>Item {i + 1}</TText>
            </GlassCard>
            <TSpacer size="sm" />
          </View>
        ))}
      </View>,
      {
        snapPoints: [600],
      }
    );
  };

  const openAutoSheet = () => {
    openSheet(
      <View style={{ padding: theme.spacing.md }}>
        <TText variant="heading" style={{ marginBottom: theme.spacing.md }}>
          Auto Height
        </TText>
        <TText
          color="secondary"
          style={{ fontSize: theme.typography.fontSize.sm }}
        >
          This sheet automatically sizes to its content. Great for dynamic
          content that may vary in height.
        </TText>
        <TSpacer size="md" />
        <TButton onPress={() => {}}>Got it!</TButton>
      </View>,
      {
        snapPoints: ["85%"],
      }
    );
  };

  return (
    <Screen scrollable>
      <TSpacer size="lg" />

      <TText variant="heading" style={{ color: theme.colors.text }}>
        Bottom Sheet Demo
      </TText>

      <TSpacer size="xl" />

      <GlassCard>
        <TText
          variant="subheading"
          style={{
            color: theme.colors.text,
            marginBottom: theme.spacing.sm,
          }}
        >
          Basic Sheet
        </TText>
        <TText
          color="secondary"
          style={{
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.md,
          }}
        >
          A simple bottom sheet with text and a button
        </TText>
        <TButton onPress={openSimpleSheet}>Open Simple Sheet</TButton>
      </GlassCard>

      <TSpacer size="md" />

      <GlassCard>
        <TText
          variant="subheading"
          style={{
            color: theme.colors.text,
            marginBottom: theme.spacing.sm,
          }}
        >
          Form Sheet
        </TText>
        <TText
          color="secondary"
          style={{
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.md,
          }}
        >
          A sheet containing form inputs
        </TText>
        <TButton onPress={openFormSheet}>Open Form Sheet</TButton>
      </GlassCard>

      <TSpacer size="md" />

      <GlassCard>
        <TText
          variant="subheading"
          style={{
            color: theme.colors.text,
            marginBottom: theme.spacing.sm,
          }}
        >
          Tall Sheet
        </TText>
        <TText
          color="secondary"
          style={{
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.md,
          }}
        >
          A taller sheet with scrollable content
        </TText>
        <TButton onPress={openTallSheet}>Open Tall Sheet</TButton>
      </GlassCard>

      <TSpacer size="md" />

      <GlassCard>
        <TText
          variant="subheading"
          style={{
            color: theme.colors.text,
            marginBottom: theme.spacing.sm,
          }}
        >
          Auto Height
        </TText>
        <TText
          color="secondary"
          style={{
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.md,
          }}
        >
          Sheet that sizes to its content automatically
        </TText>
        <TButton onPress={openAutoSheet}>Open Auto Sheet</TButton>
      </GlassCard>

      <TSpacer size="lg" />

      <GlassCard>
        <TText
          color="secondary"
          style={{ fontSize: theme.typography.fontSize.sm }}
        >
          💡 Tip: You can dismiss sheets by tapping the backdrop, using the
          close button, or swiping down (on supported devices).
        </TText>
      </GlassCard>

      <TSpacer size="xxl" />
    </Screen>
  );
}
