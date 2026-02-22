/**
 * ThemeDemoScreen
 * Demonstrates theme system and customization
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { GlassCard } from "../../ui/glass/GlassCard";
import { Screen } from "../../ui/layout/Screen";
import { TButton } from "../../ui/primitives/TButton";
import { TDivider } from "../../ui/primitives/TDivider";
import { TSpacer } from "../../ui/primitives/TSpacer";
import { TText } from "../../ui/primitives/TText";

export function ThemeDemoScreen() {
  const { theme, toggleMode, setBrandHue } = useTheme();

  const testHues = [
    { name: "Blue", hue: 220 },
    { name: "Purple", hue: 270 },
    { name: "Pink", hue: 330 },
    { name: "Red", hue: 0 },
    { name: "Orange", hue: 30 },
    { name: "Green", hue: 140 },
  ];

  return (
    <Screen scrollable>
      <TSpacer size="lg" />

      <TText variant="heading" style={{ color: theme.colors.text }}>
        Theme Demo
      </TText>

      <TSpacer size="xl" />

      {/* Color Mode Toggle */}
      <GlassCard>
        <TText
          variant="subheading"
          style={{
            color: theme.colors.text,
            marginBottom: theme.spacing.sm,
          }}
        >
          Color Mode
        </TText>
        <TText
          color="secondary"
          style={{
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.md,
          }}
        >
          Current: {theme.mode === "light" ? "Light" : "Dark"}
        </TText>
        <TButton onPress={toggleMode}>
          {`Toggle ${theme.mode === "light" ? "Dark" : "Light"} Mode`}
        </TButton>
      </GlassCard>

      <TSpacer size="md" />

      {/* Brand Colors */}
      <GlassCard>
        <TText
          variant="subheading"
          style={{
            color: theme.colors.text,
            marginBottom: theme.spacing.sm,
          }}
        >
          Brand Colors
        </TText>
        <TText
          color="secondary"
          style={{
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.md,
          }}
        >
          Tap to change brand hue
        </TText>
        <View style={styles.colorGrid}>
          {testHues.map((item) => (
            <TButton
              key={item.hue}
              onPress={() => setBrandHue(item.hue)}
              size="sm"
              variant={theme.brandHue === item.hue ? "primary" : "outline"}
              style={styles.colorButton}
            >
              {item.name}
            </TButton>
          ))}
        </View>
      </GlassCard>

      <TSpacer size="md" />

      {/* Typography Examples */}
      <GlassCard>
        <TText
          variant="subheading"
          style={{
            color: theme.colors.text,
            marginBottom: theme.spacing.md,
          }}
        >
          Typography
        </TText>
        <TText variant="heading">Heading Text</TText>
        <TSpacer size="sm" />
        <TText variant="subheading">Subheading Text</TText>
        <TSpacer size="sm" />
        <TText variant="body">Body Text - Default</TText>
        <TSpacer size="sm" />
        <TText variant="caption" color="secondary">
          Caption Text - Secondary
        </TText>
      </GlassCard>

      <TSpacer size="md" />

      {/* Button Variants */}
      <GlassCard>
        <TText
          variant="subheading"
          style={{
            color: theme.colors.text,
            marginBottom: theme.spacing.md,
          }}
        >
          Buttons
        </TText>
        <TButton onPress={() => {}}>Primary Button</TButton>
        <TSpacer size="sm" />
        <TButton variant="secondary" onPress={() => {}}>
          Secondary Button
        </TButton>
        <TSpacer size="sm" />
        <TButton variant="outline" onPress={() => {}}>
          Outline Button
        </TButton>
        <TSpacer size="sm" />
        <TButton variant="ghost" onPress={() => {}}>
          Ghost Button
        </TButton>
      </GlassCard>

      <TSpacer size="md" />

      {/* Colors Palette */}
      <GlassCard>
        <TText
          variant="subheading"
          style={{
            color: theme.colors.text,
            marginBottom: theme.spacing.md,
          }}
        >
          Color Tokens
        </TText>
        {[
          { label: "Primary", color: theme.colors.primary },
          { label: "Success", color: theme.colors.success },
          { label: "Warning", color: theme.colors.warning },
          { label: "Error", color: theme.colors.error },
          { label: "Info", color: theme.colors.info },
        ].map((item) => (
          <View key={item.label}>
            <View style={styles.colorRow}>
              <View
                style={[
                  styles.colorSwatch,
                  {
                    backgroundColor: item.color,
                    borderRadius: theme.radius.sm,
                  },
                ]}
              />
              <TText style={{ fontSize: theme.typography.fontSize.sm }}>
                {item.label}
              </TText>
            </View>
            <TSpacer size="xs" />
          </View>
        ))}
      </GlassCard>

      <TSpacer size="md" />

      {/* Divider Demo */}
      <GlassCard>
        <TText variant="subheading" style={{ color: theme.colors.text }}>
          Dividers
        </TText>
        <TSpacer size="md" />
        <TDivider />
        <TSpacer size="md" />
        <TText color="secondary">Content separated by divider</TText>
      </GlassCard>

      <TSpacer size="xxl" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  colorButton: {
    minWidth: 100,
  },
  colorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  colorSwatch: {
    width: 32,
    height: 32,
  },
});
