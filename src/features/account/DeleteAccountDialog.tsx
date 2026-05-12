import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../../ui/primitives/TText";

export type DeleteAccountDialogProps = {
  visible: boolean;
  confirmText: string;
  isDeleting: boolean;
  canConfirmDelete: boolean;
  onChangeConfirmText: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteAccountDialog({
  visible,
  confirmText,
  isDeleting,
  canConfirmDelete,
  onChangeConfirmText,
  onCancel,
  onConfirm,
}: DeleteAccountDialogProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.deleteModalBackdrop}>
        <View
          style={[
            styles.deleteModalCard,
            { backgroundColor: theme.colors.surfaceSecondary },
          ]}
        >
          <TText style={[styles.deleteModalTitle, { color: theme.colors.text }]}>
            {t("settings.deleteAccountTitle")}
          </TText>
          <TText
            style={[
              styles.deleteModalBody,
              { color: theme.colors.textSecondary },
            ]}
          >
            {t("settings.deleteAccountDescription")}
          </TText>
          <TText style={[styles.deleteModalHint, { color: theme.colors.textMuted }]}>
            {t("settings.deleteTypeHint")}
          </TText>
          <TextInput
            value={confirmText}
            onChangeText={onChangeConfirmText}
            editable={!isDeleting}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="DELETE"
            placeholderTextColor={theme.colors.textMuted}
            style={[
              styles.deleteInput,
              {
                borderColor: theme.colors.border,
                color: theme.colors.text,
                backgroundColor: theme.colors.background,
              },
            ]}
          />
          <View style={styles.deleteActions}>
            <Pressable
              onPress={onCancel}
              disabled={isDeleting}
              style={[
                styles.deleteButton,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <TText style={{ color: theme.colors.text }}>
                {t("common.cancel")}
              </TText>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={!canConfirmDelete || isDeleting}
              style={[
                styles.deleteButton,
                styles.deleteButtonDanger,
                {
                  opacity: !canConfirmDelete || isDeleting ? 0.5 : 1,
                  backgroundColor: theme.colors.error,
                },
              ]}
            >
              {isDeleting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <TText style={{ color: "#fff", fontWeight: "700" }}>
                  {t("settings.deleteForeverCta")}
                </TText>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  deleteModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  deleteModalCard: {
    width: "100%",
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  deleteModalBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  deleteModalHint: {
    fontSize: 12,
    marginTop: 4,
  },
  deleteInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  deleteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  deleteButton: {
    minWidth: 110,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonDanger: {
    minWidth: 140,
  },
});
