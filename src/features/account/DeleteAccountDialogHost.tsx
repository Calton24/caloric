import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "../auth/useAuth";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { DeleteAccountDialog } from "./DeleteAccountDialog";
import { useDeleteAccountDialogStore } from "./delete-account-dialog.store";
import { resetClientStoresAfterAccountDeletion } from "./reset-client-stores-after-account-deletion";

/**
 * Single app-root owner for the delete-account confirmation modal.
 * Mount once under providers (see CalCutProviders) so it is never nested
 * inside the hamburger drawer Modal or tab screen layout.
 */
export function DeleteAccountDialogHost() {
  const router = useRouter();
  const { t } = useAppTranslation();
  const { user, signOut, deleteAccount } = useAuth();
  const visible = useDeleteAccountDialogStore((s) => s.visible);
  const closeStore = useDeleteAccountDialogStore((s) => s.close);

  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (__DEV__) {
      console.log("[DeleteAccountDialogRender]", { visible });
    }
    if (visible) {
      setConfirmText("");
    }
  }, [visible]);

  const canConfirmDelete = useMemo(
    () => confirmText.trim().toUpperCase() === "DELETE",
    [confirmText]
  );

  const handleClose = useCallback(() => {
    if (isDeleting) return;
    setConfirmText("");
    closeStore();
  }, [closeStore, isDeleting]);

  const handleConfirm = useCallback(async () => {
    if (!canConfirmDelete || isDeleting) return;
    const userIdForStorageCleanup = user?.id ?? null;
    setIsDeleting(true);
    try {
      const { error } = await deleteAccount();
      if (error) {
        if (__DEV__) {
          console.log("[DeleteAccountDialogHost] deleteAccount error", error.message);
        }
        Alert.alert(
          t("settings.deleteAccountFailed"),
          error.message || t("settings.deleteError")
        );
        return;
      }
      await signOut();
      await resetClientStoresAfterAccountDeletion(userIdForStorageCleanup);
      closeStore();
      setConfirmText("");
      router.replace("/(onboarding)/landing");
    } catch (error) {
      if (__DEV__) {
        console.log("[DeleteAccountDialogHost] confirm_error", error);
      }
      Alert.alert(t("common.error"), t("settings.deleteError"));
    } finally {
      setIsDeleting(false);
    }
  }, [
    canConfirmDelete,
    isDeleting,
    user?.id,
    deleteAccount,
    signOut,
    router,
    t,
    closeStore,
  ]);

  return (
    <DeleteAccountDialog
      visible={visible}
      confirmText={confirmText}
      isDeleting={isDeleting}
      canConfirmDelete={canConfirmDelete}
      onChangeConfirmText={setConfirmText}
      onCancel={handleClose}
      onConfirm={handleConfirm}
    />
  );
}
