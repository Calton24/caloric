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
import { EmptyState } from "../../src/ui/components/EmptyState";
import { Header } from "../../src/ui/components/Header";
import { ListItem } from "../../src/ui/components/ListItem";
import { Skeleton } from "../../src/ui/components/Skeleton";
import { useToast } from "../../src/ui/components/Toast";
import { GlassCard } from "../../src/ui/glass/GlassCard";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
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
  const [inputValue, setInputValue] = useState("");
  const [glassEnabled, setGlassEnabled] = useState(true);
  const [blurIntensity, setBlurIntensity] = useState<
    "light" | "medium" | "strong"
  >("medium");

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

        {/* ── Toast ── */}
        <GlassCard style={styles.section}>
          <TText variant="heading">Toast</TText>
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
});
