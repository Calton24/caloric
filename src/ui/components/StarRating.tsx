/**
 * StarRating
 * Interactive / read-only star rating with half-star support.
 *
 * Uses lucide-react-native for crisp star icons (Star, StarHalf).
 *
 * Features:
 * - Full and half-star ratings (0–5 in 0.5 increments)
 * - Interactive (tap) or read-only display mode
 * - Animated press feedback with spring scale
 * - Configurable star count, size, and colors
 * - Shows rating label text
 * - Token-driven via useTheme()
 */

import { Star } from "lucide-react-native";
import React, { useCallback } from "react";
import {
    Pressable,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
} from "react-native-reanimated";
import { haptics } from "../../infrastructure/haptics";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

/* ── Types ─────────────────────────────────────────── */

export type StarRatingSize = "sm" | "md" | "lg" | "xl";

export interface StarRatingProps {
  /** Current rating value (0–maxStars, supports 0.5 increments) */
  rating: number;
  /** Change handler — omit for read-only display */
  onChange?: (rating: number) => void;
  /** Maximum number of stars (default: 5) */
  maxStars?: number;
  /** Allow half-star selection on tap (default: true) */
  allowHalf?: boolean;
  /** Size preset (default: "md") */
  size?: StarRatingSize;
  /** Custom star size in pixels (overrides preset) */
  starSize?: number;
  /** Active (filled) color (default: theme.colors.warning) */
  activeColor?: string;
  /** Inactive (empty) color (default: theme.colors.textMuted + opacity) */
  inactiveColor?: string;
  /** Show numeric label next to stars (default: false) */
  showLabel?: boolean;
  /** Custom label format (default: "4.5") */
  labelFormat?: (rating: number) => string;
  /** Gap between stars (default: 4) */
  gap?: number;
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

/* ── Size Map ──────────────────────────────────────── */

const SIZE_MAP: Record<StarRatingSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 40,
};

/* ── Single Star ───────────────────────────────────── */

function StarItem({
  index,
  rating,
  maxRating,
  starSize,
  activeColor,
  inactiveColor,
  allowHalf,
  interactive,
  onChange,
}: {
  index: number;
  rating: number;
  maxRating: number;
  starSize: number;
  activeColor: string;
  inactiveColor: string;
  allowHalf: boolean;
  interactive: boolean;
  onChange?: (rating: number) => void;
}) {
  const scale = useSharedValue(1);
  const { t } = useAppTranslation();

  const starValue = index + 1;
  const isFull = rating >= starValue;
  const isHalf = !isFull && rating >= starValue - 0.5;

  const handlePress = useCallback(() => {
    if (!interactive || !onChange) return;
    haptics.impact("light");
    scale.value = withSequence(
      withSpring(1.25, { damping: 6, stiffness: 300 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );

    if (allowHalf) {
      // If tapping the same full star, go to half; if half, go to full; else set full
      if (rating === starValue) {
        onChange(starValue - 0.5);
      } else if (rating === starValue - 0.5) {
        onChange(starValue);
      } else {
        onChange(starValue);
      }
    } else {
      // Toggle same star to 0, else set to this star
      onChange(rating === starValue ? 0 : starValue);
    }
  }, [interactive, onChange, rating, starValue, allowHalf, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const renderStar = () => {
    if (isFull) {
      return (
        <Star
          size={starSize}
          color={activeColor}
          fill={activeColor}
          strokeWidth={1.5}
        />
      );
    }
    if (isHalf) {
      // Render half star with a clipped full star + empty star layered
      return (
        <View style={{ width: starSize, height: starSize }}>
          {/* Empty star as background */}
          <Star
            size={starSize}
            color={inactiveColor}
            fill="transparent"
            strokeWidth={1.5}
            style={{ position: "absolute" }}
          />
          {/* Half-filled star overlay */}
          <View
            style={{
              position: "absolute",
              width: starSize / 2,
              height: starSize,
              overflow: "hidden",
            }}
          >
            <Star
              size={starSize}
              color={activeColor}
              fill={activeColor}
              strokeWidth={1.5}
            />
          </View>
        </View>
      );
    }
    // Empty
    return (
      <Star
        size={starSize}
        color={inactiveColor}
        fill="transparent"
        strokeWidth={1.5}
      />
    );
  };

  if (interactive) {
    return (
      <Pressable
        onPress={handlePress}
        accessibilityLabel={t("review.starA11y", { count: starValue })}
        accessibilityRole="button"
        hitSlop={4}
      >
        <Animated.View style={animStyle}>{renderStar()}</Animated.View>
      </Pressable>
    );
  }

  return <Animated.View style={animStyle}>{renderStar()}</Animated.View>;
}

/* ── Component ─────────────────────────────────────── */

export function StarRating({
  rating,
  onChange,
  maxStars = 5,
  allowHalf = true,
  size = "md",
  starSize: customStarSize,
  activeColor,
  inactiveColor,
  showLabel = false,
  labelFormat,
  gap = 4,
  style,
}: StarRatingProps) {
  const { theme } = useTheme();
  const sSize = customStarSize ?? SIZE_MAP[size];
  const active = activeColor ?? theme.colors.warning ?? "#F5A623";
  const inactive = inactiveColor ?? theme.colors.textMuted + "60";
  const interactive = !!onChange;

  const label = labelFormat
    ? labelFormat(rating)
    : rating % 1 === 0
      ? `${rating}.0`
      : `${rating}`;

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="adjustable"
      accessibilityValue={{
        min: 0,
        max: maxStars,
        now: rating,
        text: `${rating} out of ${maxStars} stars`,
      }}
    >
      <View style={[styles.stars, { gap }]}>
        {Array.from({ length: maxStars }).map((_, i) => (
          <StarItem
            key={i}
            index={i}
            rating={rating}
            maxRating={maxStars}
            starSize={sSize}
            activeColor={active}
            inactiveColor={inactive}
            allowHalf={allowHalf}
            interactive={interactive}
            onChange={onChange}
          />
        ))}
      </View>
      {showLabel && (
        <TText
          style={{
            marginLeft: 8,
            fontSize:
              sSize <= 20
                ? theme.typography.fontSize.sm
                : theme.typography.fontSize.base,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.text,
          }}
        >
          {label}
        </TText>
      )}
    </View>
  );
}

/* ── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  stars: {
    flexDirection: "row",
    alignItems: "center",
  },
});
