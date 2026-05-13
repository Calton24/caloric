import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../../ui/primitives/TText";

export type DeleteAccountConfirmationCardProps = {
  confirmText: string;
  isDeleting: boolean;
  canConfirmDelete: boolean;
  onChangeConfirmText: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

/**
 * Account deletion confirmation UI (no React Native `Modal`).
 * Used by `/(modals)/delete-account` and anywhere else a full-screen
 * or stack route owns presentation — avoids nested native modals.
 */
export function DeleteAccountConfirmationCard({
  confirmText,
  isDeleting,
  canConfirmDelete,
  onChangeConfirmText,
  onCancel,
  onConfirm,
}: DeleteAccountConfirmationCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surfaceSecondary },
      ]}
    >
      <TText style={[styles.title, { color: theme.colors.text }]}>
        {t("settings.deleteAccountTitle")}
      </TText>
      <TText style={[styles.body, { color: theme.colors.textSecondary }]}>
        {t("settings.deleteAccountDescription")}
      </TText>
      <TText style={[styles.hint, { color: theme.colors.textMuted }]}>
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
          styles.input,
          {
            borderColor: theme.colors.border,
            color: theme.colors.text,
            backgroundColor: theme.colors.background,
          },
        ]}
      />
      <View style={styles.actions}>
        <Pressable
          onPress={onCancel}
          disabled={isDeleting}
          style={[styles.button, { backgroundColor: theme.colors.surface }]}
        >
          <TText style={{ color: theme.colors.text }}>{t("common.cancel")}</TText>
        </Pressable>
        <Pressable
          onPress={onConfirm}
          disabled={!canConfirmDelete || isDeleting}
          style={[
            styles.button,
            styles.buttonDanger,
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
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    maxWidth: 440,
    alignSelf: "center",
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  button: {
    minWidth: 110,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDanger: {
    minWidth: 140,
  },
});
