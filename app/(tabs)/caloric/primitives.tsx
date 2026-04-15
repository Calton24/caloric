/**
 * Primitives Demo Screen
 * Demonstrates: TText, TButton, TInput, TBadge, TDivider, TSpacer,
 * Skeleton, ProgressBar, Slider, Accordion, Checkbox, StarRating,
 * Avatar, HelpIcon, Header, EmptyState.
 */

import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../../src/theme/useTheme";
import { Accordion } from "../../../src/ui/components/Accordion";
import { Avatar } from "../../../src/ui/components/Avatar";
import { Checkbox, CheckboxGroup } from "../../../src/ui/components/Checkbox";
import { EmptyState } from "../../../src/ui/components/EmptyState";
import { Header } from "../../../src/ui/components/Header";
import { HelpIcon } from "../../../src/ui/components/HelpIcon";
import { ProgressBar } from "../../../src/ui/components/ProgressBar";
import { Skeleton } from "../../../src/ui/components/Skeleton";
import { Slider } from "../../../src/ui/components/Slider";
import { StarRating } from "../../../src/ui/components/StarRating";
import { useToast } from "../../../src/ui/components/Toast";
import { GlassCard } from "../../../src/ui/glass/GlassCard";
import { GlassHeader } from "../../../src/ui/patterns/GlassHeader";
import { ScreenShell } from "../../../src/ui/patterns/ScreenShell";
import { TBadge } from "../../../src/ui/primitives/TBadge";
import { TButton } from "../../../src/ui/primitives/TButton";
import { TDivider } from "../../../src/ui/primitives/TDivider";
import { TInput } from "../../../src/ui/primitives/TInput";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

export default function PrimitivesScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const toast = useToast();

  const [inputValue, setInputValue] = useState("");
  const [progressVal, setProgressVal] = useState(0.45);
  const [sliderVal, setSliderVal] = useState(0.5);
  const [accordionOpen1, setAccordionOpen1] = useState(false);
  const [accordionOpen2, setAccordionOpen2] = useState(false);
  const [starRatingVal, setStarRatingVal] = useState(3.5);
  const [checkA, setCheckA] = useState(false);
  const [checkB, setCheckB] = useState(true);
  const [checkGroup, setCheckGroup] = useState<string[]>(["notifications"]);

  // DEV-only gate — all hooks must be called before this
  if (!__DEV__) return <Redirect href="/(tabs)/caloric" />;

  return (
    <ScreenShell
      header={
        <GlassHeader
          title="Primitives"
          subtitle="Core building blocks"
          onBack={() => router.back()}
        />
      }
    >
      <TSpacer size="md" />

      {/* ── Typography ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Typography</TText>
        <TSpacer size="sm" />
        <TText variant="heading">Heading</TText>
        <TSpacer size="xs" />
        <TText variant="subheading">Subheading</TText>
        <TSpacer size="xs" />
        <TText variant="body">Body text (default)</TText>
        <TSpacer size="xs" />
        <TDivider />
        <TSpacer size="xs" />
        <TText color="secondary">Secondary text</TText>
        <TSpacer size="xs" />
        <TText color="muted">Muted text</TText>
        <TSpacer size="xs" />
        <TText variant="caption">Caption text</TText>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Buttons ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Buttons</TText>
        <TSpacer size="md" />
        <TButton onPress={() => {}}>Primary Button</TButton>
        <TSpacer size="sm" />
        <TButton onPress={() => {}} variant="secondary">
          Secondary
        </TButton>
        <TSpacer size="sm" />
        <TButton onPress={() => {}} variant="ghost">
          Ghost
        </TButton>
        <TSpacer size="sm" />
        <TButton onPress={() => {}} variant="outline">
          Outline
        </TButton>
        <TSpacer size="sm" />
        <TButton onPress={() => {}} disabled>
          Disabled
        </TButton>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Inputs ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Text Input</TText>
        <TSpacer size="md" />
        <TInput
          placeholder="Enter something..."
          value={inputValue}
          onChangeText={setInputValue}
        />
        <TSpacer size="sm" />
        <TInput
          placeholder="Error state"
          value=""
          onChangeText={() => {}}
          error="This field is required"
        />
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── TBadge ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Badge</TText>
        <TSpacer size="md" />
        <View style={s.row}>
          <TBadge label="3" tone="error" size="sm" />
          <TBadge label="NEW" tone="success" />
          <TBadge label="Beta" tone="warning" size="lg" />
          <TBadge label="Pro" tone="primary" outline />
          <TBadge label="Archived" tone="muted" />
        </View>
        <TSpacer size="md" />
        <TText color="secondary" style={{ fontSize: 13 }}>
          Dots:
        </TText>
        <TSpacer size="xs" />
        <View style={s.row}>
          <TBadge dot tone="success" />
          <TBadge dot tone="warning" />
          <TBadge dot tone="error" />
          <TBadge dot tone="info" outline />
        </View>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Header ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Header</TText>
        <TSpacer size="md" />
        <Header title="Page Title" subtitle="Optional subtitle" align="left" />
        <TSpacer size="sm" />
        <TDivider />
        <TSpacer size="sm" />
        <Header
          title="With Action"
          trailing={
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={theme.colors.text}
            />
          }
        />
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Skeleton ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Skeleton</TText>
        <TSpacer size="md" />
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Skeleton width={48} height={48} circle />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Skeleton height={14} width="60%" />
            <TSpacer size="xs" />
            <Skeleton height={10} width="40%" />
          </View>
        </View>
        <TSpacer size="md" />
        <Skeleton height={12} />
        <TSpacer size="xs" />
        <Skeleton height={12} />
        <TSpacer size="xs" />
        <Skeleton height={12} width="75%" />
        <TSpacer size="md" />
        <Skeleton height={120} borderRadius={12} />
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── EmptyState ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">EmptyState</TText>
        <TSpacer size="md" />
        <EmptyState
          title="No items yet"
          subtitle="Tap below to add your first item"
          actionLabel="Add Item"
          onAction={() => toast.show("Add tapped", "success")}
        />
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Progress Bar ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Progress Bar</TText>
        <TSpacer size="md" />
        <ProgressBar progress={progressVal} showLabel />
        <TSpacer size="md" />
        <View style={s.row}>
          <TButton
            size="sm"
            variant="outline"
            onPress={() => setProgressVal(Math.max(0, progressVal - 0.15))}
          >
            − 15%
          </TButton>
          <TButton
            size="sm"
            variant="outline"
            onPress={() => setProgressVal(Math.min(1, progressVal + 0.15))}
          >
            + 15%
          </TButton>
          <TButton size="sm" variant="ghost" onPress={() => setProgressVal(0)}>
            Reset
          </TButton>
        </View>
        <TSpacer size="lg" />
        <TText color="secondary" style={{ fontSize: 13 }}>
          Tones:
        </TText>
        <TSpacer size="xs" />
        <ProgressBar progress={0.8} tone="success" height={6} />
        <TSpacer size="xs" />
        <ProgressBar progress={0.5} tone="warning" height={6} />
        <TSpacer size="xs" />
        <ProgressBar progress={0.3} tone="error" height={6} />
        <TSpacer size="lg" />
        <TText color="secondary" style={{ fontSize: 13 }}>
          Indeterminate:
        </TText>
        <TSpacer size="xs" />
        <ProgressBar progress={0} indeterminate tone="info" />
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Slider ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Slider</TText>
        <TSpacer size="md" />
        <TText color="secondary" style={{ fontSize: 13 }}>
          Value: {Math.round(sliderVal * 100)}%
        </TText>
        <TSpacer size="sm" />
        <Slider value={sliderVal} onChange={setSliderVal} />
        <TSpacer size="lg" />
        <TText color="secondary" style={{ fontSize: 13 }}>
          Stepped (10%):
        </TText>
        <TSpacer size="sm" />
        <Slider
          value={sliderVal}
          onChange={setSliderVal}
          step={0.1}
          tone="success"
        />
        <TSpacer size="lg" />
        <TText color="secondary" style={{ fontSize: 13 }}>
          Disabled:
        </TText>
        <TSpacer size="sm" />
        <Slider value={0.6} onChange={() => {}} disabled />
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Accordion ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Accordion</TText>
        <TSpacer size="md" />
        <Accordion
          title="What is caloric?"
          subtitle="About this repo"
          icon="code-slash-outline"
          expanded={accordionOpen1}
          onToggle={setAccordionOpen1}
        >
          <TText color="secondary">
            caloric is a shared UI component library for building production
            mobile apps. Fork it, change the tokens, ship your app.
          </TText>
        </Accordion>
        <TSpacer size="sm" />
        <Accordion
          title="How do I customize the theme?"
          icon="color-palette-outline"
          expanded={accordionOpen2}
          onToggle={setAccordionOpen2}
        >
          <TText color="secondary">
            Override the brandHue in your ThemeProvider setup. All colors derive
            from that single number via the palette generator.
          </TText>
        </Accordion>
        <TSpacer size="sm" />
        <Accordion title="Disabled accordion" disabled>
          <TText>You should not see this.</TText>
        </Accordion>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── StarRating ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Star Rating</TText>
        <TSpacer size="sm" />
        <TText color="muted" style={{ marginBottom: 8 }}>
          Interactive (half-star)
        </TText>
        <StarRating
          rating={starRatingVal}
          onChange={setStarRatingVal}
          showLabel
          size="lg"
        />
        <TSpacer size="md" />
        <TText color="muted" style={{ marginBottom: 8 }}>
          Read-only sizes
        </TText>
        <View style={{ gap: 8 }}>
          <StarRating rating={4.5} size="sm" showLabel />
          <StarRating rating={3} size="md" showLabel />
          <StarRating rating={2.5} size="lg" showLabel />
        </View>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Avatar ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Avatar</TText>
        <TSpacer size="md" />
        <TText variant="subheading" color="secondary">
          Sizes
        </TText>
        <TSpacer size="sm" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar size="xs" name="Alice" />
          <Avatar size="sm" name="Bob Chen" />
          <Avatar size="md" name="Charlie" />
          <Avatar size="lg" name="Diana Ross" />
          <Avatar size="xl" name="Eve" />
        </View>
        <TSpacer size="md" />
        <TText variant="subheading" color="secondary">
          Status badges
        </TText>
        <TSpacer size="sm" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar size="lg" name="Online" status="online" />
          <Avatar size="lg" name="Away" status="away" />
          <Avatar size="lg" name="Busy" status="busy" />
          <Avatar size="lg" name="Offline" status="offline" />
        </View>
        <TSpacer size="md" />
        <TText variant="subheading" color="secondary">
          Variants
        </TText>
        <TSpacer size="sm" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Avatar size="lg" name="Bordered" bordered />
          <Avatar size="lg" />
          <Avatar
            size="lg"
            source="https://i.pravatar.cc/150?img=3"
            name="Image"
            bordered
            status="online"
          />
        </View>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── HelpIcon ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Help Icon</TText>
        <TSpacer size="md" />
        <TText variant="subheading" color="secondary">
          Outline (default)
        </TText>
        <TSpacer size="sm" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <HelpIcon
            size="sm"
            onPress={() => toast.show("Small help", "info")}
          />
          <HelpIcon
            size="md"
            onPress={() => toast.show("Medium help", "info")}
          />
          <HelpIcon
            size="lg"
            onPress={() => toast.show("Large help", "info")}
          />
        </View>
        <TSpacer size="md" />
        <TText variant="subheading" color="secondary">
          Filled
        </TText>
        <TSpacer size="sm" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <HelpIcon
            variant="filled"
            size="sm"
            onPress={() => toast.show("Filled sm", "info")}
          />
          <HelpIcon
            variant="filled"
            size="md"
            onPress={() => toast.show("Filled md", "info")}
          />
          <HelpIcon
            variant="filled"
            size="lg"
            onPress={() => toast.show("Filled lg", "info")}
          />
        </View>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Checkbox ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Checkbox</TText>
        <TSpacer size="sm" />
        <Checkbox
          checked={checkA}
          onChange={setCheckA}
          label="Accept terms & conditions"
        />
        <Checkbox
          checked={checkB}
          onChange={setCheckB}
          label="Subscribe to newsletter"
          description="We'll send you weekly updates"
        />
        <Checkbox
          checked={false}
          onChange={() => {}}
          label="Disabled option"
          disabled
        />
        <TSpacer size="md" />
        <TText variant="subheading">Checkbox Group</TText>
        <TSpacer size="xs" />
        <CheckboxGroup
          value={checkGroup}
          onChange={setCheckGroup}
          options={[
            { value: "notifications", label: "Push Notifications" },
            { value: "emails", label: "Email Updates" },
            { value: "sms", label: "SMS Alerts" },
          ]}
        />
      </GlassCard>

      <TSpacer size="xxl" />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  section: { padding: 16 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
});
