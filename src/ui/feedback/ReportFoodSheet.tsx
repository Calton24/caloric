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
import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import {
    type ReportReasonCode,
    submitScanReport,
} from "../../features/feedback/scan-feedback.service";
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
      <View
        style={[
          sheetStyles.container,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <View style={sheetStyles.successContainer}>
          <Ionicons
            name="checkmark-circle"
            size={48}
            color={theme.colors.success}
          />
          <TSpacer size="sm" />
          <TText
            style={[sheetStyles.successText, { color: theme.colors.text }]}
          >
            Report submitted
          </TText>
          <TText
            style={[sheetStyles.successSub, { color: theme.colors.textMuted }]}
          >
            Thanks for helping improve accuracy
          </TText>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[sheetStyles.container, { backgroundColor: theme.colors.surface }]}
    >
      {/* Header */}
      <View style={sheetStyles.header}>
        <TText style={[sheetStyles.title, { color: theme.colors.text }]}>
          Report Food
        </TText>
        <Pressable onPress={close} hitSlop={12}>
          <Ionicons name="close" size={22} color={theme.colors.textMuted} />
        </Pressable>
      </View>

      {foodName ? (
        <TText
          style={[sheetStyles.subtitle, { color: theme.colors.textMuted }]}
          numberOfLines={1}
        >
          {foodName}
        </TText>
      ) : null}

      <TSpacer size="md" />

      {/* Reason picker */}
      <View style={sheetStyles.reasonGrid}>
        {REASON_OPTIONS.map((option) => {
          const isSelected = selectedReason === option.code;
          return (
            <Pressable
              key={option.code}
              onPress={() => setSelectedReason(option.code)}
              style={[
                sheetStyles.reasonChip,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primary + "18"
                    : theme.colors.surfaceSecondary,
                  borderColor: isSelected
                    ? theme.colors.primary
                    : theme.colors.border,
                },
              ]}
            >
              <Ionicons
                name={option.icon as any}
                size={16}
                color={
                  isSelected ? theme.colors.primary : theme.colors.textMuted
                }
              />
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
      </View>

      <TSpacer size="md" />

      {/* Optional detail */}
      <View
        style={[
          sheetStyles.textInputContainer,
          {
            backgroundColor: theme.colors.surfaceSecondary,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <TextInput
          style={[sheetStyles.textInput, { color: theme.colors.text }]}
          placeholder="What's the issue with this food log?"
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

      <TSpacer size="md" />

      {/* Actions */}
      <View style={sheetStyles.actions}>
        <Pressable
          onPress={close}
          style={[
            sheetStyles.actionBtn,
            sheetStyles.cancelBtn,
            { backgroundColor: theme.colors.surfaceSecondary },
          ]}
        >
          <TText
            style={[sheetStyles.actionBtnText, { color: theme.colors.text }]}
          >
            Cancel
          </TText>
        </Pressable>
        <Pressable
          onPress={handleSubmit}
          disabled={!selectedReason || status === "submitting"}
          style={[
            sheetStyles.actionBtn,
            sheetStyles.submitBtn,
            {
              backgroundColor: selectedReason
                ? theme.colors.primary
                : theme.colors.surfaceSecondary,
              opacity: status === "submitting" ? 0.7 : 1,
            },
          ]}
        >
          <TText
            style={[
              sheetStyles.actionBtnText,
              {
                color: selectedReason ? "#fff" : theme.colors.textMuted,
                fontWeight: "600",
              },
            ]}
          >
            {status === "submitting" ? "Reporting..." : "Report"}
          </TText>
        </Pressable>
      </View>

      {status === "error" && (
        <>
          <TSpacer size="sm" />
          <TText style={[sheetStyles.errorText, { color: theme.colors.error }]}>
            Report saved locally. Will sync when online.
          </TText>
        </>
      )}
    </View>
  );
}

const sheetStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reasonChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  reasonLabel: {
    fontSize: 13,
  },
  textInputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    minHeight: 100,
  },
  textInput: {
    fontSize: 15,
    minHeight: 72,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {},
  submitBtn: {},
  actionBtnText: {
    fontSize: 15,
  },
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  successText: {
    fontSize: 18,
    fontWeight: "600",
  },
  successSub: {
    fontSize: 14,
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    textAlign: "center",
  },
});
