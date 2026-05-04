/**
 * ReviewSheet
 * Review / comment form that opens in the bottom sheet.
 *
 * Features:
 * - 5-star interactive rating with animated press scale
 * - Multi-line text input for review body
 * - Optional title field
 * - Submit / Cancel buttons
 * - Loading state during submission
 * - Uses existing BottomSheetProvider (glass blur background)
 * - Token-driven via useTheme()
 * - Accessible star labels
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
} from "react-native-reanimated";
import { useAppTranslation } from "../../infrastructure/i18n";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";
import { useBottomSheet } from "../sheets/useBottomSheet";

/* ── Types ─────────────────────────────────────────── */

export interface ReviewPayload {
  rating: number;
  title: string;
  body: string;
}

export interface ReviewModalProps {
  /** Submit handler — return a promise to show loading state */
  onSubmit: (review: ReviewPayload) => void | Promise<void>;
  /** Sheet title (default: "Write a Review") */
  modalTitle?: string;
  /** Placeholder for title input (default: "Title (optional)") */
  titlePlaceholder?: string;
  /** Placeholder for body input (default: "Share your experience…") */
  bodyPlaceholder?: string;
  /** Require a minimum rating before enabling submit (default: 1) */
  minRating?: number;
  /** Show title field (default: true) */
  showTitle?: boolean;
}

/* ── Animated Star ─────────────────────────────────── */

function Star({
  index,
  filled,
  onPress,
  color,
}: {
  index: number;
  filled: boolean;
  onPress: (index: number) => void;
  color: string;
}) {
  const scale = useSharedValue(1);
  const { t } = useAppTranslation();

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withSpring(1.3, { damping: 6, stiffness: 300 }),
      withSpring(1, { damping: 8, stiffness: 200 })
    );
    onPress(index);
  }, [index, onPress, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={handlePress}
      accessibilityLabel={t("review.starLabel", { count: index + 1 })}
      accessibilityRole="button"
      hitSlop={4}
    >
      <Animated.View style={animStyle}>
        <Ionicons
          name={filled ? "star" : "star-outline"}
          size={36}
          color={filled ? color : color + "40"}
        />
      </Animated.View>
    </Pressable>
  );
}

/* ── Inner Sheet Content ───────────────────────────── */

function ReviewSheetContent({
  onSubmit,
  onClose,
  modalTitle,
  titlePlaceholder,
  bodyPlaceholder,
  minRating,
  showTitle,
}: ReviewModalProps & { onClose: () => void }) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const starColor = theme.colors.warning ?? "#F5A623";
  const canSubmit = rating >= (minRating ?? 1) && !loading;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      await onSubmit({ rating, title, body });
      setRating(0);
      setTitle("");
      setBody("");
      onClose();
    } catch {
      // keep sheet open on error
    } finally {
      setLoading(false);
    }
  }, [canSubmit, onSubmit, rating, title, body, onClose]);

  return (
    <View style={styles.sheetContent}>
      {/* Header */}
      <View style={styles.header}>
        <TText
          style={{
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            flex: 1,
          }}
        >
          {modalTitle ?? t("review.writeReview")}
        </TText>
        <Pressable onPress={onClose} hitSlop={12}>
          <Ionicons
            name="close-circle"
            size={28}
            color={theme.colors.textMuted}
          />
        </Pressable>
      </View>

      {/* Stars */}
      <View style={styles.stars}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            index={i}
            filled={i < rating}
            onPress={(idx) => setRating(idx + 1)}
            color={starColor}
          />
        ))}
      </View>
      {rating > 0 && (
        <TText
          style={{
            textAlign: "center",
            color: theme.colors.textMuted,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: 12,
          }}
        >
          {
            [
              t("review.terrible"),
              t("review.bad"),
              t("review.okay"),
              t("review.good"),
              t("review.excellent"),
            ][rating - 1]
          }
        </TText>
      )}

      {/* Title input */}
      {(showTitle ?? true) && (
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={titlePlaceholder ?? t("review.titlePlaceholder")}
          placeholderTextColor={theme.colors.textMuted}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surfaceSecondary,
              borderRadius: theme.radius.md,
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.base,
            },
          ]}
        />
      )}

      {/* Body input */}
      <TextInput
        value={body}
        onChangeText={setBody}
        placeholder={bodyPlaceholder ?? t("review.bodyPlaceholder")}
        placeholderTextColor={theme.colors.textMuted}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        style={[
          styles.input,
          styles.bodyInput,
          {
            backgroundColor: theme.colors.surfaceSecondary,
            borderRadius: theme.radius.md,
            color: theme.colors.text,
            fontSize: theme.typography.fontSize.base,
          },
        ]}
      />

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable
          onPress={onClose}
          style={[
            styles.btn,
            {
              backgroundColor: theme.colors.surfaceSecondary,
              borderRadius: theme.radius.md,
            },
          ]}
        >
          <TText
            style={{
              color: theme.colors.text,
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.medium,
            }}
          >
            {t("common.cancel")}
          </TText>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[
            styles.btn,
            {
              backgroundColor: canSubmit
                ? theme.colors.primary
                : theme.colors.primary + "40",
              borderRadius: theme.radius.md,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <TText
              style={{
                color: "#fff",
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.semibold,
              }}
            >
              {t("review.submit")}
            </TText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

/* ── Hook ──────────────────────────────────────────── */

/**
 * useReviewSheet
 * Returns an `openReview()` function that opens a review form
 * in the app's bottom sheet (glass blur background).
 *
 * Usage:
 * ```tsx
 * const openReview = useReviewSheet({
 *   onSubmit: (review) => console.log(review),
 * });
 * <TButton onPress={openReview}>Write a Review</TButton>
 * ```
 */
export function useReviewSheet(props: ReviewModalProps) {
  const sheet = useBottomSheet();

  const openReview = useCallback(() => {
    sheet.open(<ReviewSheetContent {...props} onClose={sheet.close} />, {
      snapPoints: ["75%"],
    });
  }, [sheet, props]);

  return openReview;
}

/**
 * ReviewModal (legacy API — now wraps useReviewSheet)
 * @deprecated Use `useReviewSheet` hook instead for bottom-sheet experience.
 */
export function ReviewModal({
  visible,
  onClose,
  ...props
}: ReviewModalProps & { visible: boolean; onClose: () => void }) {
  const sheet = useBottomSheet();

  React.useEffect(() => {
    if (visible) {
      sheet.open(
        <ReviewSheetContent
          {...props}
          onClose={() => {
            sheet.close();
            onClose();
          }}
        />,
        { snapPoints: ["75%"] }
      );
    } else {
      sheet.close();
    }
    // Only react to visibility changes; props/callbacks captured at open time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  return null;
}

/* ── Styles ────────────────────────────────────────── */

const styles = StyleSheet.create({
  sheetContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  stars: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  bodyInput: {
    minHeight: 80,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
