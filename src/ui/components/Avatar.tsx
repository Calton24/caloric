/**
 * Avatar
 * Circular user avatar with image, initials fallback, and placeholder icon.
 *
 * Priority: image → initials (derived from name) → generic person icon.
 * Features:
 * - 5 sizes: xs (24), sm (32), md (40), lg (56), xl (80)
 * - Optional status badge (online/offline/busy/away)
 * - Optional border ring
 * - Press handler for profile navigation
 * - Token-driven colors via useTheme()
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useMemo, useState } from "react";
import {
    Image,
    ImageSourcePropType,
    Pressable,
    StyleProp,
    StyleSheet,
    View,
    ViewStyle,
} from "react-native";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

/* ── Types ─────────────────────────────────────────── */

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarStatus = "online" | "offline" | "busy" | "away";

const SIZE_MAP: Record<AvatarSize, number> = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 56,
  xl: 80,
};

const FONT_SCALE: Record<AvatarSize, number> = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 20,
  xl: 28,
};

const ICON_SCALE: Record<AvatarSize, number> = {
  xs: 14,
  sm: 18,
  md: 22,
  lg: 30,
  xl: 42,
};

const STATUS_SIZE: Record<AvatarSize, number> = {
  xs: 8,
  sm: 10,
  md: 12,
  lg: 16,
  xl: 20,
};

export interface AvatarProps {
  /** Image URI string or ImageSource */
  source?: string | ImageSourcePropType;
  /** User's display name — used to derive initials */
  name?: string;
  /** Size preset (default: md) */
  size?: AvatarSize;
  /** Status badge */
  status?: AvatarStatus;
  /** Show border ring */
  bordered?: boolean;
  /** Press handler */
  onPress?: () => void;
  /** Container style */
  style?: StyleProp<ViewStyle>;
  /** Accessibility label override */
  accessibilityLabel?: string;
}

/* ── Helpers ───────────────────────────────────────── */

function getInitials(name?: string): string {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const STATUS_COLORS: Record<AvatarStatus, string> = {
  online: "#34C759",
  offline: "#8E8E93",
  busy: "#FF3B30",
  away: "#FF9500",
};

/* ── Component ─────────────────────────────────────── */

export function Avatar({
  source,
  name,
  size = "md",
  status,
  bordered = false,
  onPress,
  style,
  accessibilityLabel,
}: AvatarProps) {
  const { theme } = useTheme();
  const [imageError, setImageError] = useState(false);

  const dim = SIZE_MAP[size];
  const initials = useMemo(() => getInitials(name), [name]);

  const imageSource: ImageSourcePropType | null = useMemo(() => {
    if (!source) return null;
    if (typeof source === "string") return { uri: source };
    return source;
  }, [source]);

  const showImage = !!imageSource && !imageError;
  const showInitials = !showImage && initials.length > 0;

  const handleImageError = useCallback(() => setImageError(true), []);

  const containerStyle: ViewStyle = {
    width: dim,
    height: dim,
    borderRadius: dim / 2,
    backgroundColor: showImage
      ? theme.colors.surfaceSecondary
      : theme.colors.primary + "20",
    ...(bordered && {
      borderWidth: 2,
      borderColor: theme.colors.primary,
    }),
  };

  // Outer wrapper must NOT clip so the status badge can overhang
  const wrapperStyle: ViewStyle = {
    width: dim,
    height: dim,
  };

  const content = (
    <View style={[styles.wrapper, wrapperStyle, style]}>
      <View
        style={[styles.container, containerStyle]}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel ?? name ?? "Avatar"}
      >
        {showImage && (
          <Image
            source={imageSource!}
            style={[
              styles.image,
              { width: dim, height: dim, borderRadius: dim / 2 },
            ]}
            onError={handleImageError}
          />
        )}

        {showInitials && (
          <TText
            style={{
              fontSize: FONT_SCALE[size],
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.primary,
            }}
          >
            {initials}
          </TText>
        )}

        {!showImage && !showInitials && (
          <Ionicons
            name="person"
            size={ICON_SCALE[size]}
            color={theme.colors.textMuted}
          />
        )}
      </View>

      {/* Status badge — positioned on the wrapper so it's never clipped */}
      {status && (
        <View
          style={[
            styles.statusBadge,
            {
              width: STATUS_SIZE[size],
              height: STATUS_SIZE[size],
              borderRadius: STATUS_SIZE[size] / 2,
              backgroundColor: STATUS_COLORS[status],
              borderWidth: 2,
              borderColor: theme.colors.background,
              bottom: -(STATUS_SIZE[size] * 0.1),
              right: -(STATUS_SIZE[size] * 0.1),
            },
          ]}
        />
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return content;
}

/* ── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  wrapper: {
    // No overflow: "hidden" — status badge must overhang
  },
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden", // Clips image to circle
  },
  image: {
    resizeMode: "cover",
  },
  statusBadge: {
    position: "absolute",
  },
});
