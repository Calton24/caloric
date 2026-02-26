/**
 * SwipeCard
 * Tinder-style swipeable card deck with LIKE / NOPE overlays.
 *
 * Features:
 * - Pan gesture to swipe left (nope) or right (like)
 * - Rotation follows drag direction
 * - Stamp overlays appear with opacity tied to swipe progress
 * - Cards stack with scale/translateY offset for depth
 * - Action buttons (X and Heart) for programmatic swipe
 * - Fully token-driven via useTheme()
 * - Generic data type via TypeScript generics
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useImperativeHandle, useRef } from "react";
import {
    Dimensions,
    Image,
    Pressable,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    Easing,
    interpolate,
    runOnJS,
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

/* ── Types ─────────────────────────────────────────── */

export interface SwipeCardItem {
  /** Unique key */
  key: string;
  /** Full-bleed image URI */
  image: string;
  /** Name / title displayed at bottom */
  title: string;
  /** Subtitle (age, location, etc.) */
  subtitle?: string;
}

export interface SwipeCardRef {
  swipeLeft: () => void;
  swipeRight: () => void;
}

export interface SwipeCardProps {
  /** Card data array — first item is front */
  data: SwipeCardItem[];
  /** Called when a card is swiped right (like) */
  onSwipeRight?: (item: SwipeCardItem) => void;
  /** Called when a card is swiped left (nope) */
  onSwipeLeft?: (item: SwipeCardItem) => void;
  /** Called when deck is empty */
  onEmpty?: () => void;
  /** Show action buttons (default: true) */
  showActions?: boolean;
  /** Card border radius (default: radius.xl) */
  cardRadius?: number;
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

/* ── Constants ─────────────────────────────────────── */

const { width: SCREEN_W } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_W * 0.3;
const SWIPE_OUT_X = SCREEN_W * 1.5;
const MAX_ROTATION = 12; // degrees
const TIMING_CONFIG = { duration: 320, easing: Easing.out(Easing.cubic) };

/* ── Stamp Overlay ─────────────────────────────────── */

function StampOverlay({
  type,
  translateX,
}: {
  type: "like" | "nope";
  translateX: SharedValue<number>;
}) {
  const isLike = type === "like";

  const animatedStyle = useAnimatedStyle(() => {
    const progress = isLike
      ? interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1], "clamp")
      : interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0], "clamp");
    return { opacity: progress };
  });

  return (
    <Animated.View
      style={[
        styles.stamp,
        isLike ? styles.stampLeft : styles.stampRight,
        {
          borderColor: isLike ? "#4CD964" : "#FF3B30",
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    >
      <TText
        style={[styles.stampText, { color: isLike ? "#4CD964" : "#FF3B30" }]}
      >
        {isLike ? "LIKE" : "NOPE"}
      </TText>
    </Animated.View>
  );
}

/* ── Single Card ───────────────────────────────────── */

interface CardViewProps {
  item: SwipeCardItem;
  index: number;
  totalVisible: number;
  translateX: SharedValue<number>;
  isTop: boolean;
  cardRadius: number;
}

function CardView({
  item,
  index,
  translateX,
  isTop,
  cardRadius,
}: CardViewProps) {
  const { theme } = useTheme();

  const cardStyle = useAnimatedStyle(() => {
    if (isTop) {
      const rotate = interpolate(
        translateX.value,
        [-SCREEN_W, 0, SCREEN_W],
        [-MAX_ROTATION, 0, MAX_ROTATION]
      );
      return {
        transform: [
          { translateX: translateX.value },
          { rotate: `${rotate}deg` },
        ],
        zIndex: 10,
      };
    }
    // Back cards: scale up as top card is dragged away
    const scale = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [1 - index * 0.05, 1 - (index - 1) * 0.05],
      "clamp"
    );
    const ty = interpolate(
      Math.abs(translateX.value),
      [0, SWIPE_THRESHOLD],
      [index * 8, (index - 1) * 8],
      "clamp"
    );
    return {
      transform: [{ scale }, { translateY: ty }],
      zIndex: 10 - index,
    };
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          borderRadius: cardRadius,
          backgroundColor: theme.colors.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 8,
        },
        cardStyle,
      ]}
    >
      <Image
        source={{ uri: item.image }}
        style={[styles.cardImage, { borderRadius: cardRadius }]}
      />

      {/* Gradient overlay at bottom */}
      <View
        style={[
          styles.cardFooter,
          {
            borderBottomLeftRadius: cardRadius,
            borderBottomRightRadius: cardRadius,
          },
        ]}
      >
        <TText
          style={{
            color: "#fff",
            fontSize: theme.typography.fontSize.xxl,
            fontWeight: theme.typography.fontWeight.bold,
          }}
        >
          {item.title}
          {item.subtitle ? (
            <TText
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: theme.typography.fontSize.xxl,
                fontWeight: theme.typography.fontWeight.regular,
              }}
            >
              {`, ${item.subtitle}`}
            </TText>
          ) : null}
        </TText>
      </View>

      {/* Stamp overlays (front card only) */}
      {isTop && (
        <>
          <StampOverlay type="like" translateX={translateX} />
          <StampOverlay type="nope" translateX={translateX} />
        </>
      )}
    </Animated.View>
  );
}

/* ── Main Component ────────────────────────────────── */

export const SwipeCard = React.forwardRef<SwipeCardRef, SwipeCardProps>(
  function SwipeCard(
    {
      data,
      onSwipeRight,
      onSwipeLeft,
      onEmpty,
      showActions = true,
      cardRadius,
      style,
    },
    ref
  ) {
    const { theme } = useTheme();
    const radius = cardRadius ?? theme.radius.xl;
    const translateX = useSharedValue(0);
    const currentIndex = useRef(0);

    const handleSwipeComplete = useCallback(
      (direction: "left" | "right") => {
        const item = data[currentIndex.current];
        if (!item) return;
        if (direction === "right") onSwipeRight?.(item);
        else onSwipeLeft?.(item);
        currentIndex.current += 1;
        if (currentIndex.current >= data.length) onEmpty?.();
      },
      [data, onSwipeRight, onSwipeLeft, onEmpty]
    );

    const animateOut = useCallback(
      (direction: "left" | "right") => {
        const target = direction === "right" ? SWIPE_OUT_X : -SWIPE_OUT_X;
        translateX.value = withTiming(target, TIMING_CONFIG, () => {
          runOnJS(handleSwipeComplete)(direction);
          translateX.value = 0;
        });
      },
      [translateX, handleSwipeComplete]
    );

    useImperativeHandle(ref, () => ({
      swipeLeft: () => animateOut("left"),
      swipeRight: () => animateOut("right"),
    }));

    const panGesture = Gesture.Pan()
      .onUpdate((e) => {
        translateX.value = e.translationX;
      })
      .onEnd((e) => {
        if (e.translationX > SWIPE_THRESHOLD) {
          runOnJS(animateOut)("right");
        } else if (e.translationX < -SWIPE_THRESHOLD) {
          runOnJS(animateOut)("left");
        } else {
          translateX.value = withTiming(0, { duration: 200 });
        }
      });

    // Show max 3 cards
    const visibleCards = data
      .slice(currentIndex.current, currentIndex.current + 3)
      .reverse(); // render bottom-first so top card is last (highest z)

    return (
      <View style={[styles.container, style]}>
        <View style={styles.deck}>
          {visibleCards.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="heart-dislike-outline"
                size={48}
                color={theme.colors.textMuted}
              />
              <TText color="muted" style={{ marginTop: 12 }}>
                No more cards
              </TText>
            </View>
          ) : (
            visibleCards.map((item, i) => {
              const isTop = i === visibleCards.length - 1;
              return isTop ? (
                <GestureDetector key={item.key} gesture={panGesture}>
                  <CardView
                    item={item}
                    index={0}
                    totalVisible={visibleCards.length}
                    translateX={translateX}
                    isTop
                    cardRadius={radius}
                  />
                </GestureDetector>
              ) : (
                <CardView
                  key={item.key}
                  item={item}
                  index={visibleCards.length - 1 - i}
                  totalVisible={visibleCards.length}
                  translateX={translateX}
                  isTop={false}
                  cardRadius={radius}
                />
              );
            })
          )}
        </View>

        {showActions && visibleCards.length > 0 && (
          <View style={styles.actions}>
            <Pressable
              onPress={() => animateOut("left")}
              style={[
                styles.actionBtn,
                {
                  borderColor: theme.colors.error,
                  backgroundColor: theme.colors.error + "10",
                },
              ]}
            >
              <Ionicons name="close" size={28} color={theme.colors.error} />
            </Pressable>
            <Pressable
              onPress={() => animateOut("right")}
              style={[
                styles.actionBtn,
                {
                  borderColor: theme.colors.success,
                  backgroundColor: theme.colors.success + "10",
                },
              ]}
            >
              <Ionicons name="heart" size={26} color={theme.colors.success} />
            </Pressable>
          </View>
        )}
      </View>
    );
  }
);

/* ── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  deck: {
    width: SCREEN_W - 40,
    aspectRatio: 0.65,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: "cover",
  },
  cardFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 60,
    backgroundColor: "transparent",
    // gradient approximation via overlay
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -40 },
    shadowOpacity: 1,
    shadowRadius: 30,
  },
  stamp: {
    position: "absolute",
    top: 40,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 3,
    borderRadius: 8,
    transform: [{ rotate: "-20deg" }],
  },
  stampLeft: {
    left: 20,
  },
  stampRight: {
    right: 20,
  },
  stampText: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 2,
  },
  actions: {
    flexDirection: "row",
    gap: 32,
    marginTop: 20,
  },
  actionBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
  },
});
