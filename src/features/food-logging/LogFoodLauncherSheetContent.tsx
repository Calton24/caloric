/**
 * Shared “+” log launcher UI — keyboard / mic / camera row + frequent foods.
 * Rendered inside the root BottomSheetProvider so it matches Home FAB behavior.
 */

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { Pressable, View } from "react-native";
import {
  type FoodMemoryEntry,
  getFrequentFoods,
  hasMemory,
} from "../nutrition/memory/food-memory.service";
import { useNutritionDraftStore } from "../nutrition/nutrition.draft.store";
import type { MealDraft } from "../nutrition/nutrition.draft.types";
import { ManualLogSheet } from "../../ui/components/ManualLogSheet";
import { VoiceLogSheet } from "../../ui/components/VoiceLogSheet";
import { TText } from "../../ui/primitives/TText";
import { useBottomSheet } from "../../ui/sheets/useBottomSheet";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";

function memoryToDraft(entry: FoodMemoryEntry): MealDraft {
  return {
    title: entry.name,
    source: "manual",
    rawInput: entry.name,
    calories: entry.lastCalories,
    protein: entry.lastProtein,
    carbs: entry.lastCarbs,
    fat: entry.lastFat,
    emoji: entry.emoji,
    confidence: 1.0,
    parseMethod: "quick-log",
  };
}

export type LogFoodLauncherVariant = "home" | "confirm";

export interface LogFoodLauncherSheetContentProps {
  variant: LogFoodLauncherVariant;
  /** Home tab only — ISO date string for the selected calendar day */
  homeSelectedDate?: string;
  homeIsToday?: boolean;
}

export function LogFoodLauncherSheetContent({
  variant,
  homeSelectedDate,
  homeIsToday,
}: LogFoodLauncherSheetContentProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const { open: openSheet, close: closeSheet } = useBottomSheet();
  const setDraft = useNutritionDraftStore((s) => s.setDraft);
  const setLogDate = useNutritionDraftStore((s) => s.setLogDate);
  const confirmLogDate = useNutritionDraftStore((s) => s.logDate);

  const syncLogDateForSubSheet = useCallback(() => {
    if (variant === "home" && homeSelectedDate !== undefined) {
      setLogDate(homeIsToday ? null : homeSelectedDate);
    }
  }, [variant, homeIsToday, homeSelectedDate, setLogDate]);

  const openManualLog = useCallback(() => {
    syncLogDateForSubSheet();
    openSheet(<ManualLogSheet onClose={closeSheet} />, {
      snapPoints: ["55%"],
      enablePanDownToClose: true,
    });
  }, [openSheet, closeSheet, syncLogDateForSubSheet]);

  const openVoiceLog = useCallback(() => {
    syncLogDateForSubSheet();
    openSheet(<VoiceLogSheet onClose={closeSheet} />, {
      snapPoints: ["55%"],
      enablePanDownToClose: true,
    });
  }, [openSheet, closeSheet, syncLogDateForSubSheet]);

  const frequentFoods = hasMemory() ? getFrequentFoods(15) : [];

  const handleQuickLog = useCallback(
    (entry: FoodMemoryEntry) => {
      closeSheet(undefined, { immediate: true });
      const d = memoryToDraft(entry);
      if (variant === "home" && homeSelectedDate && !homeIsToday) {
        d.loggedAt = homeSelectedDate;
      }
      if (variant === "confirm" && confirmLogDate) {
        d.loggedAt = confirmLogDate;
      }
      setDraft(d);
      if (variant === "home") {
        router.push("/(modals)/confirm-meal" as never);
      }
    },
    [
      closeSheet,
      setDraft,
      router,
      variant,
      homeSelectedDate,
      homeIsToday,
      confirmLogDate,
    ]
  );

  return (
    <View style={{ flex: 1, paddingTop: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 28,
          paddingVertical: 20,
          paddingHorizontal: 20,
        }}
      >
        <Pressable
          onPress={openManualLog}
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primary,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          })}
        >
          <MaterialCommunityIcons
            name="keyboard-outline"
            size={24}
            color={theme.colors.textInverse}
          />
        </Pressable>

        <Pressable
          onPress={openVoiceLog}
          style={({ pressed }) => ({
            alignItems: "center",
            justifyContent: "center",
            transform: [{ scale: pressed ? 0.95 : 1 }],
          })}
        >
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                position: "absolute",
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: theme.colors.primary + "30",
              }}
            />
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name="mic"
                size={30}
                color={theme.colors.textInverse}
              />
            </LinearGradient>
          </View>
        </Pressable>

        <Pressable
          onPress={() => {
            closeSheet(undefined, { immediate: true });
            router.push("/(modals)/camera-log" as never);
          }}
          style={({ pressed }) => ({
            width: 56,
            height: 56,
            borderRadius: 28,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: theme.colors.primary,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          })}
        >
          <Ionicons name="camera" size={24} color={theme.colors.textInverse} />
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 12,
        }}
      >
        <TText
          style={{
            fontSize: 15,
            fontWeight: "500",
            color: theme.colors.textSecondary,
          }}
        >
          {t("home.frequentlyAdded")}
        </TText>
        <Pressable
          onPress={() => {
            closeSheet(undefined, { immediate: true });
            router.push("/(modals)/manual-log" as never);
          }}
          hitSlop={8}
          style={({ pressed }) => ({
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: theme.colors.surfaceSecondary,
            alignItems: "center",
            justifyContent: "center",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons
            name="search"
            size={18}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </View>

      {frequentFoods.length > 0 ? (
        <View style={{ paddingHorizontal: 16, gap: 10, paddingBottom: 40 }}>
          {frequentFoods.map((entry) => (
            <Pressable
              key={entry.name}
              onPress={() => handleQuickLog(entry)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: theme.colors.surfaceSecondary,
                borderRadius: 14,
                paddingVertical: 14,
                paddingHorizontal: 16,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <TText style={{ fontSize: 28, marginRight: 14 }}>
                {entry.emoji ?? "🍽"}
              </TText>
              <View style={{ flex: 1 }}>
                <TText
                  style={{
                    fontSize: 15,
                    fontWeight: "600",
                    color: theme.colors.text,
                  }}
                  numberOfLines={2}
                >
                  {entry.name}
                </TText>
                <TText
                  style={{
                    fontSize: 13,
                    color: theme.colors.textSecondary,
                    marginTop: 2,
                  }}
                >
                  {entry.lastCalories} {t("tracking.kcal")}
                </TText>
              </View>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: theme.colors.surface,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add" size={18} color={theme.colors.text} />
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View
          style={{
            paddingHorizontal: 20,
            paddingVertical: 40,
            alignItems: "center",
          }}
        >
          <TText
            style={{
              fontSize: 14,
              color: theme.colors.textMuted,
              textAlign: "center",
            }}
          >
            {t("home.logFirstMeal")}
          </TText>
        </View>
      )}
    </View>
  );
}
