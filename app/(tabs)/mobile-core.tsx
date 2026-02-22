import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/useTheme";
import { Accordion } from "../../src/ui/components/Accordion";
import { Avatar } from "../../src/ui/components/Avatar";
import { EmptyState } from "../../src/ui/components/EmptyState";
import { HamburgerMenu } from "../../src/ui/components/HamburgerMenu";
import { Header } from "../../src/ui/components/Header";
import { HelpIcon } from "../../src/ui/components/HelpIcon";
import { ListItem } from "../../src/ui/components/ListItem";
import { useNotificationToast } from "../../src/ui/components/NotificationToast";
import { ProgressBar } from "../../src/ui/components/ProgressBar";
import { Skeleton } from "../../src/ui/components/Skeleton";
import { Slider } from "../../src/ui/components/Slider";
import { TabSelector } from "../../src/ui/components/TabSelector";
import { useToast } from "../../src/ui/components/Toast";
import { GlassCard } from "../../src/ui/glass/GlassCard";
import { GlassIconButton } from "../../src/ui/glass/GlassIconButton";
import { GlassMiniCard } from "../../src/ui/glass/GlassMiniCard";
import { GlassSegmentedControl } from "../../src/ui/glass/GlassSegmentedControl";
import { GlassSliderVertical } from "../../src/ui/glass/GlassSliderVertical";
import { GlassStatusChip } from "../../src/ui/glass/GlassStatusChip";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { GlassTogglePill } from "../../src/ui/glass/GlassTogglePill";
import {
    showActionSheet,
    showAlert,
    showConfirm,
    showCustomModal,
} from "../../src/ui/modals/ModalHelpers";
import { ColorPickerSheet } from "../../src/ui/primitives/ColorPickerSheet";
import { TButton } from "../../src/ui/primitives/TButton";
import { TDivider } from "../../src/ui/primitives/TDivider";
import { TInput } from "../../src/ui/primitives/TInput";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { openSnappableSheet } from "../../src/ui/sheets/SnappableSheet";
import { useBottomSheet } from "../../src/ui/sheets/useBottomSheet";

const AnimatedIonicons = Animated.createAnimatedComponent(Ionicons);

export default function MobileCoreScreen() {
  const { theme, toggleMode } = useTheme();
  const sheet = useBottomSheet();
  const { open } = sheet;
  const toast = useToast();
  const notification = useNotificationToast();
  const [inputValue, setInputValue] = useState("");
  const [glassEnabled, setGlassEnabled] = useState(true);
  const [blurIntensity, setBlurIntensity] = useState<
    "light" | "medium" | "strong"
  >("medium");
  const [reduceTransparency, setReduceTransparency] = useState(false);
  const [glassTint, setGlassTint] = useState<"light" | "dark" | "default">(
    "default"
  );
  const [glassIntensityNum, setGlassIntensityNum] = useState(80);

  // Glass widget demo state
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

  // New component demo state
  const [progressVal, setProgressVal] = useState(0.45);
  const [sliderVal, setSliderVal] = useState(0.5);
  const [accordionOpen1, setAccordionOpen1] = useState(false);
  const [accordionOpen2, setAccordionOpen2] = useState(false);

  // TabSelector demo state
  const [dateTab, setDateTab] = useState("today");
  const [contentTab, setContentTab] = useState("preview");

  // HamburgerMenu demo state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSide, setMenuSide] = useState<"left" | "right">("left");

  // Animation for theme toggle
  const opacity = useSharedValue(1);

  const handleToggleMode = () => {
    // Fade out, then toggle, then fade in
    opacity.value = withSequence(
      withTiming(0, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
    // Toggle mode after fade out starts
    setTimeout(() => toggleMode(), 75);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Responsive snap points based on screen height
  const screenHeight = Dimensions.get("window").height;
  const snapPoints = useMemo(
    () => ({
      mini: Math.max(150, screenHeight * 0.15), // 15% or 150px minimum
      small: Math.max(280, screenHeight * 0.32), // 32% or 280px minimum for content visibility
      medium: Math.max(400, screenHeight * 0.55), // 55% or 400px minimum
      mediumCollapsed: Math.max(200, screenHeight * 0.25),
      large: Math.max(600, screenHeight * 0.85), // 85% or 600px minimum
      largeCollapsed: Math.max(350, screenHeight * 0.45), // 45% or 350px minimum
    }),
    [screenHeight]
  );

  // Sample content for testing different sheet sizes
  const SheetContent = ({ title }: { title: string }) => (
    <View style={{ padding: theme.spacing.lg }}>
      <TText variant="heading">{title}</TText>
      <TSpacer size="md" />
      <TText>
        Testing {title.toLowerCase()} bottom sheet with glass background.
      </TText>
      <TSpacer size="md" />
      <TText color="secondary">
        Verify the glass effect is visible and stable at this size.
      </TText>
      <TSpacer size="lg" />
      <TButton onPress={() => console.log(`${title} button tapped`)}>
        Test Button
      </TButton>
    </View>
  );

  const openColorWheel = () => {
    open(<ColorPickerSheet />, {
      snapPoints: ["85%"],
    });
  };

  const openSmallSheet = () => {
    open(<SheetContent title="Small Sheet" />, {
      snapPoints: [snapPoints.small],
    });
  };

  const openRegularSheet = () => {
    open(<SheetContent title="Regular Sheet" />, {
      snapPoints: [Math.max(500, screenHeight * 0.7)],
    });
  };

  const openMediumSheet = () => {
    open(<SheetContent title="Medium Sheet" />, {
      snapPoints: [Math.max(400, screenHeight * 0.55)],
    });
  };

  const openLargeSheet = () => {
    open(<SheetContent title="Large Sheet" />, {
      snapPoints: [Math.max(600, screenHeight * 0.85)],
    });
  };

  const openCustomSheet = () => {
    open(<SheetContent title="Custom Sheet (520px)" />, {
      snapPoints: [520],
    });
  };

  const openMiniSheet = () => {
    open(
      <View style={{ padding: theme.spacing.lg }}>
        <TText variant="heading">Mini Sheet</TText>
        <TSpacer size="md" />
        <TText>This mini sheet is extra small</TText>
      </View>,
      {
        snapPoints: [snapPoints.mini],
      }
    );
  };

  const openSnappable = () => {
    openSnappableSheet(
      open,
      <View style={{ padding: theme.spacing.lg }}>
        <TText variant="heading">Snappable Sheet</TText>
        <TSpacer size="md" />
        <TText>This sheet has 2 snap points - try dragging it!</TText>
        <TSpacer size="md" />
        <TText color="secondary">• Snap to 40% (smaller)</TText>
        <TText color="secondary">• Snap to 70% (larger)</TText>
        <TSpacer size="lg" />
        <TText>
          The sheet will snap to these positions when you drag and release.
        </TText>
      </View>,
      [40, 70], // 40% and 70% snap points
      [280, 400] // Minimum heights in pixels
    );
  };

  const openSnappableLarge = () => {
    openSnappableSheet(
      open,
      <View style={{ padding: theme.spacing.lg }}>
        <TText variant="heading">Large Snappable Sheet</TText>
        <TSpacer size="md" />
        <TText>This sheet reaches up to 90% with 2 snap points!</TText>
        <TSpacer size="md" />
        <TText color="secondary">• Snap to 50% (half screen)</TText>
        <TText color="secondary">• Snap to 90% (nearly full)</TText>
        <TSpacer size="lg" />
        <TText>
          Perfect for content that needs more space while still allowing drag
          interaction.
        </TText>
        <TSpacer size="md" />
        <TButton onPress={() => console.log("Action")}>Test Action</TButton>
      </View>,
      [50, 90], // 50% and 90% snap points
      [400, 650] // Minimum heights in pixels
    );
  };

  // Modal Demos
  const openAlertModal = () => {
    showAlert(sheet, {
      title: "Success!",
      message: "Your action was completed successfully.",
      confirmText: "Got it",
      onConfirm: () => console.log("Alert confirmed"),
    });
  };

  const openConfirmModal = () => {
    showConfirm(sheet, {
      title: "Delete Item?",
      message:
        "Are you sure you want to delete this item? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      onConfirm: () => console.log("Item deleted"),
      onCancel: () => console.log("Cancelled"),
    });
  };

  const openActionSheetModal = () => {
    showActionSheet(sheet, {
      title: "Choose an action",
      message: "Select one of the options below",
      options: [
        {
          label: "Edit",
          onPress: () => console.log("Edit pressed"),
        },
        {
          label: "Share",
          onPress: () => console.log("Share pressed"),
        },
        {
          label: "Delete",
          onPress: () => console.log("Delete pressed"),
          variant: "destructive" as const,
        },
      ],
    });
  };

  const openCustomModalDemo = () => {
    showCustomModal(
      sheet,
      <View style={{ padding: theme.spacing.lg }}>
        <TText variant="heading">Custom Modal</TText>
        <TSpacer size="md" />
        <TText>This is a custom modal with your own content!</TText>
        <TSpacer size="md" />
        <TInput placeholder="Enter something..." />
        <TSpacer size="lg" />
        <TButton onPress={() => sheet.close()}>Close Modal</TButton>
      </View>,
      45, // 45% of screen height
      300 // Minimum 300px
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top"]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Component Demo */}
        <Header
          title="Mobile Core"
          subtitle="Tier A Component Catalog"
          trailing={
            <Pressable onPress={handleToggleMode}>
              <AnimatedIonicons
                name={theme.mode === "dark" ? "sunny" : "moon"}
                size={24}
                color={theme.colors.text}
                style={animatedStyle}
              />
            </Pressable>
          }
        />

        <TSpacer size="lg" />

        {/* ── Knobs ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">Knobs</TText>
          <TSpacer size="md" />

          {/* Glass toggle */}
          <View style={styles.knobRow}>
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

          {/* Blur intensity picker */}
          <TText color="secondary">Blur Intensity</TText>
          <TSpacer size="xs" />
          <View style={styles.knobRow}>
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

          {/* Glass preview */}
          {glassEnabled ? (
            <GlassSurface intensity={blurIntensity} style={styles.glassSample}>
              <TText>Glass Preview ({blurIntensity})</TText>
            </GlassSurface>
          ) : (
            <View
              style={[
                styles.glassSample,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <TText>Glass Disabled (solid surface)</TText>
            </View>
          )}

          <TSpacer size="md" />

          {/* Reduce Transparency simulation */}
          <View style={styles.knobRow}>
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

          {/* Tint selection */}
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

          {/* Intensity number */}
          <TText color="secondary">
            Numeric Intensity: {glassIntensityNum}
          </TText>
          <TSpacer size="xs" />
          <View style={styles.knobRow}>
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

        {/* ═══════════ GLASS WIDGET KIT ═══════════ */}

        {/* ── GlassIconButton Grid ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">GlassIconButton</TText>
          <TSpacer size="sm" />
          <TText color="secondary" style={{ fontSize: 13 }}>
            Tap to toggle active state
          </TText>
          <TSpacer size="md" />
          <View style={styles.iconGrid}>
            {(
              [
                { key: "flashlight", icon: "flashlight" as const },
                { key: "timer", icon: "timer-outline" as const },
                { key: "camera", icon: "camera-outline" as const },
                { key: "calculator", icon: "calculator-outline" as const },
              ] as const
            ).map(({ key, icon }) => (
              <GlassIconButton
                key={key}
                icon={icon}
                active={activeIcons[key]}
                onPress={() =>
                  setActiveIcons((prev) => ({ ...prev, [key]: !prev[key] }))
                }
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
          <View style={[styles.iconGrid, { gap: 12 }]}>
            <GlassIconButton
              icon="star"
              size="sm"
              onPress={() => {}}
              accessibilityLabel="Small icon"
              blurEnabled={glassEnabled}
              reduceTransparency={reduceTransparency}
              intensity={glassIntensityNum}
              tint={glassTint}
            />
            <GlassIconButton
              icon="star"
              size="md"
              onPress={() => {}}
              accessibilityLabel="Medium icon"
              blurEnabled={glassEnabled}
              reduceTransparency={reduceTransparency}
              intensity={glassIntensityNum}
              tint={glassTint}
            />
            <GlassIconButton
              icon="star"
              size="lg"
              onPress={() => {}}
              accessibilityLabel="Large icon"
              blurEnabled={glassEnabled}
              reduceTransparency={reduceTransparency}
              intensity={glassIntensityNum}
              tint={glassTint}
            />
          </View>
        </GlassCard>

        <TSpacer size="lg" />

        {/* ── GlassTogglePill ── */}
        <GlassCard style={styles.section}>
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
        <GlassCard style={styles.section}>
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
          <TText
            color="secondary"
            style={{ fontSize: 12, textAlign: "center" }}
          >
            Brightness: {Math.round(brightnessVal * 100)}% · Volume:{" "}
            {Math.round(volumeVal * 100)}%
          </TText>
        </GlassCard>

        <TSpacer size="lg" />

        {/* ── GlassSegmentedControl ── */}
        <GlassCard style={styles.section}>
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
          <TText
            color="secondary"
            style={{ fontSize: 12, textAlign: "center" }}
          >
            Selected: {segmentValue}
          </TText>
        </GlassCard>

        <TSpacer size="lg" />

        {/* ── GlassStatusChip ── */}
        <GlassCard style={styles.section}>
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
        <GlassCard style={styles.section}>
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

        {/* ── Header ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">Header</TText>
          <TSpacer size="md" />
          <Header
            title="Page Title"
            subtitle="Optional subtitle"
            align="left"
          />
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

        {/* ── ListItem ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">ListItem</TText>
          <TSpacer size="md" />
          <ListItem
            label="Settings"
            icon="settings-outline"
            onPress={() => toast.show("Settings tapped")}
          />
          <TDivider />
          <ListItem
            label="Notifications"
            subtitle="3 unread"
            icon="notifications-outline"
            onPress={() => toast.show("Notifications tapped")}
          />
          <TDivider />
          <ListItem
            label="Disabled Item"
            icon="lock-closed-outline"
            disabled
            onPress={() => {}}
          />
          <TDivider />
          <ListItem
            label="Custom trailing"
            icon="color-palette-outline"
            trailing={
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: theme.colors.primary,
                }}
              />
            }
          />
        </GlassCard>

        <TSpacer size="lg" />

        {/* ── EmptyState ── */}
        <GlassCard style={styles.section}>
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

        {/* ── Skeleton ── */}
        <GlassCard style={styles.section}>
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

        {/* ── Theme System ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">Theme System</TText>
          <TSpacer size="md" />
          <TText color="secondary">Current mode: {theme.mode}</TText>
          <TSpacer size="md" />
          <Pressable
            onPress={handleToggleMode}
            style={{ alignSelf: "flex-start" }}
          >
            <AnimatedIonicons
              name={theme.mode === "dark" ? "sunny" : "moon"}
              size={32}
              color={theme.colors.text}
              style={animatedStyle}
            />
          </Pressable>
          <TSpacer size="lg" />
          <TButton onPress={openColorWheel} variant="outline">
            Open Color Wheel
          </TButton>
        </GlassCard>

        <TSpacer size="lg" />

        {/* ── Glass Components ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">Glass Components</TText>
          <TSpacer size="md" />
          <GlassSurface intensity="light" style={styles.glassSample}>
            <TText>Light Glass</TText>
          </GlassSurface>
          <TSpacer size="sm" />
          <GlassSurface intensity="medium" style={styles.glassSample}>
            <TText>Medium Glass</TText>
          </GlassSurface>
          <TSpacer size="sm" />
          <GlassSurface intensity="strong" style={styles.glassSample}>
            <TText>Strong Glass</TText>
          </GlassSurface>
        </GlassCard>

        <TSpacer size="lg" />

        {/* ── Bottom Sheet Test ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">Bottom Sheet Sizes</TText>
          <TSpacer size="md" />
          <TText color="secondary" style={{ fontSize: 14 }}>
            Test all sheet sizes with reliable glass:
          </TText>
          <TSpacer size="sm" />
          <TButton onPress={openSmallSheet}>Open Small Sheet</TButton>
          <TSpacer size="sm" />
          <TButton onPress={openRegularSheet}>Open Regular Sheet (70%)</TButton>
          <TSpacer size="sm" />
          <TButton onPress={openMediumSheet}>Open Medium Sheet</TButton>
          <TSpacer size="sm" />
          <TButton onPress={openLargeSheet}>Open Large Sheet (90%)</TButton>
          <TSpacer size="sm" />
          <TButton onPress={openCustomSheet}>Open Custom Sheet (520px)</TButton>
          <TSpacer size="lg" />
          <TText color="secondary" style={{ fontSize: 14 }}>
            Content-sized sheet:
          </TText>
          <TSpacer size="sm" />
          <TButton onPress={openMiniSheet}>Open Mini Sheet</TButton>
          <TSpacer size="lg" />
          <TText color="secondary" style={{ fontSize: 14 }}>
            Snappable Sheet (2 snap points):
          </TText>
          <TSpacer size="sm" />
          <TButton onPress={openSnappable} variant="secondary">
            Open Snappable Sheet (40% & 70%)
          </TButton>
          <TSpacer size="sm" />
          <TButton onPress={openSnappableLarge} variant="secondary">
            Open Large Snappable (50% & 90%)
          </TButton>
        </GlassCard>

        <TSpacer size="lg" />

        {/* ── Modals ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">Modals (from Sheets)</TText>
          <TSpacer size="md" />
          <TText color="secondary" style={{ fontSize: 14 }}>
            Common modal patterns using bottom sheets:
          </TText>
          <TSpacer size="sm" />
          <TButton onPress={openAlertModal}>Alert Modal</TButton>
          <TSpacer size="sm" />
          <TButton onPress={openConfirmModal} variant="secondary">
            Confirm Modal
          </TButton>
          <TSpacer size="sm" />
          <TButton onPress={openActionSheetModal} variant="outline">
            Action Sheet
          </TButton>
          <TSpacer size="sm" />
          <TButton onPress={openCustomModalDemo} variant="ghost">
            Custom Modal
          </TButton>
        </GlassCard>

        <TSpacer size="lg" />

        {/* ── Buttons ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">Buttons</TText>
          <TSpacer size="md" />
          <TButton onPress={() => {}}>Primary Button</TButton>
          <TSpacer size="sm" />
          <TButton onPress={() => {}} variant="secondary">
            Secondary Button
          </TButton>
          <TSpacer size="sm" />
          <TButton onPress={() => {}} variant="ghost">
            Ghost Button
          </TButton>
          <TSpacer size="sm" />
          <TButton onPress={() => {}} variant="outline">
            Outline Button
          </TButton>
          <TSpacer size="sm" />
          <TButton onPress={() => {}} disabled>
            Disabled Button
          </TButton>
        </GlassCard>

        <TSpacer size="lg" />

        {/* ── Inputs ── */}
        <GlassCard style={styles.section}>
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

        {/* ── Accordion ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">Accordion</TText>
          <TSpacer size="md" />
          <Accordion
            title="What is mobile-core?"
            subtitle="About this repo"
            icon="code-slash-outline"
            expanded={accordionOpen1}
            onToggle={setAccordionOpen1}
          >
            <TText color="secondary">
              mobile-core is a shared UI component library for building
              production mobile apps. Fork it, change the tokens, ship your app.
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
              Override the brandHue in your ThemeProvider setup. All colors
              derive from that single number via the palette generator.
            </TText>
          </Accordion>
          <TSpacer size="sm" />
          <Accordion title="Disabled accordion" disabled>
            <TText>You should not see this.</TText>
          </Accordion>
        </GlassCard>

        <TSpacer size="lg" />

        {/* ── Progress Bar ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">Progress Bar</TText>
          <TSpacer size="md" />
          <ProgressBar progress={progressVal} showLabel />
          <TSpacer size="md" />
          <View style={styles.knobRow}>
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
            <TButton
              size="sm"
              variant="ghost"
              onPress={() => setProgressVal(0)}
            >
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
        <GlassCard style={styles.section}>
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

        {/* ── TabSelector ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">Tab Selector</TText>
          <TSpacer size="md" />

          <TText variant="subheading" color="secondary">
            Date selector
          </TText>
          <TSpacer size="sm" />
          <TabSelector
            tabs={[
              { key: "mon", label: "Mon 16" },
              { key: "yesterday", label: "Yesterday" },
              { key: "today", label: "Today" },
              { key: "tomorrow", label: "Tomorrow" },
              { key: "thu", label: "Thu 20" },
              { key: "fri", label: "Fri 21" },
              { key: "sat", label: "Sat 22" },
            ]}
            value={dateTab}
            onChange={setDateTab}
          />

          <TSpacer size="lg" />

          <TText variant="subheading" color="secondary">
            Content tabs
          </TText>
          <TSpacer size="sm" />
          <TabSelector
            tabs={[
              { key: "preview", label: "Preview" },
              { key: "commentary", label: "Commentary" },
              { key: "lineup", label: "Lineup" },
              { key: "knockout", label: "Knockout" },
              { key: "stats", label: "Stats" },
            ]}
            value={contentTab}
            onChange={setContentTab}
          />
        </GlassCard>

        <TSpacer size="lg" />

        {/* ── Avatar ── */}
        <GlassCard style={styles.section}>
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
        <GlassCard style={styles.section}>
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

        {/* ── HamburgerMenu ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">Hamburger Menu</TText>
          <TSpacer size="md" />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
            <TButton
              size="sm"
              variant={menuSide === "left" ? "primary" : "outline"}
              onPress={() => setMenuSide("left")}
            >
              Left
            </TButton>
            <TButton
              size="sm"
              variant={menuSide === "right" ? "primary" : "outline"}
              onPress={() => setMenuSide("right")}
            >
              Right
            </TButton>
          </View>
          <TSpacer size="md" />

          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <HamburgerMenu
              open={menuOpen}
              onToggle={setMenuOpen}
              side={menuSide}
              header={
                <View>
                  <TText variant="heading">Menu</TText>
                  <TText color="secondary">Explore the app</TText>
                </View>
              }
              sections={[
                {
                  title: "Navigation",
                  items: [
                    {
                      key: "home",
                      label: "Home",
                      icon: "home-outline",
                      onPress: () => toast.show("Home"),
                    },
                    {
                      key: "profile",
                      label: "Profile",
                      icon: "person-outline",
                      onPress: () => toast.show("Profile"),
                    },
                    {
                      key: "settings",
                      label: "Settings",
                      icon: "settings-outline",
                      onPress: () => toast.show("Settings"),
                    },
                  ],
                },
                {
                  title: "Support",
                  items: [
                    {
                      key: "help",
                      label: "Help Center",
                      icon: "help-circle-outline",
                      onPress: () => toast.show("Help"),
                    },
                    {
                      key: "feedback",
                      label: "Send Feedback",
                      icon: "chatbubble-outline",
                      onPress: () => toast.show("Feedback"),
                    },
                  ],
                },
                {
                  items: [
                    {
                      key: "logout",
                      label: "Log Out",
                      icon: "log-out-outline",
                      destructive: true,
                      onPress: () => toast.show("Logged out", "warning"),
                    },
                  ],
                },
              ]}
              footer={
                <TText variant="caption" color="muted">
                  v1.0.0 · mobile-core
                </TText>
              }
            />
            <TText color="secondary">← Tap the hamburger icon</TText>
          </View>
        </GlassCard>

        <TSpacer size="lg" />

        {/* ── Notification Toast ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">Notification Toast</TText>
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
            Message Notification
          </TButton>
          <TSpacer size="sm" />
          <TButton
            variant="secondary"
            onPress={() =>
              notification.show({
                title: "Payment Received",
                body: "$42.00 from Alex Johnson",
                avatarUri: "https://i.pravatar.cc/150?img=5",
                onPress: () => toast.show("Opening payment...", "info"),
              })
            }
          >
            With Avatar + Tap Action
          </TButton>
          <TSpacer size="sm" />
          <TButton
            variant="outline"
            onPress={() =>
              notification.show({
                title: "Update Available",
                body: "v2.1.0 is ready to install.",
                icon: "arrow-up-circle",
                duration: 6000,
              })
            }
          >
            Long Duration (6s)
          </TButton>
        </GlassCard>

        <TSpacer size="lg" />

        {/* ── Toast (from bottom) ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">Toast (Bottom)</TText>
          <TSpacer size="md" />
          <TButton
            onPress={() => toast.show("Operation successful", "success")}
          >
            Success Toast
          </TButton>
          <TSpacer size="sm" />
          <TButton
            onPress={() => toast.show("Something went wrong", "error")}
            variant="secondary"
          >
            Error Toast
          </TButton>
          <TSpacer size="sm" />
          <TButton
            onPress={() => toast.show("Heads up!", "info")}
            variant="outline"
          >
            Info Toast
          </TButton>
          <TSpacer size="sm" />
          <TButton
            onPress={() => toast.show("Check this out", "warning")}
            variant="ghost"
          >
            Warning Toast
          </TButton>
        </GlassCard>

        <TSpacer size="lg" />

        {/* ── Typography ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">Heading</TText>
          <TSpacer size="xs" />
          <TText variant="subheading">Subheading</TText>
          <TSpacer size="xs" />
          <TText variant="body">Body text (default)</TText>
          <TSpacer size="xs" />
          <TDivider />
          <TSpacer size="xs" />
          <TText>Body text (default)</TText>
          <TSpacer size="xs" />
          <TText color="secondary">Secondary text</TText>
          <TSpacer size="xs" />
          <TText color="muted">Muted text</TText>
          <TSpacer size="xs" />
          <TText variant="caption">Caption text</TText>
        </GlassCard>

        <TSpacer size="xxl" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    alignItems: "center",
  },
  section: {
    padding: 16,
  },
  glassSample: {
    padding: 12,
    alignItems: "center",
  },
  knobRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "center",
  },
});
