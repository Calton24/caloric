/**
 * FixWithAISheet
 *
 * "Fix with AI" — bottom sheet that lets the user correct an AI-generated
 * meal draft using natural language. Sits on top of the confirm-meal screen.
 *
 * Behaviour:
 *   - Renders a compact summary (image + title + kcal) of the current draft.
 *   - Free-text input for the correction.
 *   - Submit → calls `correctMealDraftWithAI` → on success the new draft is
 *     applied to the global `useNutritionDraftStore` and the sheet closes
 *     with a success haptic + toast. On failure the original draft is left
 *     untouched and a recoverable error is shown.
 *   - The sheet is "single-purpose" — it does not persist message history
 *     and is not a chatbot.
 *
 * The sheet does NOT mutate any of: imageUri, imagePath, pendingReviewId,
 * source, loggedAt, rawInput. Those are preserved by the service.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { useAppTranslation } from "../../../infrastructure/i18n";
import { haptics } from "../../../infrastructure/haptics";
import { addFoodLoggingBreadcrumb } from "../../../infrastructure/errorReporting/foodLoggingErrors";
import { useTheme } from "../../../theme/useTheme";
import { useToast } from "../../../ui/components/Toast";
import { MealReviewImage } from "../../../ui/components/MealReviewImage";
import { TSpacer } from "../../../ui/primitives/TSpacer";
import { TText } from "../../../ui/primitives/TText";
import { useBottomSheet } from "../../../ui/sheets/useBottomSheet";
import { formatFoodName } from "../../../utils/formatFoodName";
import { useNutritionDraftStore } from "../nutrition.draft.store";
import type { MealDraft } from "../nutrition.draft.types";
import { correctMealDraftWithAI } from "./ai-correction.service";

const MAX_CORRECTION_LEN = 1000;

type SubmitState = "idle" | "submitting" | "error";

export interface FixWithAISheetProps {
  /**
   * The draft snapshot to correct. The sheet reads its summary from this
   * snapshot but ALWAYS pulls the latest draft from the store at submit
   * time, so any changes the user made on the confirm screen between
   * opening and submitting are respected.
   */
  draft: MealDraft;
}

export function FixWithAISheet({ draft }: FixWithAISheetProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const toast = useToast();
  const { close } = useBottomSheet();

  const setDraft = useNutritionDraftStore((s) => s.setDraft);

  const [text, setText] = useState("");
  const [state, setState] = useState<SubmitState>("idle");
  const [errorMessageKey, setErrorMessageKey] = useState<string>(
    "mealConfirm.fixSheet.errorRecoverable"
  );

  // Crumb: opened. Intentionally fires once on mount — we want the
  // initial open event, not one per re-render or on every prop change.
  useEffect(() => {
    addFoodLoggingBreadcrumb("food_logging.ai_fix_opened", {
      has_image: Boolean(draft.imagePath || draft.imageUri),
      has_pending_review_id: Boolean(draft.pendingReviewId),
      original_calories: draft.calories,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit =
    text.trim().length >= 3 && state !== "submitting";

  const summary = useMemo(
    () => ({
      title: formatFoodName(draft.title),
      calories: Math.round(draft.calories),
      hasImage: Boolean(draft.imagePath || draft.imageUri),
    }),
    [draft.title, draft.calories, draft.imagePath, draft.imageUri]
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const correction = text.trim();
    setState("submitting");
    setErrorMessageKey("mealConfirm.fixSheet.errorRecoverable");

    // Use the latest draft from the store so we don't drop any in-flight edits.
    const latest = useNutritionDraftStore.getState().draft ?? draft;

    const result = await correctMealDraftWithAI({
      draft: latest,
      userCorrection: correction,
      imagePath: latest.imagePath,
    });

    if (!result.ok) {
      setState("error");
      switch (result.reason) {
        case "rate_limited":
          setErrorMessageKey("mealConfirm.fixSheet.errorRateLimited");
          break;
        case "no_session":
          setErrorMessageKey("mealConfirm.fixSheet.errorNoSession");
          break;
        case "ai_unavailable":
          setErrorMessageKey("mealConfirm.fixSheet.errorAIUnavailable");
          break;
        case "validation":
          setErrorMessageKey("mealConfirm.fixSheet.errorValidation");
          break;
        default:
          setErrorMessageKey("mealConfirm.fixSheet.errorRecoverable");
      }
      return;
    }

    // ── Apply ──────────────────────────────────────────────────────────
    setDraft(result.draft);
    addFoodLoggingBreadcrumb("food_logging.ai_fix_applied", {
      original_calories: latest.calories,
      new_calories: result.draft.calories,
      delta_calories: result.draft.calories - latest.calories,
    });

    void haptics.notification("success");
    toast.show(t("mealConfirm.fixSheet.successToast"), "success");
    close();
  };

  return (
    <ScrollView
      style={sheetStyles.container}
      contentContainerStyle={sheetStyles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={sheetStyles.header}>
        <View style={{ flex: 1 }}>
          <TText style={[sheetStyles.title, { color: theme.colors.text }]}>
            {t("mealConfirm.fixSheet.title")}
          </TText>
        </View>
        <Pressable
          onPress={() => close()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t("common.cancel")}
          style={[
            sheetStyles.closeBtn,
            { backgroundColor: theme.colors.surfaceSecondary },
          ]}
        >
          <Ionicons name="close" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      <TSpacer size="md" />

      {/* Compact draft summary */}
      <View
        style={[
          sheetStyles.summaryCard,
          {
            backgroundColor: theme.colors.surfaceSecondary,
            borderColor: theme.colors.borderSecondary,
          },
        ]}
      >
        {summary.hasImage ? (
          <View style={sheetStyles.summaryThumb}>
            <MealReviewImage
              imageUri={draft.imageUri}
              imagePath={draft.imagePath}
              accessibilityLabel={summary.title}
            />
          </View>
        ) : (
          <View
            style={[
              sheetStyles.summaryThumb,
              sheetStyles.summaryThumbPlaceholder,
              { backgroundColor: theme.colors.backgroundTertiary },
            ]}
          >
            <Ionicons
              name="restaurant-outline"
              size={22}
              color={theme.colors.textMuted}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <TText
            style={[sheetStyles.summaryLabel, { color: theme.colors.textMuted }]}
          >
            {t("mealConfirm.fixSheet.currentLabel")}
          </TText>
          <TText
            numberOfLines={2}
            style={[sheetStyles.summaryTitle, { color: theme.colors.text }]}
          >
            {summary.title}
          </TText>
          <TText
            style={[sheetStyles.summaryKcal, { color: theme.colors.textMuted }]}
          >
            {t("mealConfirm.fixSheet.calories", { count: summary.calories })}
          </TText>
        </View>
      </View>

      <TSpacer size="lg" />

      {/* Correction input */}
      <View
        style={[
          sheetStyles.textInputContainer,
          {
            backgroundColor: theme.colors.surfaceSecondary,
            borderColor: theme.colors.borderSecondary,
          },
        ]}
      >
        <TextInput
          style={[sheetStyles.textInput, { color: theme.colors.text }]}
          placeholder={t("mealConfirm.fixSheet.placeholder")}
          placeholderTextColor={theme.colors.textMuted}
          value={text}
          onChangeText={(v) => {
            setText(v.slice(0, MAX_CORRECTION_LEN));
            if (state === "error") setState("idle");
          }}
          multiline
          maxLength={MAX_CORRECTION_LEN}
          textAlignVertical="top"
          editable={state !== "submitting"}
          autoFocus
          accessibilityLabel={t("mealConfirm.fixSheet.placeholder")}
        />
        <TText
          style={[sheetStyles.charCount, { color: theme.colors.textMuted }]}
        >
          {text.length}/{MAX_CORRECTION_LEN}
        </TText>
      </View>

      {state === "error" && (
        <Animated.View entering={FadeIn.duration(200)}>
          <TSpacer size="sm" />
          <TText
            style={[sheetStyles.errorText, { color: theme.colors.error }]}
          >
            {t(errorMessageKey)}
          </TText>
        </Animated.View>
      )}

      <TSpacer size="lg" />

      {/* Actions */}
      <View style={sheetStyles.actions}>
        <Pressable
          onPress={() => close()}
          disabled={state === "submitting"}
          style={({ pressed }) => [
            sheetStyles.actionBtn,
            sheetStyles.cancelBtn,
            {
              backgroundColor: theme.colors.surfaceSecondary,
              opacity:
                state === "submitting" ? 0.5 : pressed ? 0.8 : 1,
            },
          ]}
        >
          <TText
            style={[sheetStyles.actionBtnText, { color: theme.colors.text }]}
          >
            {t("mealConfirm.fixSheet.cancel")}
          </TText>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          accessibilityState={{ disabled: !canSubmit }}
          style={({ pressed }) => [
            sheetStyles.actionBtn,
            {
              opacity: !canSubmit ? 0.55 : pressed ? 0.9 : 1,
            },
          ]}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={sheetStyles.submitGradient}
          >
            {state === "submitting" ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.textInverse}
              />
            ) : (
              <Ionicons
                name="sparkles"
                size={16}
                color={theme.colors.textInverse}
              />
            )}
            <TText
              style={[
                sheetStyles.actionBtnText,
                {
                  color: theme.colors.textInverse,
                  fontWeight: "600",
                },
              ]}
            >
              {state === "submitting"
                ? t("mealConfirm.fixSheet.submitting")
                : t("mealConfirm.fixSheet.submit")}
            </TText>
          </LinearGradient>
        </Pressable>
      </View>

      <TSpacer size="md" />
    </ScrollView>
  );
}

const sheetStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  contentContainer: {
    paddingBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  summaryThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: "hidden",
  },
  summaryThumbPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  summaryKcal: {
    fontSize: 13,
    marginTop: 2,
  },
  textInputContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    minHeight: 110,
  },
  textInput: {
    fontSize: 15,
    lineHeight: 20,
    minHeight: 80,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    textAlign: "right",
    marginTop: 6,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  cancelBtn: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  actionBtnText: {
    fontSize: 15,
    textAlign: "center",
  },
  errorText: {
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
