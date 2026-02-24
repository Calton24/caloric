/**
 * TabSelector
 * Horizontal scrollable tab strip with animated sliding underline indicator.
 * Use for date selectors, content tab bars, filter rows, etc.
 *
 * Features:
 * - Horizontally scrollable via FlatList (auto-scrolls active tab into view)
 * - Animated underline indicator that glides between tabs
 * - Bold weight on active tab, muted text on inactive
 * - Token-driven sizing & colors via useTheme()
 * - Controlled component (value + onChange)
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    LayoutChangeEvent,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Pressable,
    ScrollView,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { haptics } from "../../infrastructure/haptics";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

/* ── Types ─────────────────────────────────────────── */

export interface TabItem {
  /** Unique key for the tab */
  key: string;
  /** Display label */
  label: string;
}

export interface TabSelectorProps {
  /** Array of tab items */
  tabs: TabItem[];
  /** Currently active tab key */
  value: string;
  /** Callback when a tab is pressed */
  onChange: (key: string) => void;
  /** Fixed equal-width tabs instead of auto-sized (default: false) */
  equalWidth?: boolean;
  /** Scroll padding applied to left/right of the ScrollView (default: spacing.md) */
  scrollPadding?: number;
  /** Additional style for the outer container */
  style?: StyleProp<ViewStyle>;
  /** AccessibilityLabel for the tab strip */
  accessibilityLabel?: string;
}

/* ── Timing ────────────────────────────────────────── */

const INDICATOR_TIMING = {
  duration: 280,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

const GAP = 24;

/* ── Component ─────────────────────────────────────── */

export function TabSelector({
  tabs,
  value,
  onChange,
  equalWidth = false,
  scrollPadding,
  style,
  accessibilityLabel = "Tab selector",
}: TabSelectorProps) {
  const { theme } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const tabRefs = useRef<Record<string, { x: number; width: number }>>({});

  const padding = scrollPadding ?? theme.spacing.md;

  // Track layout of each tab to position the underline
  const [tabLayouts, setTabLayouts] = useState<
    Record<string, { x: number; width: number }>
  >({});

  // Track scroll offset and container width for auto-centering
  const scrollOffset = useRef(0);
  const containerWidth = useRef(0);

  // Animated indicator shared values
  const indicatorX = useSharedValue(0);
  const indicatorWidth = useSharedValue(0);
  const indicatorOpacity = useSharedValue(0);

  // When value or layouts change, animate indicator
  useEffect(() => {
    const layout = tabLayouts[value];
    if (!layout) return;

    indicatorX.value = withTiming(layout.x, INDICATOR_TIMING);
    indicatorWidth.value = withTiming(layout.width, INDICATOR_TIMING);
    indicatorOpacity.value = withTiming(1, { duration: 200 });

    // Auto-scroll to center the active tab
    if (scrollRef.current && containerWidth.current > 0) {
      const targetScroll =
        layout.x + layout.width / 2 - containerWidth.current / 2;
      scrollRef.current.scrollTo({
        x: Math.max(0, targetScroll),
        animated: true,
      });
    }
  }, [value, tabLayouts, indicatorX, indicatorWidth, indicatorOpacity]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
    width: indicatorWidth.value,
    opacity: indicatorOpacity.value,
  }));

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollOffset.current = e.nativeEvent.contentOffset.x;
    },
    []
  );

  const handleContainerLayout = useCallback((e: LayoutChangeEvent) => {
    containerWidth.current = e.nativeEvent.layout.width;
  }, []);

  // Measure each tab's position relative to the scrollable content
  const handleTabLayout = useCallback((key: string, e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    tabRefs.current[key] = { x, width };
    setTabLayouts((prev) => {
      if (prev[key]?.x === x && prev[key]?.width === width) return prev;
      return { ...prev, [key]: { x, width } };
    });
  }, []);

  return (
    <View
      style={[
        styles.container,
        { borderBottomColor: theme.colors.divider },
        style,
      ]}
      onLayout={handleContainerLayout}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
    >
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.listContent,
          { paddingHorizontal: padding },
        ]}
      >
        {tabs.map((item) => {
          const isActive = item.key === value;
          return (
            <Pressable
              key={item.key}
              onPress={() => {
                haptics.selection();
                onChange(item.key);
              }}
              onLayout={(e) => handleTabLayout(item.key, e)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={[
                styles.tab,
                equalWidth && { flex: 1, alignItems: "center" as const },
              ]}
            >
              <TText
                variant="body"
                color={isActive ? "primary" : "muted"}
                style={{
                  fontSize: theme.typography.fontSize.base,
                  fontWeight: isActive
                    ? theme.typography.fontWeight.semibold
                    : theme.typography.fontWeight.regular,
                  paddingBottom: theme.spacing.sm,
                }}
              >
                {item.label}
              </TText>
            </Pressable>
          );
        })}

        {/* Indicator lives INSIDE scrollable content so it moves with tabs */}
        <Animated.View
          style={[
            styles.indicator,
            {
              backgroundColor: theme.colors.text,
              height: 2.5,
              borderRadius: theme.radius.full,
            },
            indicatorStyle,
          ]}
          pointerEvents="none"
        />
      </ScrollView>
    </View>
  );
}

/* ── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  listContent: {
    gap: GAP,
    position: "relative",
    paddingBottom: 3, // space for the indicator
  },
  tab: {
    paddingVertical: 8,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 0,
  },
});
