/**
 * ConfirmDialog — Translation-aware confirmation alert
 *
 * Wraps React Native's Alert.alert with i18n. Ensures all dialog text
 * comes from translations — no hardcoded strings can leak.
 *
 * @example
 * const confirm = useConfirmDialog();
 *
 * confirm({
 *   titleKey: "editMeal.deleteMeal",
 *   messageKey: "editMeal.deleteMealConfirm",
 *   messageParams: { title: meal.title },
 *   destructiveKey: "common.delete",
 *   cancelKey: "common.cancel",
 *   onConfirm: () => deleteMeal(),
 * });
 */

import { useCallback } from "react";
import { Alert } from "react-native";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";

interface ConfirmDialogOptions {
  /** Translation key for the alert title */
  titleKey: string;
  /** Translation key for the alert message */
  messageKey: string;
  /** Interpolation params for the message */
  messageParams?: Record<string, string | number>;
  /** Translation key for the destructive/confirm action (default: "common.ok") */
  destructiveKey?: string;
  /** Translation key for the cancel action (default: "common.cancel") */
  cancelKey?: string;
  /** Called when user confirms */
  onConfirm: () => void;
  /** Called when user cancels (optional) */
  onCancel?: () => void;
  /** Whether the confirm button is destructive (red). Default: true */
  destructive?: boolean;
}

export function useConfirmDialog() {
  const { t } = useAppTranslation();

  return useCallback(
    ({
      titleKey,
      messageKey,
      messageParams,
      destructiveKey = "common.ok",
      cancelKey = "common.cancel",
      onConfirm,
      onCancel,
      destructive = true,
    }: ConfirmDialogOptions) => {
      Alert.alert(t(titleKey), t(messageKey, messageParams as any), [
        {
          text: t(cancelKey),
          style: "cancel",
          onPress: onCancel,
        },
        {
          text: t(destructiveKey),
          style: destructive ? "destructive" : "default",
          onPress: onConfirm,
        },
      ]);
    },
    [t]
  );
}

/**
 * Simple i18n-aware info alert (single OK button).
 *
 * @example
 * const alert = useInfoDialog();
 * alert({ titleKey: "progress.planUpdated", messageKey: "progress.planUpdatedDesc", messageParams: { weight: "70kg" } });
 */
export function useInfoDialog() {
  const { t } = useAppTranslation();

  return useCallback(
    ({
      titleKey,
      messageKey,
      messageParams,
      okKey = "common.ok",
      onDismiss,
    }: {
      titleKey: string;
      messageKey: string;
      messageParams?: Record<string, string | number>;
      okKey?: string;
      onDismiss?: () => void;
    }) => {
      Alert.alert(t(titleKey), t(messageKey, messageParams as any), [
        { text: t(okKey), onPress: onDismiss },
      ]);
    },
    [t]
  );
}

/**
 * Generic i18n-aware Alert.alert wrapper.
 *
 * Avoids hardcoded strings in Alert.alert calls entirely.
 *
 * @example
 * const alert = useLocalizedAlert();
 * alert("common.error", "settings.syncFailedDesc");
 * alert("common.error", "settings.syncFailedDesc", { detail: "timeout" });
 */
export function useLocalizedAlert() {
  const { t } = useAppTranslation();

  return useCallback(
    (
      titleKey: string,
      messageKey: string,
      messageParams?: Record<string, string | number>
    ) => {
      Alert.alert(t(titleKey), t(messageKey, messageParams as any), [
        { text: t("common.ok"), style: "default" },
      ]);
    },
    [t]
  );
}
