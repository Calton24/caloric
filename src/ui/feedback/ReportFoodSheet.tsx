/**
 * ReportFoodSheet
 *
 * Bottom-sheet UI for structured food issue reporting.
 * Mirrors the Cal AI pattern: quick reason codes + optional text.
 *
 * Flow:
 *   1. User taps "Report Food" from the more menu
 *   2. Picks a reason (wrong food, wrong macros, etc.)
 *   3. Optionally adds free-text detail
 *   4. Taps "Report" → stores in Supabase
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    TextInput,
    View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import {
    type ReportReasonCode,
    submitScanReport,
} from "../../features/feedback/scan-feedback.service";
import { useAppTranslation } from "../../infrastructure/i18n";
import { useTheme } from "../../theme/useTheme";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";
import { useBottomSheet } from "../sheets/useBottomSheet";

const REASON_OPTIONS: {
  code: ReportReasonCode;
  label: string;
  icon: string;
}[] = [
  {
    code: "wrong_food",
    label: "Wrong food identified",
    icon: "alert-circle-outline",
  },
  {
    code: "wrong_macros",
    label: "Macros inaccurate",
    icon: "nutrition-outline",
  },
  {
    code: "wrong_quantity",
    label: "Serving size inaccurate",
    icon: "resize-outline",
  },
  {
    code: "label_mismatch",
    label: "Nutrition didn't match label",
    icon: "document-text-outline",
  },
  {
    code: "barcode_mismatch",
    label: "Barcode mismatch",
    icon: "barcode-outline",
  },
  {
    code: "missing_item",
    label: "Missing item",
    icon: "remove-circle-outline",
  },
  { code: "image_unclear", label: "Image unclear", icon: "eye-off-outline" },
  { code: "other", label: "Other issue", icon: "chatbox-ellipses-outline" },
];

const MAX_TEXT_LENGTH = 500;

interface ReportFoodSheetProps {
  scanEventId?: string;
  foodName?: string;
  onReported?: () => void;
}

export function ReportFoodSheet({
  scanEventId,
  foodName,
  onReported,
}: ReportFoodSheetProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const { close } = useBottomSheet();

  const [selectedReason, setSelectedReason] = useState<ReportReasonCode | null>(
    null
  );
  const [reasonText, setReasonText] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setStatus("submitting");

    const success = await submitScanReport({
      scanEventId,
      reasonCode: selectedReason,
      reasonText: reasonText.trim() || undefined,
    });

    if (success) {
      setStatus("success");
      onReported?.();
      setTimeout(() => close(), 800);
    } else {
      setStatus("error");
      // Still close — we don't want to block the user
      setTimeout(() => close(), 1500);
    }
  };

  if (status === "success") {
    return (
      <View style={sheetStyles.container}>
        <Animated.View
          entering={FadeIn.duration(300)}
          style={sheetStyles.successContainer}
        >
          <View
            style={[
              sheetStyles.successBadge,
              { backgroundColor: theme.colors.primary + "18" },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={48}
              color={theme.colors.primary}
            />
          </View>
          <TSpacer size="md" />
          <TText
            style={[sheetStyles.successText, { color: theme.colors.text }]}
          >
            {t("report.submitted")}
          </TText>
          <TSpacer size="xs" />
          <TText
            style={[sheetStyles.successSub, { color: theme.colors.textMuted }]}
          >
            {t("report.thanksAccuracy")}
          </TText>
        </Animated.View>
      </View>
    );
  }

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
            {t("mealConfirm.reportFood")}
          </TText>
          {foodName ? (
            <TText
              style={[sheetStyles.subtitle, { color: theme.colors.textMuted }]}
              numberOfLines={1}
            >
              {foodName}
            </TText>
          ) : null}
        </View>
        <Pressable
          onPress={close}
          hitSlop={12}
          style={[
            sheetStyles.closeBtn,
            { backgroundColor: theme.colors.surfaceSecondary },
          ]}
        >
          <Ionicons name="close" size={18} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      <TSpacer size="lg" />

      {/* Section label */}
      <TText
        style={[sheetStyles.sectionLabel, { color: theme.colors.textMuted }]}
      >
        What went wrong?
      </TText>
      <TSpacer size="sm" />

      {/* Reason picker */}
      <Animated.View
        entering={FadeInDown.delay(50).duration(250)}
        style={sheetStyles.reasonGrid}
      >
        {REASON_OPTIONS.map((option) => {
          const isSelected = selectedReason === option.code;
          return (
            <Pressable
              key={option.code}
              onPress={() => setSelectedReason(option.code)}
              style={({ pressed }) => [
                sheetStyles.reasonChip,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primary + "15"
                    : theme.colors.surfaceSecondary,
                  borderColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.borderSecondary,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <View
                style={[
                  sheetStyles.reasonIconCircle,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primary + "20"
                      : theme.colors.backgroundTertiary,
                  },
                ]}
              >
                <Ionicons
                  name={option.icon as any}
                  size={15}
                  color={
                    isSelected ? theme.colors.primary : theme.colors.textMuted
                  }
                />
              </View>
              <TText
                style={[
                  sheetStyles.reasonLabel,
                  {
                    color: isSelected
                      ? theme.colors.primary
                      : theme.colors.text,
                    fontWeight: isSelected ? "600" : "400",
                  },
                ]}
                numberOfLines={1}
              >
                {option.label}
              </TText>
            </Pressable>
          );
        })}
      </Animated.View>

      <TSpacer size="lg" />

      {/* Optional detail */}
      <TText
        style={[sheetStyles.sectionLabel, { color: theme.colors.textMuted }]}
      >
        Additional details (optional)
      </TText>
      <TSpacer size="xs" />
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
          placeholder={t("report.issueQuestion")}
          placeholderTextColor={theme.colors.textMuted}
          value={reasonText}
          onChangeText={(t) => setReasonText(t.slice(0, MAX_TEXT_LENGTH))}
          multiline
          maxLength={MAX_TEXT_LENGTH}
          textAlignVertical="top"
        />
        <TText
          style={[sheetStyles.charCount, { color: theme.colors.textMuted }]}
        >
          {reasonText.length}/{MAX_TEXT_LENGTH}
        </TText>
      </View>

      <TSpacer size="lg" />

      {/* Actions */}
      <View style={sheetStyles.actions}>
        <Pressable
          onPress={close}
          style={({ pressed }) => [
            sheetStyles.actionBtn,
            sheetStyles.cancelBtn,
            {
              backgroundColor: theme.colors.surfaceSecondary,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <TText
            style={[sheetStyles.actionBtnText, { color: theme.colors.text }]}
          >
            {t("common.cancel")}
          </TText>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!selectedReason || status === "submitting"}
          style={({ pressed }) => [
            sheetStyles.actionBtn,
            sheetStyles.submitBtn,
            {
              opacity: !selectedReason
                ? 0.45
                : status === "submitting"
                  ? 0.7
                  : pressed
                    ? 0.9
                    : 1,
            },
          ]}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={sheetStyles.submitGradient}
          >
            {status === "submitting" ? (
              <ActivityIndicator
                size="small"
                color={theme.colors.textInverse}
              />
            ) : (
              <Ionicons
                name="send"
                size={16}
                color={theme.colors.textInverse}
              />
            )}
            <TText
              style={[
                sheetStyles.actionBtnText,
                { color: theme.colors.textInverse, fontWeight: "600" },
              ]}
            >
              {status === "submitting"
                ? t("report.reporting")
                : t("report.submit")}
            </TText>
          </LinearGradient>
        </Pressable>
      </View>

      {status === "error" && (
        <>
          <TSpacer size="sm" />
          <TText style={[sheetStyles.errorText, { color: theme.colors.error }]}>
            {t("report.savedLocally")}
          </TText>
        </>
      )}
    </ScrollView>
  );
}

const sheetStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  contentContainer: {
    paddingBottom: 12,
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
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reasonChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  reasonIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonLabel: {
    fontSize: 13,
  },
  textInputContainer: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    minHeight: 88,
  },
  textInput: {
    fontSize: 15,
    lineHeight: 20,
    minHeight: 56,
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
  submitBtn: {},
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
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  successBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  successText: {
    fontSize: 20,
    fontWeight: "700",
  },
  successSub: {
    fontSize: 14,
  },
  errorText: {
    fontSize: 12,
    textAlign: "center",
  },
});
