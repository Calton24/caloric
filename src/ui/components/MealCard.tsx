/**
 * MealCard
 * Displays a single meal log entry with emoji, title, time, macros.
 * Supports tap to edit and swipe-to-delete.
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import React, { useRef } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

interface MealCardProps {
  icon?: string;
  imageUri?: string;
  title: string;
  time?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  onPress?: () => void;
  onDelete?: () => void;
}

export function MealCard({
  icon = "🍽",
  imageUri,
  title,
  time,
  calories,
  protein,
  carbs,
  fat,
  onPress,
  onDelete,
}: MealCardProps) {
  const { theme } = useTheme();
  const swipeRef = useRef<Swipeable>(null);

  const handleDelete = () => {
    swipeRef.current?.close();
    Alert.alert("Delete Meal", `Delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: onDelete,
      },
    ]);
  };

  const renderRightActions = () => {
    if (!onDelete) return null;
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
      >
        <Pressable
          onPress={handleDelete}
          style={[styles.deleteAction, { backgroundColor: theme.colors.error }]}
        >
          <Ionicons name="trash-outline" size={22} color="#fff" />
          <TText style={styles.deleteText}>Delete</TText>
        </Pressable>
      </Animated.View>
    );
  };

  const accessibilityLabel = `${title}, ${calories} calories, protein ${Math.round(protein)}g, carbs ${Math.round(carbs)}g, fat ${Math.round(fat)}g`;

  const cardContent = (
    <View
      accessible
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.container,
        { backgroundColor: theme.colors.surfaceSecondary },
      ]}
    >
      {imageUri ? (
        <Image
          source={{ uri: imageUri }}
          style={styles.mealImage}
          contentFit="cover"
        />
      ) : (
        <View style={styles.iconContainer}>
          <TText style={styles.emoji}>{icon}</TText>
        </View>
      )}
      <View style={styles.content}>
        <TText
          style={[styles.title, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {title}
        </TText>
        <TText style={[styles.time, { color: theme.colors.textMuted }]}>
          {time}
        </TText>
        <View style={styles.macroRow}>
          <TText
            style={[styles.macroText, { color: theme.colors.textSecondary }]}
          >
            P {Math.round(protein * 10) / 10}g
          </TText>
          <TText style={[styles.macroDot, { color: theme.colors.textMuted }]}>
            ·
          </TText>
          <TText
            style={[styles.macroText, { color: theme.colors.textSecondary }]}
          >
            C {Math.round(carbs * 10) / 10}g
          </TText>
          <TText style={[styles.macroDot, { color: theme.colors.textMuted }]}>
            ·
          </TText>
          <TText
            style={[styles.macroText, { color: theme.colors.textSecondary }]}
          >
            F {Math.round(fat * 10) / 10}g
          </TText>
        </View>
      </View>
      <View style={styles.calContainer}>
        <TText style={[styles.calories, { color: theme.colors.text }]}>
          {calories}
        </TText>
        <TText style={[styles.calLabel, { color: theme.colors.textMuted }]}>
          cal
        </TText>
      </View>
      {onPress && (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={theme.colors.textMuted}
          style={styles.chevron}
        />
      )}
    </View>
  );

  // If swipe-to-delete is available, wrap in Swipeable
  if (onDelete) {
    return (
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        {onPress ? (
          <Pressable
            onPress={onPress}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
          >
            {cardContent}
          </Pressable>
        ) : (
          cardContent
        )}
      </Swipeable>
    );
  }

  // No swipe — just optionally pressable
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      >
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  mealImage: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  emoji: {
    fontSize: 24,
  },
  content: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
  },
  time: {
    fontSize: 12,
    fontWeight: "400",
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  macroText: {
    fontSize: 11,
    fontWeight: "500",
  },
  macroDot: {
    fontSize: 11,
  },
  calContainer: {
    alignItems: "flex-end",
  },
  calories: {
    fontSize: 18,
    fontWeight: "700",
  },
  calLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  chevron: {
    marginLeft: -4,
  },
  deleteAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderRadius: 14,
    marginLeft: 8,
    gap: 4,
  },
  deleteText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
