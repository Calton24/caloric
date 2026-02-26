/**
 * Glass Widgets Demo Screen
 * Demonstrates: GlassSurface, GlassCard, GlassIconButton, GlassTogglePill,
 * GlassSliderVertical, GlassSegmentedControl, GlassStatusChip, GlassMiniCard,
 * GlassSearch, Theme System, Bottom Sheets, Modals.
 */

import { Redirect, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Dimensions, StyleSheet, Switch, View } from "react-native";
import { useTheme } from "../../../src/theme/useTheme";
import { useNotificationToast } from "../../../src/ui/components/NotificationToast";
import { useToast } from "../../../src/ui/components/Toast";
import { GlassCard } from "../../../src/ui/glass/GlassCard";
import { GlassIconButton } from "../../../src/ui/glass/GlassIconButton";
import { GlassMiniCard } from "../../../src/ui/glass/GlassMiniCard";
import { GlassSearchMinimal } from "../../../src/ui/glass/GlassSearchMinimal";
import { GlassSegmentedControl } from "../../../src/ui/glass/GlassSegmentedControl";
import { GlassSliderVertical } from "../../../src/ui/glass/GlassSliderVertical";
import { GlassStatusChip } from "../../../src/ui/glass/GlassStatusChip";
import { GlassSurface } from "../../../src/ui/glass/GlassSurface";
import { GlassTogglePill } from "../../../src/ui/glass/GlassTogglePill";
import {
    showActionSheet,
    showAlert,
    showConfirm,
    showCustomModal,
} from "../../../src/ui/modals/ModalHelpers";
import { GlassHeader } from "../../../src/ui/patterns/GlassHeader";
import { ScreenShell } from "../../../src/ui/patterns/ScreenShell";
import { ColorPickerSheet } from "../../../src/ui/primitives/ColorPickerSheet";
import { TButton } from "../../../src/ui/primitives/TButton";
import { TInput } from "../../../src/ui/primitives/TInput";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";
import { openSnappableSheet } from "../../../src/ui/sheets/SnappableSheet";
import { useBottomSheet } from "../../../src/ui/sheets/useBottomSheet";

export default function GlassScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const sheet = useBottomSheet();
  const { open } = sheet;
  const toast = useToast();
  const notification = useNotificationToast();

  // Knob state
  const [glassEnabled, setGlassEnabled] = useState(true);
  const [blurIntensity, setBlurIntensity] = useState<
    "light" | "medium" | "strong"
  >("medium");
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const [glassTint, setGlassTint] = useState<"light" | "dark" | "default">(
    "default"
  );
  const [glassIntensityNum, setGlassIntensityNum] = useState(80);

  // Widget state
  const [focusActive, setFocusActive] = useState(false);
  const [rotationLock, setRotationLock] = useState(true);
  const [brightnessVal, setBrightnessVal] = useState(0.6);
  const [volumeVal, setVolumeVal] = useState(0.4);
  const [segmentValue, setSegmentValue] = useState("default");
  const [activeIcons, setActiveIcons] = useState<Record<string, boolean>>({
    flashlight: false,
    timer: false,
    camera: false,
    calculator: false,
  });
  const [searchText, setSearchText] = useState("");

  // Sheet helpers
  const screenHeight = Dimensions.get("window").height;
  const snapPoints = useMemo(
    () => ({
      mini: Math.max(150, screenHeight * 0.15),
      small: Math.max(280, screenHeight * 0.32),
    }),
    [screenHeight]
  );

  // DEV-only gate — all hooks must be called before this
  if (!__DEV__) return <Redirect href="/(tabs)/mobile-core" />;

  const SheetContent = ({ title }: { title: string }) => (
    <View style={{ padding: theme.spacing.lg }}>
      <TText variant="heading">{title}</TText>
      <TSpacer size="md" />
      <TText>
        Testing {title.toLowerCase()} bottom sheet with glass background.
      </TText>
      <TSpacer size="md" />
      <TButton onPress={() => console.log(`${title} button tapped`)}>
        Test Button
      </TButton>
    </View>
  );

  return (
    <ScreenShell
      header={
        <GlassHeader
          title="Glass Widgets"
          subtitle="Liquid glass components"
          onBack={() => router.back()}
        />
      }
    >
      <TSpacer size="md" />

      {/* ── Knobs ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Knobs</TText>
        <TSpacer size="md" />
        <View style={s.knobRow}>
          <TText>Glass Enabled</TText>
          <Switch
            value={glassEnabled}
            onValueChange={setGlassEnabled}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
          />
        </View>
        <TSpacer size="sm" />
        <TText color="secondary">Blur Intensity</TText>
        <TSpacer size="xs" />
        <View style={s.knobRow}>
          {(["light", "medium", "strong"] as const).map((level) => (
            <TButton
              key={level}
              variant={blurIntensity === level ? "primary" : "outline"}
              size="sm"
              onPress={() => setBlurIntensity(level)}
            >
              {level}
            </TButton>
          ))}
        </View>
        <TSpacer size="md" />
        {glassEnabled ? (
          <GlassSurface intensity={blurIntensity} style={s.glassSample}>
            <TText>Glass Preview ({blurIntensity})</TText>
          </GlassSurface>
        ) : (
          <View
            style={[s.glassSample, { backgroundColor: theme.colors.surface }]}
          >
            <TText>Glass Disabled (solid surface)</TText>
          </View>
        )}
        <TSpacer size="md" />
        <View style={s.knobRow}>
          <TText>Reduce Transparency</TText>
          <Switch
            value={reduceTransparency}
            onValueChange={setReduceTransparency}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
          />
        </View>
        <TSpacer size="sm" />
        <TText color="secondary">Tint</TText>
        <TSpacer size="xs" />
        <GlassSegmentedControl
          options={[
            { key: "default", label: "Default" },
            { key: "light", label: "Light" },
            { key: "dark", label: "Dark" },
          ]}
          value={glassTint}
          onChange={(k) => setGlassTint(k as "light" | "dark" | "default")}
          blurEnabled={glassEnabled}
          reduceTransparency={reduceTransparency}
        />
        <TSpacer size="sm" />
        <TText color="secondary">Numeric Intensity: {glassIntensityNum}</TText>
        <TSpacer size="xs" />
        <View style={s.knobRow}>
          {[30, 50, 80, 100].map((n) => (
            <TButton
              key={n}
              variant={glassIntensityNum === n ? "primary" : "outline"}
              size="sm"
              onPress={() => setGlassIntensityNum(n)}
            >
              {String(n)}
            </TButton>
          ))}
        </View>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── GlassIconButton ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">GlassIconButton</TText>
        <TSpacer size="sm" />
        <TText color="secondary" style={{ fontSize: 13 }}>
          Tap to toggle
        </TText>
        <TSpacer size="md" />
        <View style={s.iconGrid}>
          {[
            { key: "flashlight", icon: "flashlight" as const },
            { key: "timer", icon: "timer-outline" as const },
            { key: "camera", icon: "camera-outline" as const },
            { key: "calculator", icon: "calculator-outline" as const },
          ].map(({ key, icon }) => (
            <GlassIconButton
              key={key}
              icon={icon}
              active={activeIcons[key]}
              onPress={() => setActiveIcons((p) => ({ ...p, [key]: !p[key] }))}
              accessibilityLabel={key}
              blurEnabled={glassEnabled}
              reduceTransparency={reduceTransparency}
              intensity={glassIntensityNum}
              tint={glassTint}
            />
          ))}
        </View>
        <TSpacer size="md" />
        <TText color="secondary" style={{ fontSize: 13 }}>
          Sizes: sm / md / lg
        </TText>
        <TSpacer size="sm" />
        <View style={[s.iconGrid, { gap: 12 }]}>
          {(["sm", "md", "lg"] as const).map((sz) => (
            <GlassIconButton
              key={sz}
              icon="star"
              size={sz}
              onPress={() => {}}
              accessibilityLabel={`${sz} icon`}
              blurEnabled={glassEnabled}
              reduceTransparency={reduceTransparency}
              intensity={glassIntensityNum}
              tint={glassTint}
            />
          ))}
        </View>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── GlassTogglePill ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">GlassTogglePill</TText>
        <TSpacer size="md" />
        <GlassTogglePill
          leadingIcon="moon"
          label="Focus"
          mode="mixed"
          value={focusActive}
          onToggle={() => setFocusActive((v) => !v)}
          onPressMenu={() => toast.show("Focus menu opened", "info")}
          blurEnabled={glassEnabled}
          reduceTransparency={reduceTransparency}
          intensity={glassIntensityNum}
          tint={glassTint}
        />
        <TSpacer size="sm" />
        <GlassTogglePill
          leadingIcon="lock-closed"
          label="Rotation Lock"
          mode="toggle"
          value={rotationLock}
          onToggle={() => setRotationLock((v) => !v)}
          blurEnabled={glassEnabled}
          reduceTransparency={reduceTransparency}
          intensity={glassIntensityNum}
          tint={glassTint}
        />
        <TSpacer size="sm" />
        <GlassTogglePill
          leadingIcon="musical-notes"
          label="Now Playing"
          mode="menu"
          onPressMenu={() => toast.show("Now Playing menu", "info")}
          blurEnabled={glassEnabled}
          reduceTransparency={reduceTransparency}
          intensity={glassIntensityNum}
          tint={glassTint}
        />
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── GlassSliderVertical ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">GlassSliderVertical</TText>
        <TSpacer size="md" />
        <View
          style={{ flexDirection: "row", justifyContent: "center", gap: 20 }}
        >
          <GlassSliderVertical
            value={brightnessVal}
            onChange={setBrightnessVal}
            icon="sunny"
            accessibilityLabel="Brightness"
            blurEnabled={glassEnabled}
            reduceTransparency={reduceTransparency}
            intensity={glassIntensityNum}
            tint={glassTint}
          />
          <GlassSliderVertical
            value={volumeVal}
            onChange={setVolumeVal}
            icon="volume-medium"
            step={0.1}
            accessibilityLabel="Volume"
            blurEnabled={glassEnabled}
            reduceTransparency={reduceTransparency}
            intensity={glassIntensityNum}
            tint={glassTint}
          />
        </View>
        <TSpacer size="sm" />
        <TText color="secondary" style={{ fontSize: 12, textAlign: "center" }}>
          Brightness: {Math.round(brightnessVal * 100)}% · Volume:{" "}
          {Math.round(volumeVal * 100)}%
        </TText>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── GlassSegmentedControl ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">GlassSegmentedControl</TText>
        <TSpacer size="md" />
        <GlassSegmentedControl
          options={[
            { key: "all", label: "All", icon: "grid-outline" },
            { key: "active", label: "Active" },
            { key: "done", label: "Done", icon: "checkmark-outline" },
          ]}
          value={segmentValue}
          onChange={setSegmentValue}
          blurEnabled={glassEnabled}
          reduceTransparency={reduceTransparency}
          intensity={glassIntensityNum}
          tint={glassTint}
        />
        <TSpacer size="sm" />
        <TText color="secondary" style={{ fontSize: 12, textAlign: "center" }}>
          Selected: {segmentValue}
        </TText>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── GlassStatusChip ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">GlassStatusChip</TText>
        <TSpacer size="md" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <GlassStatusChip
            label="Connected"
            tone="success"
            blurEnabled={glassEnabled}
            reduceTransparency={reduceTransparency}
            intensity={glassIntensityNum}
            tint={glassTint}
          />
          <GlassStatusChip
            label="Syncing…"
            tone="warning"
            blurEnabled={glassEnabled}
            reduceTransparency={reduceTransparency}
            intensity={glassIntensityNum}
            tint={glassTint}
          />
          <GlassStatusChip
            label="Offline"
            tone="danger"
            blurEnabled={glassEnabled}
            reduceTransparency={reduceTransparency}
            intensity={glassIntensityNum}
            tint={glassTint}
          />
          <GlassStatusChip
            label="3 items"
            tone="neutral"
            icon="layers-outline"
            blurEnabled={glassEnabled}
            reduceTransparency={reduceTransparency}
            intensity={glassIntensityNum}
            tint={glassTint}
          />
        </View>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── GlassMiniCard ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">GlassMiniCard</TText>
        <TSpacer size="md" />
        <View style={{ flexDirection: "row", gap: 12 }}>
          <GlassMiniCard
            title="Revenue"
            value="$12.4k"
            delta="+12%"
            subtitle="vs last month"
            icon="trending-up"
            blurEnabled={glassEnabled}
            reduceTransparency={reduceTransparency}
            intensity={glassIntensityNum}
            tint={glassTint}
            style={{ flex: 1 }}
          />
          <GlassMiniCard
            title="Users"
            value="842"
            delta="-3%"
            subtitle="active today"
            icon="people-outline"
            blurEnabled={glassEnabled}
            reduceTransparency={reduceTransparency}
            intensity={glassIntensityNum}
            tint={glassTint}
            style={{ flex: 1 }}
          />
        </View>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── GlassSearchMinimal ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">GlassSearchMinimal</TText>
        <TSpacer size="xs" />
        <TText color="muted">No cancel button — for inline use</TText>
        <TSpacer size="sm" />
        <GlassSearchMinimal
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Filter…"
          onSubmit={(t) => toast.show(`Filtered: ${t}`, "info")}
        />
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Glass Components ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Glass Surfaces</TText>
        <TSpacer size="md" />
        <GlassSurface intensity="light" style={s.glassSample}>
          <TText>Light Glass</TText>
        </GlassSurface>
        <TSpacer size="sm" />
        <GlassSurface intensity="medium" style={s.glassSample}>
          <TText>Medium Glass</TText>
        </GlassSurface>
        <TSpacer size="sm" />
        <GlassSurface intensity="strong" style={s.glassSample}>
          <TText>Strong Glass</TText>
        </GlassSurface>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Bottom Sheets ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Bottom Sheet Sizes</TText>
        <TSpacer size="md" />
        <TButton
          onPress={() =>
            open(<SheetContent title="Small Sheet" />, {
              snapPoints: [snapPoints.small],
            })
          }
        >
          Small Sheet
        </TButton>
        <TSpacer size="sm" />
        <TButton
          onPress={() =>
            open(<SheetContent title="Regular Sheet" />, {
              snapPoints: [Math.max(500, screenHeight * 0.7)],
            })
          }
        >
          Regular Sheet (70%)
        </TButton>
        <TSpacer size="sm" />
        <TButton
          onPress={() =>
            open(<SheetContent title="Large Sheet" />, {
              snapPoints: [Math.max(600, screenHeight * 0.85)],
            })
          }
        >
          Large Sheet (90%)
        </TButton>
        <TSpacer size="sm" />
        <TButton
          onPress={() =>
            open(<SheetContent title="Mini Sheet" />, {
              snapPoints: [snapPoints.mini],
            })
          }
        >
          Mini Sheet
        </TButton>
        <TSpacer size="lg" />
        <TText color="secondary" style={{ fontSize: 14 }}>
          Snappable:
        </TText>
        <TSpacer size="sm" />
        <TButton
          variant="secondary"
          onPress={() =>
            openSnappableSheet(
              open,
              <View style={{ padding: theme.spacing.lg }}>
                <TText variant="heading">Snappable Sheet</TText>
                <TSpacer size="md" />
                <TText>Drag between 40% and 70%</TText>
              </View>,
              [40, 70],
              [280, 400]
            )
          }
        >
          Snappable Sheet
        </TButton>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Modals ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Modals</TText>
        <TSpacer size="md" />
        <TButton
          onPress={() =>
            showAlert(sheet, {
              title: "Success!",
              message: "Your action was completed.",
              confirmText: "Got it",
              onConfirm: () => {},
            })
          }
        >
          Alert Modal
        </TButton>
        <TSpacer size="sm" />
        <TButton
          variant="secondary"
          onPress={() =>
            showConfirm(sheet, {
              title: "Delete Item?",
              message: "This action cannot be undone.",
              confirmText: "Delete",
              cancelText: "Cancel",
              onConfirm: () => {},
              onCancel: () => {},
            })
          }
        >
          Confirm Modal
        </TButton>
        <TSpacer size="sm" />
        <TButton
          variant="outline"
          onPress={() =>
            showActionSheet(sheet, {
              title: "Choose an action",
              message: "Select one of the options below",
              options: [
                { label: "Edit", onPress: () => {} },
                { label: "Share", onPress: () => {} },
                {
                  label: "Delete",
                  onPress: () => {},
                  variant: "destructive" as const,
                },
              ],
            })
          }
        >
          Action Sheet
        </TButton>
        <TSpacer size="sm" />
        <TButton
          variant="ghost"
          onPress={() =>
            showCustomModal(
              sheet,
              <View style={{ padding: theme.spacing.lg }}>
                <TText variant="heading">Custom Modal</TText>
                <TSpacer size="md" />
                <TInput placeholder="Enter something..." />
                <TSpacer size="lg" />
                <TButton onPress={() => sheet.close()}>Close</TButton>
              </View>,
              45,
              300
            )
          }
        >
          Custom Modal
        </TButton>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Notification and Bottom Toast ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Toasts & Notifications</TText>
        <TSpacer size="md" />
        <TButton
          onPress={() =>
            notification.show({
              title: "New Message",
              body: "Hey! Check out the new features.",
              icon: "chatbubble-ellipses",
            })
          }
        >
          Notification Toast
        </TButton>
        <TSpacer size="sm" />
        <TButton
          variant="secondary"
          onPress={() =>
            notification.show({
              title: "Payment Received",
              body: "$42.00 from Alex Johnson",
              avatarUri: "https://i.pravatar.cc/150?img=5",
            })
          }
        >
          With Avatar
        </TButton>
        <TSpacer size="lg" />
        <TText color="secondary" style={{ fontSize: 14 }}>
          Bottom toasts:
        </TText>
        <TSpacer size="sm" />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <TButton size="sm" onPress={() => toast.show("Success", "success")}>
            Success
          </TButton>
          <TButton
            size="sm"
            variant="secondary"
            onPress={() => toast.show("Error", "error")}
          >
            Error
          </TButton>
          <TButton
            size="sm"
            variant="outline"
            onPress={() => toast.show("Info", "info")}
          >
            Info
          </TButton>
          <TButton
            size="sm"
            variant="ghost"
            onPress={() => toast.show("Warning", "warning")}
          >
            Warning
          </TButton>
        </View>
      </GlassCard>

      <TSpacer size="lg" />

      {/* ── Color Wheel ── */}
      <GlassCard style={s.section}>
        <TText variant="heading">Theme System</TText>
        <TSpacer size="md" />
        <TText color="secondary">Current mode: {theme.mode}</TText>
        <TSpacer size="md" />
        <TButton
          onPress={() => open(<ColorPickerSheet />, { snapPoints: ["85%"] })}
          variant="outline"
        >
          Open Color Wheel
        </TButton>
      </GlassCard>

      <TSpacer size="xxl" />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  section: { padding: 16 },
  knobRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  glassSample: { padding: 12, alignItems: "center" },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "center",
  },
});
