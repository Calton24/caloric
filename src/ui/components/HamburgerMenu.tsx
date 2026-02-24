/**
 * HamburgerMenu
 * Animated hamburger icon that opens a side drawer overlay.
 *
 * Features:
 * - Configurable side: "left" | "right"
 * - Animated hamburger → X icon transition
 * - Overlay drawer slides in from chosen side (300ms spring)
 * - Accepts menuItems array with icon, label, onPress
 * - Section headers for grouping
 * - Semi-transparent backdrop with tap-to-close
 * - Swipe gesture to dismiss drawer
 * - Haptic feedback on open/close/item press
 * - Token-driven colors via useTheme()
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Dimensions,
    Modal,
    PanResponder,
    Pressable,
    ScrollView,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import Animated, {
    Easing,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { haptics } from "../../infrastructure/haptics";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

/* ── Types ─────────────────────────────────────────── */

type IconName = React.ComponentProps<typeof Ionicons>["name"];

export interface MenuItem {
  /** Unique key */
  key: string;
  /** Display label */
  label: string;
  /** Ionicons icon name */
  icon?: IconName;
  /** Press handler — drawer auto-closes */
  onPress?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Destructive style (red) */
  destructive?: boolean;
}

export interface MenuSection {
  /** Optional section header */
  title?: string;
  items: MenuItem[];
}

export interface HamburgerMenuProps {
  /** Whether the drawer is open — controlled */
  open: boolean;
  /** Toggle handler */
  onToggle: (open: boolean) => void;
  /** Side the drawer opens from (default: left) */
  side?: "left" | "right";
  /** Menu sections */
  sections: MenuSection[];
  /** Optional header content rendered above menu items */
  header?: React.ReactNode;
  /** Optional footer content rendered below menu items */
  footer?: React.ReactNode;
  /** Drawer width (default: 280) */
  drawerWidth?: number;
  /** Style for the hamburger icon container */
  style?: StyleProp<ViewStyle>;
  /** Accessibility label for the toggle button */
  accessibilityLabel?: string;
}

/* ── Timing ────────────────────────────────────────── */

const DRAWER_TIMING = {
  duration: 300,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

/* ── Component ─────────────────────────────────────── */

export function HamburgerMenu({
  open,
  onToggle,
  side = "left",
  sections,
  header,
  footer,
  drawerWidth = 280,
  style,
  accessibilityLabel = "Menu",
}: HamburgerMenuProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // ── Flicker fix ──
  // Keep the Modal mounted while the close animation plays.
  // `modalVisible` turns ON immediately when `open` becomes true,
  // but only turns OFF after the exit animation finishes.
  const [modalVisible, setModalVisible] = useState(open);

  // Animation progress: 0 = closed, 1 = open
  const progress = useSharedValue(0);

  useEffect(() => {
    if (open) {
      // Show modal first, then animate in
      setModalVisible(true);
      haptics.impact("light");
      progress.value = withTiming(1, DRAWER_TIMING);
    } else {
      // Animate out, THEN hide modal
      progress.value = withTiming(0, DRAWER_TIMING, (finished) => {
        if (finished) {
          runOnJS(setModalVisible)(false);
        }
      });
    }
  }, [open, progress]);

  const handleClose = useCallback(() => {
    haptics.impact("light");
    onToggle(false);
  }, [onToggle]);

  const handleOpen = useCallback(() => {
    haptics.impact("light");
    onToggle(true);
  }, [onToggle]);

  // ── Swipe-to-dismiss gesture ──
  // Left drawer: swipe left to close. Right drawer: swipe right to close.
  const SWIPE_THRESHOLD = 60;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        const { dx, dy } = gestureState;
        // Only capture horizontal swipes (not vertical scrolls)
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const { dx } = gestureState;
        if (side === "left" && dx < -SWIPE_THRESHOLD) {
          handleClose();
        } else if (side === "right" && dx > SWIPE_THRESHOLD) {
          handleClose();
        }
      },
    })
  ).current;

  // Hamburger icon animated bars → X
  const topBarStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, 6]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, 45])}deg` },
    ],
  }));

  const middleBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.3], [1, 0]),
    transform: [
      {
        scaleX: interpolate(progress.value, [0, 0.3], [1, 0]),
      },
    ],
  }));

  const bottomBarStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, -6]) },
      { rotate: `${interpolate(progress.value, [0, 1], [0, -45])}deg` },
    ],
  }));

  // Drawer slide
  const drawerStyle = useAnimatedStyle(() => {
    const offset = side === "left" ? -drawerWidth : drawerWidth;
    return {
      transform: [
        {
          translateX: interpolate(progress.value, [0, 1], [offset, 0]),
        },
      ],
    };
  });

  // Backdrop opacity
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.5]),
  }));

  const handleItemPress = useCallback(
    (item: MenuItem) => {
      if (item.disabled) return;
      haptics.selection();
      onToggle(false);
      // Delay action until drawer close animation starts
      setTimeout(() => item.onPress?.(), 100);
    },
    [onToggle]
  );

  /* ── Hamburger Icon Button ── */
  const iconButton = (
    <Pressable
      onPress={open ? handleClose : handleOpen}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ expanded: open }}
      style={[styles.iconButton, style]}
      hitSlop={8}
    >
      <View style={styles.bars}>
        <Animated.View
          style={[
            styles.bar,
            { backgroundColor: theme.colors.text },
            topBarStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.bar,
            { backgroundColor: theme.colors.text },
            middleBarStyle,
          ]}
        />
        <Animated.View
          style={[
            styles.bar,
            { backgroundColor: theme.colors.text },
            bottomBarStyle,
          ]}
        />
      </View>
    </Pressable>
  );

  /* ── Drawer Overlay ── */
  const drawer = (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      {/* Backdrop */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "#000" },
            backdropStyle,
          ]}
        />
      </Pressable>

      {/* Drawer panel */}
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.drawer,
          {
            width: drawerWidth,
            backgroundColor: theme.colors.background,
            paddingTop: insets.top + 16,
            paddingBottom: insets.bottom + 16,
            [side === "left" ? "left" : "right"]: 0,
            borderTopRightRadius: side === "left" ? theme.radius.xl : 0,
            borderBottomRightRadius: side === "left" ? theme.radius.xl : 0,
            borderTopLeftRadius: side === "right" ? theme.radius.xl : 0,
            borderBottomLeftRadius: side === "right" ? theme.radius.xl : 0,
            shadowColor: "#000",
            shadowOffset: { width: side === "left" ? 4 : -4, height: 0 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 12,
          },
          drawerStyle,
        ]}
      >
        {header && <View style={styles.headerContainer}>{header}</View>}

        <ScrollView
          style={styles.menuScroll}
          contentContainerStyle={styles.menuContent}
          showsVerticalScrollIndicator={false}
        >
          {sections.map((section, sIdx) => (
            <View key={`section-${sIdx}`}>
              {section.title && (
                <TText
                  variant="caption"
                  color="muted"
                  style={styles.sectionTitle}
                >
                  {section.title?.toUpperCase()}
                </TText>
              )}
              {section.items.map((item) => (
                <Pressable
                  key={item.key}
                  onPress={() => handleItemPress(item)}
                  disabled={item.disabled}
                  style={({ pressed }) => [
                    styles.menuItem,
                    {
                      backgroundColor: pressed
                        ? theme.colors.surfaceSecondary
                        : "transparent",
                      opacity: item.disabled ? 0.4 : 1,
                    },
                  ]}
                  accessibilityRole="menuitem"
                  accessibilityLabel={item.label}
                >
                  {item.icon && (
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={
                        item.destructive
                          ? theme.colors.error
                          : theme.colors.text
                      }
                      style={styles.menuIcon}
                    />
                  )}
                  <TText
                    variant="body"
                    style={[
                      styles.menuLabel,
                      item.destructive && { color: theme.colors.error },
                    ]}
                  >
                    {item.label}
                  </TText>
                </Pressable>
              ))}
              {sIdx < sections.length - 1 && (
                <View
                  style={[
                    styles.separator,
                    { backgroundColor: theme.colors.divider },
                  ]}
                />
              )}
            </View>
          ))}
        </ScrollView>

        {footer && <View style={styles.footerContainer}>{footer}</View>}
      </Animated.View>
    </Modal>
  );

  return (
    <>
      {iconButton}
      {drawer}
    </>
  );
}

/* ── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  iconButton: {
    padding: 8,
  },
  bars: {
    width: 22,
    height: 18,
    justifyContent: "space-between",
  },
  bar: {
    width: 22,
    height: 2.5,
    borderRadius: 2,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  menuScroll: {
    flex: 1,
  },
  menuContent: {
    paddingHorizontal: 12,
  },
  sectionTitle: {
    paddingHorizontal: 8,
    paddingTop: 16,
    paddingBottom: 6,
    letterSpacing: 0.8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
    marginHorizontal: 8,
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
