/**
 * WaterCard
 *
 * Compact hydration tracker card with animated water glass icon,
 * current intake display, and +/- buttons.
 * Sits below the calorie ring on the home screen.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

interface WaterCardProps {
  /** Current water intake in ml */
  currentMl: number;
  /** Goal in ml */
  goalMl: number;
  /** Increment size in ml */
  incrementMl?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onSettings?: () => void;
}

/** Small animated water glass that fills from bottom to top */
function WaterGlass({ progress }: { progress: number }) {
  const fillHeight = useSharedValue(0);

  useEffect(() => {
    fillHeight.value = withSpring(Math.min(progress, 1), {
      damping: 14,
      stiffness: 120,
    });
  }, [progress, fillHeight]);

  const fillStyle = useAnimatedStyle(() => ({
    height: `${fillHeight.value * 100}%`,
  }));

  return (
    <View style={styles.glassOuter}>
      <View style={styles.glassInner}>
        <Animated.View style={[styles.glassFill, fillStyle]} />
      </View>
    </View>
  );
}

export function WaterCard({
  currentMl,
  goalMl,
  incrementMl = 250,
  onIncrement,
  onDecrement,
  onSettings,
}: WaterCardProps) {
  const { theme } = useTheme();
  const progress = goalMl > 0 ? currentMl / goalMl : 0;
  const isComplete = currentMl >= goalMl && goalMl > 0;

  const formatAmount = (ml: number) => {
    if (ml >= 1000) {
      const litres = ml / 1000;
      return `${litres % 1 === 0 ? litres.toFixed(0) : litres.toFixed(1)} L`;
    }
    return `${Math.round(ml)} ml`;
  };

  return (
    <View
      testID="water-card"
      style={[
        styles.container,
        { backgroundColor: theme.colors.surfaceSecondary },
      ]}
    >
      {/* Left: animated glass icon + info */}
      <View style={styles.left}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.surface }]}>
          <WaterGlass progress={progress} />
        </View>

        <View style={styles.info}>
          <TText style={[styles.label, { color: theme.colors.text }]}>
            Water
          </TText>
          <View style={styles.amountRow}>
            <TText
              style={[
                styles.amount,
                {
                  color: isComplete
                    ? theme.colors.success
                    : theme.colors.textSecondary,
                },
              ]}
            >
              {formatAmount(currentMl)}
            </TText>
            {onSettings && (
              <Pressable onPress={onSettings} hitSlop={8}>
                <Ionicons
                  name="settings-outline"
                  size={14}
                  color={theme.colors.textMuted}
                />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Right: +/- buttons */}
      <View style={styles.controls}>
        <Pressable
          onPress={onDecrement}
          hitSlop={8}
          accessibilityLabel="Remove water"
          style={({ pressed }) => [
            styles.controlBtn,
            { borderColor: theme.colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons
            name="remove"
            size={18}
            color={theme.colors.textSecondary}
          />
        </Pressable>
        <Pressable
          onPress={onIncrement}
          hitSlop={8}
          accessibilityLabel="Add water"
          style={({ pressed }) => [
            styles.controlBtn,
            styles.controlBtnFilled,
            {
              backgroundColor: theme.colors.text,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons
            name="add"
            size={18}
            color={theme.colors.textInverse}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  left: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  /* ── Water glass shape ── */
  glassOuter: {
    width: 20,
    height: 26,
    borderWidth: 2,
    borderColor: "#5AC8FA",
    borderRadius: 3,
    borderTopLeftRadius: 1,
    borderTopRightRadius: 1,
    overflow: "hidden",
  },
  glassInner: {
    flex: 1,
    justifyContent: "flex-end",
  },
  glassFill: {
    width: "100%",
    backgroundColor: "#5AC8FA",
    borderBottomLeftRadius: 1,
    borderBottomRightRadius: 1,
  },
  info: {
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  amount: {
    fontSize: 13,
    fontWeight: "500",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
    gap: 10,
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnFilled: {
    borderWidth: 0,
  },
});
