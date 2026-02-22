/**
 * Carousel
 * Horizontal scrollable image carousel with page indicator.
 *
 * Features:
 * - Full-width snap-to-page scrolling
 * - Image indicator bar at the bottom (thin animated segments)
 * - Counter badge (e.g. "2 / 5")
 * - Supports image URIs, custom render, or children
 * - Auto-play with configurable interval
 * - Token-driven via useTheme()
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
    ViewToken,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

/* ── Types ─────────────────────────────────────────── */

export interface CarouselItem {
  /** Unique key */
  key: string;
  /** Image URI (if using default renderer) */
  image?: string;
  /** Custom content to render instead of image */
  content?: React.ReactNode;
}

export type CarouselIndicator = "bar" | "dots" | "counter" | "none";

export interface CarouselProps {
  /** Items to display */
  data: CarouselItem[];
  /** Item width (default: screen width) */
  itemWidth?: number;
  /** Item height (default: 260) */
  itemHeight?: number;
  /** Border radius for items (default: 0 for full-bleed, or radius.lg) */
  itemRadius?: number;
  /** Gap between items (default: 0) */
  gap?: number;
  /** Indicator style (default: "bar") */
  indicator?: CarouselIndicator;
  /** Auto-play interval in ms (default: 0 = off) */
  autoPlay?: number;
  /** Custom render function */
  renderItem?: (item: CarouselItem, index: number) => React.ReactNode;
  /** Called when active index changes */
  onIndexChange?: (index: number) => void;
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

/* ── Bar Indicator ─────────────────────────────────── */

function BarIndicator({
  count,
  activeIndex,
}: {
  count: number;
  activeIndex: number;
}) {
  return (
    <View style={barStyles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <BarSegment key={i} active={i === activeIndex} />
      ))}
    </View>
  );
}

function BarSegment({ active }: { active: boolean }) {
  const opacity = useSharedValue(active ? 1 : 0.35);

  React.useEffect(() => {
    opacity.value = withTiming(active ? 1 : 0.35, { duration: 200 });
  }, [active, opacity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[barStyles.segment, animStyle]} />;
}

const barStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: "center",
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#fff",
    maxWidth: 48,
  },
});

/* ── Dot Indicator ─────────────────────────────────── */

function DotIndicator({
  count,
  activeIndex,
}: {
  count: number;
  activeIndex: number;
}) {
  const { theme } = useTheme();
  return (
    <View style={dotStyles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <DotItem key={i} active={i === activeIndex} theme={theme} />
      ))}
    </View>
  );
}

function DotItem({
  active,
  theme,
}: {
  active: boolean;
  theme: ReturnType<typeof import("../../theme/useTheme").useTheme>["theme"];
}) {
  const width = useSharedValue(active ? 20 : 8);
  const bgOpacity = useSharedValue(active ? 1 : 0.3);

  React.useEffect(() => {
    width.value = withTiming(active ? 20 : 8, { duration: 200 });
    bgOpacity.value = withTiming(active ? 1 : 0.3, { duration: 200 });
  }, [active, width, bgOpacity]);

  const dotStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: bgOpacity.value,
  }));

  return (
    <Animated.View
      style={[
        { height: 8, borderRadius: 4, backgroundColor: theme.colors.text },
        dotStyle,
      ]}
    />
  );
}

const dotStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
});

/* ── Counter Badge ─────────────────────────────────── */

function CounterBadge({ index, total }: { index: number; total: number }) {
  return (
    <View style={counterStyles.badge}>
      <TText style={counterStyles.text}>
        {index + 1} / {total}
      </TText>
    </View>
  );
}

const counterStyles = StyleSheet.create({
  badge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});

/* ── Component ─────────────────────────────────────── */

export function Carousel({
  data,
  itemWidth,
  itemHeight = 260,
  itemRadius,
  gap = 0,
  indicator = "bar",
  autoPlay = 0,
  renderItem,
  onIndexChange,
  style,
}: CarouselProps) {
  const { theme } = useTheme();
  const flatListRef = useRef<FlatList>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const w = itemWidth ?? Dimensions.get("window").width;
  const r = itemRadius ?? 0;
  const snapInterval = w + gap;

  // Auto-play
  useEffect(() => {
    if (autoPlay <= 0 || data.length <= 1) return;
    autoPlayRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % data.length;
        flatListRef.current?.scrollToOffset({
          offset: next * snapInterval,
          animated: true,
        });
        return next;
      });
    }, autoPlay);
    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [autoPlay, data.length, snapInterval]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const idx = viewableItems[0].index;
        setActiveIndex(idx);
        onIndexChange?.(idx);
      }
    }
  ).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const defaultRender = useCallback(
    (item: CarouselItem) => {
      if (item.content) return <>{item.content}</>;
      if (item.image) {
        return (
          <Image
            source={{ uri: item.image }}
            style={[
              styles.image,
              { width: w, height: itemHeight, borderRadius: r },
            ]}
          />
        );
      }
      return (
        <View
          style={[
            styles.placeholder,
            {
              width: w,
              height: itemHeight,
              borderRadius: r,
              backgroundColor: theme.colors.surfaceSecondary,
            },
          ]}
        />
      );
    },
    [w, itemHeight, r, theme]
  );

  const renderCarouselItem = useCallback(
    ({ item, index }: { item: CarouselItem; index: number }) => (
      <View
        style={{
          width: w,
          marginRight: index < data.length - 1 ? gap : 0,
        }}
      >
        {renderItem ? renderItem(item, index) : defaultRender(item)}
      </View>
    ),
    [w, gap, data.length, renderItem, defaultRender]
  );

  return (
    <View style={[styles.container, style]}>
      <FlatList
        ref={flatListRef}
        data={data}
        renderItem={renderCarouselItem}
        keyExtractor={(item) => item.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled={gap === 0}
        snapToInterval={gap > 0 ? snapInterval : undefined}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />

      {/* Indicators */}
      {indicator === "bar" && data.length > 1 && (
        <View style={styles.indicatorOverlay}>
          <BarIndicator count={data.length} activeIndex={activeIndex} />
        </View>
      )}
      {indicator === "dots" && data.length > 1 && (
        <DotIndicator count={data.length} activeIndex={activeIndex} />
      )}
      {indicator === "counter" && data.length > 1 && (
        <CounterBadge index={activeIndex} total={data.length} />
      )}
    </View>
  );
}

/* ── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  image: {
    resizeMode: "cover",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  indicatorOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
});
