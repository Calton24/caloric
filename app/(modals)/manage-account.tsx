/**
 * Manage Account — locked-account shell.
 *
 * Reachable from the gate paywall (and Settings) so users with an
 * expired trial / no entitlement can still:
 *   - see their email
 *   - sign out
 *   - permanently delete their account
 *   - read privacy policy / terms (links open the web-viewer)
 *
 * IMPORTANT: This screen MUST NOT expose food tracking / settings
 * toggles / health integrations. It is the "App Review safe" exit hatch
 * only, intentionally minimal.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { resetClientStoresAfterAccountDeletion } from "../../src/features/account/reset-client-stores-after-account-deletion";
import { useAuth } from "../../src/features/auth/useAuth";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { logger } from "../../src/logging/logger";
import { useTheme } from "../../src/theme/useTheme";
import { TText } from "../../src/ui/primitives/TText";

const PRIVACY_URL = "https://caloric-sage.vercel.app/privacy";
const TERMS_URL = "https://caloric-sage.vercel.app/terms";

export default function ManageAccountModal() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const { user, signOut, deleteAccount } = useAuth();

  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const canConfirm = useMemo(
    () => confirmText.trim().toUpperCase() === "DELETE",
    [confirmText]
  );

  const handleClose = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace({
        pathname: "/(onboarding)/paywall",
        params: { mode: "gate" },
      });
    }
  }, [router]);

  const handleSignOut = useCallback(() => {
    Alert.alert(t("settings.signOut"), t("settings.signOutConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.signOut"),
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(onboarding)/landing");
        },
      },
    ]);
  }, [router, signOut, t]);

  const openDeleteModal = useCallback(() => {
    setConfirmText("");
    setDeleteModalVisible(true);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (isDeleting) return;
    setDeleteModalVisible(false);
    setConfirmText("");
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!canConfirm || isDeleting) return;
    setIsDeleting(true);
    const userIdForStorageCleanup = user?.id ?? null;
    try {
      const { error } = await deleteAccount();
      if (error) {
        Alert.alert(
          t("settings.deletionFailed"),
          error.message || t("settings.deleteError")
        );
        return;
      }
      await signOut();
      await resetClientStoresAfterAccountDeletion(userIdForStorageCleanup);
      setDeleteModalVisible(false);
      router.replace("/(onboarding)/landing");
    } catch (err) {
      logger.error("[ManageAccount] delete_failed", err);
      Alert.alert(t("common.error"), t("settings.deleteError"));
    } finally {
      setIsDeleting(false);
    }
  }, [
    canConfirm,
    deleteAccount,
    isDeleting,
    router,
    signOut,
    t,
    user?.id,
  ]);

  const openWebPage = useCallback(
    (url: string, title: string) => {
      router.push({
        pathname: "/(modals)/web-viewer",
        params: {
          url: encodeURIComponent(url),
          title: encodeURIComponent(title),
        },
      });
    },
    [router]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            onPress={handleClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t("common.cancel")}
          >
            <Ionicons name="close" size={26} color={theme.colors.text} />
          </Pressable>
          <TText
            variant="heading"
            style={[styles.title, { color: theme.colors.text }]}
          >
            {t("settings.manageAccount")}
          </TText>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TText
            color="secondary"
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            {t("settings.manageAccountSubtitle")}
          </TText>

          {/* Account identity */}
          <View
            style={[
              styles.section,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <View style={styles.row}>
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: theme.colors.info + "22" },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={theme.colors.info}
                />
              </View>
              <TText style={[styles.rowLabel, { color: theme.colors.text }]}>
                {t("common.email")}
              </TText>
              <TText
                style={[styles.rowValue, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {user?.email ?? "—"}
              </TText>
            </View>
          </View>

          {/* Actions */}
          <View
            style={[
              styles.section,
              { backgroundColor: theme.colors.surfaceSecondary, marginTop: 16 },
            ]}
          >
            <Pressable
              onPress={handleSignOut}
              style={styles.row}
              accessibilityRole="button"
              accessibilityLabel={t("settings.signOut")}
            >
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: theme.colors.error + "22" },
                ]}
              >
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color={theme.colors.error}
                />
              </View>
              <TText style={[styles.rowLabel, { color: theme.colors.text }]}>
                {t("settings.signOut")}
              </TText>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.colors.textSecondary}
              />
            </Pressable>
            <Pressable
              onPress={openDeleteModal}
              style={[styles.row, styles.rowLast]}
              accessibilityRole="button"
              accessibilityLabel={t("settings.deleteAccount")}
            >
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: theme.colors.error + "22" },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={18}
                  color={theme.colors.error}
                />
              </View>
              <TText style={[styles.rowLabel, { color: theme.colors.text }]}>
                {t("settings.deleteAccount")}
              </TText>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          </View>

          {/* Legal */}
          <View
            style={[
              styles.section,
              { backgroundColor: theme.colors.surfaceSecondary, marginTop: 16 },
            ]}
          >
            <Pressable
              onPress={() =>
                openWebPage(PRIVACY_URL, t("settings.privacyPolicy"))
              }
              style={styles.row}
              accessibilityRole="link"
              accessibilityLabel={t("settings.privacyPolicy")}
            >
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: theme.colors.primary + "22" },
                ]}
              >
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={theme.colors.primary}
                />
              </View>
              <TText style={[styles.rowLabel, { color: theme.colors.text }]}>
                {t("settings.privacyPolicy")}
              </TText>
              <Ionicons
                name="open-outline"
                size={18}
                color={theme.colors.textSecondary}
              />
            </Pressable>
            <Pressable
              onPress={() => openWebPage(TERMS_URL, t("settings.termsOfService"))}
              style={[styles.row, styles.rowLast]}
              accessibilityRole="link"
              accessibilityLabel={t("settings.termsOfService")}
            >
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: theme.colors.primary + "22" },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={18}
                  color={theme.colors.primary}
                />
              </View>
              <TText style={[styles.rowLabel, { color: theme.colors.text }]}>
                {t("settings.termsOfService")}
              </TText>
              <Ionicons
                name="open-outline"
                size={18}
                color={theme.colors.textSecondary}
              />
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <TText style={[styles.modalTitle, { color: theme.colors.text }]}>
              {t("settings.deleteAccountTitle")}
            </TText>
            <TText
              style={[styles.modalBody, { color: theme.colors.textSecondary }]}
            >
              {t("settings.deleteAccountDescription")}
            </TText>
            <TText
              style={[styles.modalHint, { color: theme.colors.textMuted }]}
            >
              {t("settings.deleteTypeHint")}
            </TText>
            <TextInput
              value={confirmText}
              onChangeText={setConfirmText}
              editable={!isDeleting}
              autoCapitalize="characters"
              autoCorrect={false}
              placeholder="DELETE"
              placeholderTextColor={theme.colors.textMuted}
              style={[
                styles.modalInput,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.background,
                },
              ]}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={closeDeleteModal}
                disabled={isDeleting}
                style={[
                  styles.modalButton,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <TText style={{ color: theme.colors.text }}>
                  {t("settings.cancelCta")}
                </TText>
              </Pressable>
              <Pressable
                onPress={confirmDelete}
                disabled={!canConfirm || isDeleting}
                style={[
                  styles.modalButton,
                  {
                    opacity: !canConfirm || isDeleting ? 0.5 : 1,
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  section: {
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
    gap: 12,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  iconBubble: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 14,
    maxWidth: 180,
    textAlign: "right",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 16,
    padding: 18,
    gap: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalHint: {
    fontSize: 12,
    marginTop: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 6,
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 100,
    alignItems: "center",
  },
});
