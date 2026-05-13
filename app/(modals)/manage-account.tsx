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
import { useCallback } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/features/auth/useAuth";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { TText } from "../../src/ui/primitives/TText";

const PRIVACY_URL = "https://caloric-sage.vercel.app/privacy";
const TERMS_URL = "https://caloric-sage.vercel.app/terms";

export default function ManageAccountModal() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const { user, signOut } = useAuth();

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

  const openDeleteAccount = useCallback(() => {
    router.push("/(modals)/delete-account" as never);
  }, [router]);

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
              onPress={openDeleteAccount}
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
});
