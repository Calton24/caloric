/**
 * Log Weight Modal
 *
 * Quick weight entry with a stepper control.
 * Presented as a modal from the Progress screen.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUnits } from "../hooks/useUnits";
import { useProfileStore, useProgressStore } from "../src/stores";
import { useTheme } from "../src/theme/useTheme";
import { TSpacer } from "../src/ui/primitives/TSpacer";
import { TText } from "../src/ui/primitives/TText";

export default function LogWeightScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const units = useUnits();

  // ── Domain stores ──
  const profile = useProfileStore((s) => s.profile);
  const addWeightLog = useProgressStore((s) => s.addWeightLog);
  const weightLogs = useProgressStore((s) => s.weightLogs);
  const latestWeight = weightLogs.length > 0 ? weightLogs[0].weightLbs : null;

  const [weight, setWeight] = useState(
    Number(units.display(latestWeight ?? profile.currentWeightLbs ?? 0))
  );

  const increment = (amount: number) => {
    setWeight((w) => Math.round((w + amount) * 10) / 10);
  };

  const handleSave = () => {
    addWeightLog({
      id: `wl_${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      weightLbs: units.toLbs(weight),
    });
    router.back();
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <TText
              style={[styles.cancelText, { color: theme.colors.textMuted }]}
            >
              Cancel
            </TText>
          </Pressable>
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            Log Weight
          </TText>
          <View style={{ width: 50 }} />
        </View>

        <View style={styles.content}>
          {/* Date */}
          <Animated.View entering={FadeIn.duration(400)}>
            <TText
              style={[styles.dateText, { color: theme.colors.textSecondary }]}
            >
              Today,{" "}
              {new Date().toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </TText>
          </Animated.View>

          <TSpacer size="xxl" />

          {/* Weight display */}
          <Animated.View
            entering={FadeIn.duration(500).delay(100)}
            style={styles.weightDisplay}
          >
            <TText style={[styles.weightValue, { color: theme.colors.text }]}>
              {weight.toFixed(1)}
            </TText>
            <TText
              style={[styles.weightUnit, { color: theme.colors.textMuted }]}
            >
              {units.label}
            </TText>
          </Animated.View>

          <TSpacer size="xl" />

          {/* Stepper controls */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(200)}
            style={styles.stepperRow}
          >
            {/* -1.0 */}
            <Pressable
              onPress={() => increment(-units.largeStep)}
              style={[
                styles.stepperBtn,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <TText style={[styles.stepperText, { color: theme.colors.text }]}>
                -{units.largeStep}
              </TText>
            </Pressable>

            {/* -step */}
            <Pressable
              onPress={() => increment(-units.step)}
              style={[
                styles.stepperBtn,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <TText style={[styles.stepperText, { color: theme.colors.text }]}>
                -{units.step}
              </TText>
            </Pressable>

            {/* +step */}
            <Pressable
              onPress={() => increment(units.step)}
              style={[
                styles.stepperBtn,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <TText style={[styles.stepperText, { color: theme.colors.text }]}>
                +{units.step}
              </TText>
            </Pressable>

            {/* +largeStep */}
            <Pressable
              onPress={() => increment(units.largeStep)}
              style={[
                styles.stepperBtn,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <TText style={[styles.stepperText, { color: theme.colors.text }]}>
                +{units.largeStep}
              </TText>
            </Pressable>
          </Animated.View>

          <TSpacer size="md" />

          {/* Comparison to goal */}
          <Animated.View entering={FadeIn.duration(400).delay(300)}>
            <View style={styles.goalRow}>
              <Ionicons name="flag" size={16} color={theme.colors.success} />
              <TText
                style={[styles.goalText, { color: theme.colors.textSecondary }]}
              >
                Goal: {units.display(profile.goalWeightLbs ?? 0)} {units.label}{" "}
                (
                {(
                  weight - Number(units.display(profile.goalWeightLbs ?? 0))
                ).toFixed(1)}{" "}
                {units.label} to go)
              </TText>
            </View>
          </Animated.View>
        </View>

        {/* Save button */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(400)}
          style={styles.bottomAction}
        >
          <Pressable
            onPress={handleSave}
            style={({ pressed }) => [
              styles.saveBtn,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.saveGradient}
            >
              <Ionicons
                name="checkmark"
                size={22}
                color={theme.colors.textInverse}
              />
              <TText
                style={[styles.saveText, { color: theme.colors.textInverse }]}
              >
                Save Weight
              </TText>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  dateText: {
    fontSize: 15,
    fontWeight: "500",
  },
  weightDisplay: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  weightValue: {
    fontSize: 64,
    fontWeight: "700",
    letterSpacing: -2,
  },
  weightUnit: {
    fontSize: 22,
    fontWeight: "500",
  },
  stepperRow: {
    flexDirection: "row",
    gap: 12,
  },
  stepperBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    minWidth: 70,
    alignItems: "center",
  },
  stepperText: {
    fontSize: 16,
    fontWeight: "600",
  },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalText: {
    fontSize: 14,
    fontWeight: "500",
  },
  bottomAction: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  saveBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  saveGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
  },
  saveText: {
    fontSize: 17,
    fontWeight: "700",
  },
});
