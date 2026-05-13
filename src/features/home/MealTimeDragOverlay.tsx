/**
 * MealTimeDragOverlay
 *
 * Full-screen modal used after a long-press on a meal card: user drags a
 * ghost of the card and releases over a meal-time section (Breakfast / …)
 * to reassign `mealTime`. Hit-testing uses `measureInWindow` rects from the
 * home list (passed in from the parent).
 */

import { Image } from "expo-image";
import React, { useCallback, useEffect, useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import type { MealEntry } from "../nutrition/nutrition.types";
import type { MealTime } from "../nutrition/mealtime";
import { formatFoodName } from "../../utils/formatFoodName";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../../ui/glass/GlassSurface";
import { TText } from "../../ui/primitives/TText";
import {
  getMealDisplayImagePath,
  getMealDisplayImageUri,
} from "../meals/getMealDisplayImageUri";
import { useMealImageSource } from "../food-logging/useMealImageSource";

export type MealSectionRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface MealTimeDragOverlayProps {
  visible: boolean;
  meal: MealEntry;
  sourceMealTime: MealTime;
  cardRect: { x: number; y: number; width: number; height: number };
  finger: { pageX: number; pageY: number };
  sectionRects: Partial<Record<MealTime, MealSectionRect>>;
  mealOrder: readonly MealTime[];
  onFinish: (target: MealTime | null) => void;
}

function hitTestMealSection(
  x: number,
  y: number,
  mealOrder: readonly MealTime[],
  sectionRects: Partial<Record<MealTime, MealSectionRect>>
): MealTime | null {
  for (const mt of mealOrder) {
    const r = sectionRects[mt];
    if (!r) continue;
    if (
      x >= r.x &&
      x <= r.x + r.width &&
      y >= r.y &&
      y <= r.y + r.height
    ) {
      return mt;
    }
  }
  return null;
}

function GhostCard({
  meal,
  width,
  height,
}: {
  meal: MealEntry;
  width: number;
  height: number;
}) {
  const { theme } = useTheme();
  const displayTitle = formatFoodName(meal.title);
  const fallbackUri = getMealDisplayImageUri({
    imageUri: meal.imageUri,
    imageUrl: meal.imageUrl,
    thumbnailUri: meal.thumbnailUri,
  });
  const { uri: displayImageUri } = useMealImageSource({
    imagePath: getMealDisplayImagePath({ imagePath: meal.imagePath }),
    imageUri: fallbackUri,
  });

  return (
    <GlassSurface
      variant="card"
      intensity="light"
      style={[styles.ghostShell, { width, minHeight: height }]}
    >
      {displayImageUri ? (
        <Image
          source={{ uri: displayImageUri }}
          style={styles.ghostImg}
          contentFit="cover"
        />
      ) : (
        <View
          style={[
            styles.ghostEmojiWrap,
            {
              backgroundColor:
                theme.mode === "dark"
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
            },
          ]}
        >
          <TText style={styles.ghostEmoji}>{meal.emoji ?? "🍽️"}</TText>
        </View>
      )}
      <View style={styles.ghostTextCol}>
        <TText
          style={[styles.ghostTitle, { color: theme.colors.text }]}
          numberOfLines={2}
        >
          {displayTitle}
        </TText>
        <TText style={[styles.ghostCals, { color: theme.colors.textSecondary }]}>
          {meal.calories} kcal
        </TText>
      </View>
    </GlassSurface>
  );
}

export function MealTimeDragOverlay({
  visible,
  meal,
  sourceMealTime,
  cardRect,
  finger: _finger,
  sectionRects,
  mealOrder,
  onFinish,
}: MealTimeDragOverlayProps) {
  const { theme } = useTheme();
  const [hoveredSection, setHoveredSection] = useState<MealTime | null>(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const lift = useSharedValue(1);

  useEffect(() => {
    if (!visible) return;
    translateX.value = 0;
    translateY.value = 0;
    lift.value = withSpring(1.03, { damping: 18, stiffness: 320 });
    return () => {
      lift.value = 1;
    };
  }, [visible, cardRect, translateX, translateY, lift]);

  const clearHover = useCallback(() => setHoveredSection(null), []);

  const updateHover = useCallback(
    (x: number, y: number) => {
      const hit = hitTestMealSection(x, y, mealOrder, sectionRects);
      setHoveredSection(hit);
    },
    [mealOrder, sectionRects]
  );

  const finishAt = useCallback(
    (absoluteX: number, absoluteY: number) => {
      clearHover();
      const hit = hitTestMealSection(
        absoluteX,
        absoluteY,
        mealOrder,
        sectionRects
      );
      if (hit && hit !== sourceMealTime) {
        onFinish(hit);
      } else {
        onFinish(null);
      }
    },
    [mealOrder, onFinish, sectionRects, sourceMealTime, clearHover]
  );

  const cancel = useCallback(() => {
    clearHover();
    onFinish(null);
  }, [onFinish, clearHover]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY;
      runOnJS(updateHover)(e.absoluteX, e.absoluteY);
    })
    .onEnd((e) => {
      runOnJS(finishAt)(e.absoluteX, e.absoluteY);
    })
    .onFinalize(() => {
      runOnJS(clearHover)();
    });

  const ghostStyle = useAnimatedStyle(() => ({
    position: "absolute",
    left: cardRect.x,
    top: cardRect.y,
    width: cardRect.width,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: lift.value },
    ],
    zIndex: 2,
  }));

  if (!visible) return null;

  const dropTint =
    theme.mode === "dark"
      ? "rgba(46, 213, 115, 0.12)"
      : "rgba(46, 213, 115, 0.08)";

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={cancel}
    >
      <View style={styles.modalRoot} pointerEvents="box-none">
        {mealOrder.map((mt) => {
          const r = sectionRects[mt];
          if (!r) return null;
          const active = hoveredSection === mt;
          return (
            <View
              key={`dz-${mt}`}
              pointerEvents="none"
              style={[
                styles.dropZone,
                {
                  left: r.x,
                  top: r.y,
                  width: r.width,
                  height: r.height,
                  borderColor: theme.colors.primary,
                  borderWidth: active ? 2 : 0,
                  backgroundColor: active ? dropTint : "transparent",
                },
              ]}
            />
          );
        })}
        <GestureDetector gesture={pan}>
          <Animated.View style={ghostStyle} pointerEvents="box-none">
            <GhostCard
              meal={meal}
              width={cardRect.width}
              height={cardRect.height}
            />
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "transparent",
  },
  dropZone: {
    position: "absolute",
    borderRadius: 16,
  },
  ghostShell: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  ghostImg: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  ghostEmojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostEmoji: {
    fontSize: 24,
  },
  ghostTextCol: {
    flex: 1,
    gap: 2,
  },
  ghostTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  ghostCals: {
    fontSize: 12,
    fontWeight: "500",
  },
});
