/**
 * Delete account — dedicated modal route (no nested RN `Modal`).
 * Opened from home hamburger, settings, or manage-account shell.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DeleteAccountConfirmationCard } from "../../src/features/account/DeleteAccountDialog";
import { resetClientStoresAfterAccountDeletion } from "../../src/features/account/reset-client-stores-after-account-deletion";
import { useAuth } from "../../src/features/auth/useAuth";
import { APP_ENTRY_PATH } from "../../src/features/navigation/app-entry-href";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { logger } from "../../src/logging/logger";
import { useTheme } from "../../src/theme/useTheme";
import { TText } from "../../src/ui/primitives/TText";

export default function DeleteAccountModalScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const { user, signOut, deleteAccount } = useAuth();

  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const canConfirmDelete = useMemo(
    () => confirmText.trim().toUpperCase() === "DELETE",
    [confirmText],
  );

  useEffect(() => {
    if (__DEV__) {
      console.warn("[DeleteAccountModal] mounted");
    }
    return () => {
      if (__DEV__) {
        console.warn("[DeleteAccountModal] unmounted");
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (isDeleting) return;
    setConfirmText("");
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(APP_ENTRY_PATH as never);
    }
  }, [router, isDeleting]);

  const handleConfirm = useCallback(async () => {
    if (!canConfirmDelete || isDeleting) return;
    const userIdForStorageCleanup = user?.id ?? null;
    setIsDeleting(true);
    try {
      const { error } = await deleteAccount();
      if (error) {
        Alert.alert(
          t("settings.deleteAccountFailed"),
          error.message || t("settings.deleteError"),
        );
        return;
      }
      await signOut();
      await resetClientStoresAfterAccountDeletion(userIdForStorageCleanup);
      setConfirmText("");
      router.replace("/(onboarding)/landing");
    } catch (err) {
      logger.error("[DeleteAccountModal] delete_failed", err);
      Alert.alert(t("common.error"), t("settings.deleteError"));
    } finally {
      setIsDeleting(false);
    }
  }, [
    canConfirmDelete,
    deleteAccount,
    isDeleting,
    router,
    signOut,
    t,
    user?.id,
  ]);

  return (
    <View
      style={[styles.root, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("common.cancel")}
            disabled={isDeleting}
          >
            <Ionicons name="close" size={26} color={theme.colors.text} />
          </Pressable>
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {t("settings.deleteAccount")}
          </TText>
          <View style={{ width: 26 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <DeleteAccountConfirmationCard
              confirmText={confirmText}
              isDeleting={isDeleting}
              canConfirmDelete={canConfirmDelete}
              onChangeConfirmText={setConfirmText}
              onCancel={handleClose}
              onConfirm={handleConfirm}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
});
