/**
 * Home reminder for an AI/barcoded meal draft that was not saved yet.
 * Backed by persisted pending-meal-review store (not route-local state).
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { PendingMealReview } from "../../features/nutrition/pending-meal-review.types";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

export interface PendingMealReviewCardProps {
  pending: PendingMealReview;
  onReview: () => void;
  onDismiss: () => void;
}

export function PendingMealReviewCard({
  pending,
  onReview,
  onDismiss,
}: PendingMealReviewCardProps) {
  const { theme } = useTheme();
  const thumbUri = pending.imageUri ?? pending.draft.imageUri;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={styles.row}>
        <Pressable
          onPress={onReview}
          style={styles.mainTap}
          accessibilityRole="button"
          accessibilityLabel={`Review ${pending.title}`}
        >
          <View style={styles.thumbWrap}>
            {thumbUri ? (
              <Image
                source={{ uri: thumbUri }}
                style={styles.thumb}
                contentFit="cover"
              />
            ) : (
              <View
                style={[
                  styles.thumbPlaceholder,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Ionicons
                  name="restaurant"
                  size={22}
                  color={theme.colors.textMuted}
                />
              </View>
            )}
          </View>
          <View style={styles.textCol}>
            <TText
              numberOfLines={1}
              style={{ fontSize: 16, fontWeight: "600", color: theme.colors.text }}
            >
              {pending.title}
            </TText>
            <TText
              style={{ fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 }}
            >
              {Math.round(pending.calories)} kcal detected
            </TText>
          </View>
        </Pressable>
        <Pressable
          onPress={onReview}
          style={[
            styles.reviewBtn,
            { backgroundColor: theme.colors.primary },
          ]}
          hitSlop={8}
        >
          <TText style={{ color: theme.colors.textInverse, fontWeight: "600" }}>
            Review
          </TText>
        </Pressable>
        <Pressable
          onPress={onDismiss}
          style={styles.dismiss}
          hitSlop={10}
          accessibilityLabel="Dismiss pending review"
        >
          <Ionicons name="close" size={20} color={theme.colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 10,
    paddingLeft: 12,
    paddingRight: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  mainTap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  thumbWrap: {
    marginRight: 10,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
  },
  thumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  reviewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 6,
  },
  dismiss: {
    padding: 6,
    marginLeft: 2,
  },
});
