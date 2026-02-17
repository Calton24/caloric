/**
 * ModalHelpers
 * Common modal patterns using bottom sheets
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import { TButton } from "../primitives/TButton";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";
import type { BottomSheetContextValue } from "../sheets/BottomSheetProvider";

const { height: screenHeight } = Dimensions.get("window");

// Prevent double-click modal opening
let isModalOpening = false;
const DEBOUNCE_DELAY = 500; // 500ms debounce

function canOpenModal(): boolean {
  if (isModalOpening) {
    return false;
  }
  isModalOpening = true;
  setTimeout(() => {
    isModalOpening = false;
  }, DEBOUNCE_DELAY);
  return true;
}

export interface AlertModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  onConfirm?: () => void;
}

export interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "primary" | "destructive";
  onConfirm?: () => void;
  onCancel?: () => void;
}

export interface ActionSheetOption {
  label: string;
  onPress: () => void;
  variant?: "default" | "destructive";
  icon?: React.ReactNode;
}

export interface ActionSheetOptions {
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  cancelText?: string;
}

/**
 * Alert Modal - Single action confirmation
 */
export function showAlert(
  sheet: BottomSheetContextValue,
  options: AlertModalOptions
) {
  if (!canOpenModal()) return;

  const { title, message, confirmText = "OK", onConfirm } = options;

  const handleConfirm = () => {
    sheet.close();
    onConfirm?.();
  };

  sheet.open(
    <View style={styles.modalContainer}>
      <TText variant="heading">{title}</TText>
      <TSpacer size="md" />
      <TText>{message}</TText>
      <TSpacer size="xl" />
      <TButton onPress={handleConfirm}>{confirmText}</TButton>
    </View>,
    {
      snapPoints: [Math.max(250, screenHeight * 0.35)],
    }
  );
}

/**
 * Confirm Modal - Two actions (confirm/cancel)
 */
export function showConfirm(
  sheet: BottomSheetContextValue,
  options: ConfirmModalOptions
) {
  if (!canOpenModal()) return;

  const {
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmVariant = "primary",
    onConfirm,
    onCancel,
  } = options;

  const handleConfirm = () => {
    sheet.close();
    onConfirm?.();
  };

  const handleCancel = () => {
    sheet.close();
    onCancel?.();
  };

  sheet.open(
    <View style={styles.modalContainer}>
      <TText variant="heading">{title}</TText>
      <TSpacer size="md" />
      <TText>{message}</TText>
      <TSpacer size="xl" />
      <View style={styles.buttonRow}>
        <View style={styles.buttonHalf}>
          <TButton onPress={handleCancel} variant="outline">
            {cancelText}
          </TButton>
        </View>
        <View style={styles.buttonSpacer} />
        <View style={styles.buttonHalf}>
          <TButton
            onPress={handleConfirm}
            variant={confirmVariant === "destructive" ? "primary" : "primary"}
          >
            {confirmText}
          </TButton>
        </View>
      </View>
    </View>,
    {
      snapPoints: [Math.max(280, screenHeight * 0.4)],
    }
  );
}

/**
 * Action Sheet - Multiple options to choose from
 */
export function showActionSheet(
  sheet: BottomSheetContextValue,
  options: ActionSheetOptions
) {
  if (!canOpenModal()) return;

  const {
    title,
    message,
    options: actionOptions,
    cancelText = "Cancel",
  } = options;

  const handleOptionPress = (onPress: () => void) => {
    sheet.close();
    setTimeout(() => onPress(), 150); // Small delay after close
  };

  const handleCancel = () => {
    sheet.close();
  };

  const contentHeight = Math.max(
    350,
    screenHeight * 0.45 + actionOptions.length * 20
  );

  sheet.open(
    <View style={styles.modalContainer}>
      <View style={styles.headerRow}>
        <View style={styles.headerContent}>
          {title && <TText variant="heading">{title}</TText>}
        </View>
        <Pressable
          onPress={handleCancel}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color="#666" />
        </Pressable>
      </View>

      {title && <TSpacer size="sm" />}
      {message && (
        <>
          <TText color="secondary">{message}</TText>
          <TSpacer size="md" />
        </>
      )}

      <View style={styles.actionsContainer}>
        {actionOptions.map((option, index) => (
          <React.Fragment key={index}>
            <TButton
              onPress={() => handleOptionPress(option.onPress)}
              variant={option.variant === "destructive" ? "primary" : "outline"}
            >
              {option.label}
            </TButton>
            {index < actionOptions.length - 1 && <TSpacer size="sm" />}
          </React.Fragment>
        ))}
      </View>
    </View>,
    {
      snapPoints: [contentHeight],
    }
  );
}

/**
 * Custom Modal - For custom content with auto-sizing
 */
export function showCustomModal(
  sheet: BottomSheetContextValue,
  content: React.ReactNode,
  snapPercentage: number = 50,
  minHeight: number = 300
) {
  if (!canOpenModal()) return;

  sheet.open(content, {
    snapPoints: [Math.max(minHeight, screenHeight * (snapPercentage / 100))],
  });
}

const styles = StyleSheet.create({
  modalContainer: {
    padding: 24,
    paddingBottom: 32,
  },
  buttonRow: {
    flexDirection: "row",
    width: "100%",
  },
  buttonHalf: {
    flex: 1,
  },
  buttonSpacer: {
    width: 12,
  },
  actionsContainer: {
    width: "100%",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
  },
  headerContent: {
    flex: 1,
    paddingRight: 8,
  },
  closeButton: {
    padding: 4,
    marginTop: -4,
    marginRight: -4,
  },
});
