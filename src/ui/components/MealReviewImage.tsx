/**
 * MealReviewImage
 *
 * Renders the captured food photo on the confirm-meal screen. Resolves
 * the best image source via {@link useMealImageSource} so the same
 * signed-URL cache is shared with the Home pending-review thumbnails:
 *
 *   1. Signed URL from `imagePath` (server-authoritative, private bucket)
 *   2. Local `imageUri` (durable copy or original capture)
 *   3. nothing — component renders null so callers stay layout-safe
 *
 * If the resolved signed URL itself fails to load (rotation, expiry), we
 * invalidate the cache entry and retry on the next render.
 */

import { Image } from "expo-image";
import React from "react";
import { StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import {
  invalidateSignedUrl,
  useMealImageSource,
} from "../../features/food-logging/useMealImageSource";
import { useTheme } from "../../theme/useTheme";

export interface MealReviewImageProps {
  /** Local file URI captured by the camera (may be invalid after restart). */
  imageUri?: string | null;
  /** Storage object path in `meal-review-images` (preferred when set). */
  imagePath?: string | null;
  /** Optional accessibility label, e.g. the food title. */
  accessibilityLabel?: string;
}

export function MealReviewImage({
  imageUri,
  imagePath,
  accessibilityLabel,
}: MealReviewImageProps) {
  const { theme } = useTheme();
  const { uri } = useMealImageSource({ imageUri, imagePath });

  if (!uri) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={[
        styles.wrapper,
        { backgroundColor: theme.colors.surfaceSecondary },
      ]}
    >
      <Image
        source={{ uri }}
        style={styles.image}
        contentFit="cover"
        cachePolicy="memory-disk"
        accessibilityLabel={accessibilityLabel}
        onError={() => {
          if (imagePath) invalidateSignedUrl(imagePath);
        }}
        transition={120}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    aspectRatio: 16 / 10,
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 12,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
