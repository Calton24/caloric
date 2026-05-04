/**
 * Settings Screen
 *
 * Matching the real app layout:
 *   - Pro banner
 *   - General: Voice & Text Input, Units, Body Measurements, Notifications
 *   - Apple Health
 *   - Extensions: Live Activities
 *
 * Every row reads/writes real store state.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    TextInput,
    View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../src/features/auth/useAuth";
import { useChallengeStore } from "../../../src/features/challenge/challenge.store";
import { useGoalsStore } from "../../../src/features/goals/goals.store";
import {
  insightTelemetry,
  useInsightStore,
} from "../../../src/features/insights";
import {
    areLiveActivitiesAvailable,
    endLiveActivity,
} from "../../../src/features/live-activity";
import { useNutritionStore } from "../../../src/features/nutrition/nutrition.store";
import { usePermissionsStore } from "../../../src/features/permissions";
import { useProfileStore } from "../../../src/features/profile/profile.store";
import { useProgressStore } from "../../../src/features/progress/progress.store";
import { useRetentionStore } from "../../../src/features/retention/retention.store";
import {
    getLanguageLabel,
    useSettingsStore,
} from "../../../src/features/settings";
import { useShareStore } from "../../../src/features/share/share.store";
import { useStreakStore } from "../../../src/features/streak/streak.store";
import { useSubscriptionStore } from "../../../src/features/subscription";
import { useScanCreditsStore } from "../../../src/features/subscription/scanCredits.store";
import { useRevenueCat } from "../../../src/features/subscription/useRevenueCat";
import { useWaterStore } from "../../../src/features/water/water.store";
import { useUnits } from "../../../hooks/useUnits";

import { getStorage } from "../../../src/infrastructure/storage";
import { useAppTranslation } from "../../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../../src/theme/useTheme";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";


// ─── Shared Row Components ─────────────────────────────────

function SettingsRow({
  icon,
  iconColor,
  label,
  value,
  onPress,
  showChevron = true,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, { borderBottomColor: theme.colors.border }]}
    >
      <View
        style={[styles.iconContainer, { backgroundColor: iconColor + "22" }]}
      >
        <Ionicons name={icon as any} size={18} color={iconColor} />
      </View>
      <TText style={[styles.rowLabel, { color: theme.colors.text }]}>
        {label}
      </TText>
      <View style={styles.rowRight}>
        {value && (
          <TText
            style={[styles.rowValue, { color: theme.colors.textSecondary }]}
          >
            {value}
          </TText>
        )}
        {showChevron && onPress && (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.textMuted}
          />
        )}
      </View>
    </Pressable>
  );
}

function SettingsToggle({
  icon,
  iconColor,
  label,
  description,
  value,
  onToggle,
}: {
  icon: string;
  iconColor: string;
  label: string;
  description?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  const { theme } = useTheme();

  return (
    <View>
      <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
        <View
          style={[styles.iconContainer, { backgroundColor: iconColor + "22" }]}
        >
          <Ionicons name={icon as any} size={18} color={iconColor} />
        </View>
        <TText style={[styles.rowLabel, { color: theme.colors.text }]}>
          {label}
        </TText>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{
            false: theme.colors.surfaceSecondary,
            true: theme.colors.primary + "88",
          }}
          thumbColor={value ? theme.colors.primary : theme.colors.textMuted}
        />
      </View>
      {description && (
        <TText
          style={[styles.toggleDescription, { color: theme.colors.textMuted }]}
        >
          {description}
        </TText>
      )}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <TText style={[styles.sectionTitle, { color: theme.colors.textMuted }]}>
      {title}
    </TText>
  );
}

function UnitsSegmentedRow() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const { weightUnit, setWeightUnit } = useUnits();
  const isMetric = weightUnit === "kg";

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View style={[styles.iconContainer, { backgroundColor: theme.colors.primary + "22" }]}>
        <Ionicons name="resize-outline" size={18} color={theme.colors.primary} />
      </View>
      <TText style={[styles.rowLabel, { color: theme.colors.text }]}>
        {t("settings.units")}
      </TText>
      <View style={styles.segmentedControl}>
        <Pressable
          onPress={() => setWeightUnit("kg")}
          style={[
            styles.segment,
            styles.segmentLeft,
            isMetric && { backgroundColor: theme.colors.primary },
            { borderColor: theme.colors.primary },
          ]}
          hitSlop={4}
        >
          <TText
            style={[
              styles.segmentLabel,
              { color: isMetric ? "#fff" : theme.colors.primary },
            ]}
          >
            {t("settings.metric")}
          </TText>
        </Pressable>
        <Pressable
          onPress={() => setWeightUnit("lbs")}
          style={[
            styles.segment,
            styles.segmentRight,
            !isMetric && { backgroundColor: theme.colors.primary },
            { borderColor: theme.colors.primary },
          ]}
          hitSlop={4}
        >
          <TText
            style={[
              styles.segmentLabel,
              { color: !isMetric ? "#fff" : theme.colors.primary },
            ]}
          >
            {t("settings.imperial")}
          </TText>
        </Pressable>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { theme, toggleMode } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const { user, signOut, deleteAccount } = useAuth();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const canConfirmDelete = useMemo(
    () => deleteConfirmText.trim().toUpperCase() === "DELETE",
    [deleteConfirmText]
  );

  // ── Settings store ──
  const settings = useSettingsStore((s) => s.settings);
  const languageLabel = getLanguageLabel(settings.voiceLanguage);

  // ── Permissions store ──
  const liveActivitiesEnabled = usePermissionsStore(
    (s) => s.permissions.liveActivitiesEnabled
  );
  const setLiveActivitiesEnabled = usePermissionsStore(
    (s) => s.setLiveActivitiesEnabled
  );

  // ── Subscription store ──
  const subscription = useSubscriptionStore((s) => s.subscription);
  const subscriptionLabel =
    subscription.plan === null
      ? t("settings.free")
      : subscription.trialStarted
        ? t("settings.challenge")
        : subscription.plan === "monthly"
          ? t("settings.monthly")
          : t("settings.yearly");

  // ── RevenueCat helpers ──
  const {
    isPro,
    presentPaywall,
    presentCustomerCenter,
    restorePurchases,
    isRestoring,
  } = useRevenueCat();

  // ── Handlers ──
  const handleToggleLiveActivities = useCallback(
    async (value: boolean) => {
      if (value) {
        if (Platform.OS !== "ios") {
          Alert.alert(t("settings.iosOnly"), t("settings.iosOnlyDesc"));
          return;
        }
        const available = areLiveActivitiesAvailable();
        console.log("[Settings] Live Activities available:", available);
        if (!available) {
          Alert.alert(
            t("settings.liveActivityUnavailable"),
            t("settings.liveActivityUnavailableDesc")
          );
          return;
        }
      }
      setLiveActivitiesEnabled(value);
      if (!value) {
        endLiveActivity();
      }
    },
    [setLiveActivitiesEnabled]
  );

  const handleDone = useCallback(() => {
    router.back();
  }, [router]);

  const resetClientStoresAfterAccountDeletion = useCallback(async () => {
    console.log("[DeleteAccount] local cleanup started");
    useNutritionStore.getState().resetMeals();
    useGoalsStore.getState().clearPlan();
    useProgressStore.getState().resetWeightLogs();
    useProfileStore.getState().resetProfile();
    useRetentionStore.getState().resetRetention();
    useChallengeStore.getState().clearChallenge();
    useShareStore.getState().reset();
    useStreakStore.getState().resetFreeze();
    useStreakStore.getState().setStreak({
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null,
      streakStartDate: null,
    });
    useWaterStore.setState({ intakeByDate: {} });
    useSubscriptionStore.getState().resetSubscription();
    useScanCreditsStore.getState().resetCredits();
    useInsightStore.getState().reset();
    insightTelemetry.resetSession();
    await getStorage().clear();
    console.log("[DeleteAccount] local cleanup complete");
  }, []);

  const openDeleteAccountModal = useCallback(() => {
    console.log("[DeleteAccount] confirmation opened");
    setDeleteConfirmText("");
    setDeleteModalVisible(true);
  }, []);

  const closeDeleteAccountModal = useCallback(() => {
    if (isDeletingAccount) return;
    setDeleteModalVisible(false);
    setDeleteConfirmText("");
  }, [isDeletingAccount]);

  const confirmDeleteAccount = useCallback(async () => {
    if (!canConfirmDelete || isDeletingAccount) {
      console.log("[DeleteAccount] local cleanup skipped", {
        reason: !canConfirmDelete ? "confirmation-mismatch" : "request-in-flight",
      });
      return;
    }

    console.log("[DeleteAccount] request started", {
      userId: user?.id ?? null,
    });
    setIsDeletingAccount(true);

    try {
      const { error } = await deleteAccount();
      if (error) {
        console.log("[DeleteAccount] local cleanup skipped", {
          reason: "backend-delete-failed",
          userId: user?.id ?? null,
          error: error.message,
        });
        console.log("[DeleteAccount] failed", {
          userId: user?.id ?? null,
          error: error.message,
        });
        Alert.alert("Delete account failed", error.message || t("settings.deleteError"));
        return;
      }

      console.log("[DeleteAccount] backend confirmed", {
        userId: user?.id ?? null,
      });
      await signOut();
      await resetClientStoresAfterAccountDeletion();
      console.log("[DeleteAccount] success", {
        userId: user?.id ?? null,
      });
      setDeleteModalVisible(false);
      router.replace("/(onboarding)/landing");
    } catch (error) {
      console.log("[DeleteAccount] local cleanup skipped", {
        reason: "exception-before-backend-confirmation",
        userId: user?.id ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
      console.log("[DeleteAccount] failed", {
        userId: user?.id ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
      Alert.alert(t("common.error"), t("settings.deleteError"));
    } finally {
      setIsDeletingAccount(false);
    }
  }, [
    canConfirmDelete,
    isDeletingAccount,
    user?.id,
    deleteAccount,
    signOut,
    resetClientStoresAfterAccountDeletion,
    router,
    t,
  ]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={{ width: 50 }} />
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            {t("settings.title")}
          </TText>
          <Pressable onPress={handleDone} hitSlop={12}>
            <TText
              style={[styles.doneButton, { color: theme.colors.textSecondary }]}
            >
              {t("common.done")}
            </TText>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Pro Banner ── */}
          <Animated.View entering={FadeIn.duration(400)}>
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsRow
                icon="star"
                iconColor={theme.colors.success}
                label={
                  isPro ? t("settings.youArePro") : t("settings.upgradeToPro")
                }
                value={isPro ? t("settings.thankYou") : subscriptionLabel}
                onPress={presentPaywall}
                showChevron
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Appearance ── */}
          <Animated.View entering={FadeIn.duration(400)}>
            <SectionHeader title={t("settings.appearance")} />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsToggle
                icon={theme.mode === "dark" ? "moon" : "sunny"}
                iconColor={theme.mode === "dark" ? "#FBBF24" : "#6366F1"}
                label={t("settings.darkMode")}
                value={theme.mode === "dark"}
                onToggle={() => toggleMode()}
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── General ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <SectionHeader title={t("settings.general")} />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsRow
                icon="globe-outline"
                iconColor={theme.colors.primary}
                label={t("settings.voiceTextInput")}
                value={languageLabel}
                onPress={() =>
                  router.push("/(main)/settings/voice-text-input" as any)
                }
              />
              <UnitsSegmentedRow />
              <SettingsRow
                icon="accessibility-outline"
                iconColor={theme.colors.primary}
                label={t("settings.bodyMeasurements")}
                onPress={() =>
                  router.push("/(main)/settings/body-measurements" as any)
                }
              />
              <SettingsRow
                icon="notifications-outline"
                iconColor={theme.colors.primary}
                label={t("settings.notifications")}
                onPress={() =>
                  router.push("/(main)/settings/notifications" as any)
                }
              />
            </View>
          </Animated.View>

          {/* ── Apple Health (iOS only) ── */}
          {Platform.OS === "ios" && (
            <>
              <TSpacer size="lg" />
              <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                <SectionHeader title={t("settings.appleHealth")} />
                <View
                  style={[
                    styles.section,
                    { backgroundColor: theme.colors.surfaceSecondary },
                  ]}
                >
                  <SettingsRow
                    icon="heart"
                    iconColor="#F87171"
                    label={t("settings.appleHealth")}
                    onPress={() =>
                      router.push("/(main)/settings/apple-health" as any)
                    }
                  />
                </View>
              </Animated.View>
            </>
          )}

          {/* ── Extensions (iOS only) ── */}
          {Platform.OS === "ios" && (
            <>
              <TSpacer size="lg" />
              <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                <SectionHeader title={t("settings.extensions")} />
                <View
                  style={[
                    styles.section,
                    { backgroundColor: theme.colors.surfaceSecondary },
                  ]}
                >
                  <SettingsToggle
                    icon="phone-portrait-outline"
                    iconColor={theme.colors.primary}
                    label={t("settings.liveActivities")}
                    description={t("settings.liveActivityDesc")}
                    value={liveActivitiesEnabled}
                    onToggle={handleToggleLiveActivities}
                  />
                </View>
              </Animated.View>
            </>
          )}

          {/* ── Legal ── */}
          <TSpacer size="lg" />
          <Animated.View entering={FadeInDown.duration(400).delay(350)}>
            <SectionHeader title={t("settings.legal")} />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsRow
                icon="document-text-outline"
                iconColor={theme.colors.textSecondary}
                label={t("settings.privacyPolicy")}
                onPress={() =>
                  router.push({
                    pathname: "/(modals)/web-viewer",
                    params: {
                      url: encodeURIComponent(
                        "https://caloric-sage.vercel.app/privacy"
                      ),
                      title: encodeURIComponent("Privacy Policy"),
                    },
                  })
                }
              />
              <SettingsRow
                icon="document-outline"
                iconColor={theme.colors.textSecondary}
                label={t("settings.termsOfService")}
                onPress={() =>
                  router.push({
                    pathname: "/(modals)/web-viewer",
                    params: {
                      url: encodeURIComponent(
                        "https://caloric-sage.vercel.app/terms"
                      ),
                      title: encodeURIComponent("Terms of Service"),
                    },
                  })
                }
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Subscription ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(380)}>
            <SectionHeader title={t("settings.subscription")} />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsRow
                icon="arrow-undo-outline"
                iconColor={theme.colors.textSecondary}
                label={
                  isRestoring
                    ? t("settings.restoring")
                    : t("settings.restorePurchases")
                }
                onPress={isRestoring ? undefined : restorePurchases}
              />
              <SettingsRow
                icon="settings-outline"
                iconColor={theme.colors.textSecondary}
                label={t("settings.manageSubscription")}
                onPress={presentCustomerCenter}
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Account ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <SectionHeader title={t("settings.account")} />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              {user && (
                <SettingsRow
                  icon="mail-outline"
                  iconColor={theme.colors.info}
                  label={t("common.email")}
                  value={user.email}
                  showChevron={false}
                />
              )}
              <SettingsRow
                icon="log-out-outline"
                iconColor={theme.colors.error}
                label={t("settings.signOut")}
                onPress={() => {
                  Alert.alert(
                    t("settings.signOut"),
                    t("settings.signOutConfirm"),
                    [
                      { text: t("common.cancel"), style: "cancel" },
                      {
                        text: t("settings.signOut"),
                        style: "destructive",
                        onPress: async () => {
                          await signOut();
                          router.replace("/(onboarding)/landing");
                        },
                      },
                    ]
                  );
                }}
              />
              <SettingsRow
                icon="trash-outline"
                iconColor={theme.colors.error}
                label={t("settings.deleteAccount")}
                onPress={openDeleteAccountModal}
              />
            </View>
          </Animated.View>


          <TSpacer size="xxl" />
          <TSpacer size="xxl" />
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={deleteModalVisible}
        animationType="fade"
        transparent
        onRequestClose={closeDeleteAccountModal}
      >
        <View style={styles.deleteModalBackdrop}>
          <View
            style={[
              styles.deleteModalCard,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <TText style={[styles.deleteModalTitle, { color: theme.colors.text }]}>
              Delete account permanently?
            </TText>
            <TText
              style={[
                styles.deleteModalBody,
                { color: theme.colors.textSecondary },
              ]}
            >
              This will permanently delete your account and remove your meals,
              progress, and settings according to our data deletion policy. This
              action cannot be undone.
            </TText>
            <TText style={[styles.deleteModalHint, { color: theme.colors.textMuted }]}>
              Type DELETE to confirm
            </TText>
            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              editable={!isDeletingAccount}
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
                onPress={closeDeleteAccountModal}
                disabled={isDeletingAccount}
                style={[
                  styles.deleteButton,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <TText style={{ color: theme.colors.text }}>Cancel</TText>
              </Pressable>
              <Pressable
                onPress={confirmDeleteAccount}
                disabled={!canConfirmDelete || isDeletingAccount}
                style={[
                  styles.deleteButton,
                  styles.deleteButtonDanger,
                  {
                    opacity: !canConfirmDelete || isDeletingAccount ? 0.5 : 1,
                    backgroundColor: theme.colors.error,
                  },
                ]}
              >
                {isDeletingAccount ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <TText style={{ color: "#fff", fontWeight: "700" }}>
                    Delete forever
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
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
  },
  doneButton: {
    fontSize: 16,
    fontWeight: "500",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 4,
  },
  section: {
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  iconContainer: {
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
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rowValue: {
    fontSize: 14,
    fontWeight: "400",
  },
  toggleDescription: {
    fontSize: 12,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 2,
  },
  segmentedControl: {
    flexDirection: "row",
  },
  segment: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  segmentLeft: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderRightWidth: 0,
  },
  segmentRight: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  segmentLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
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
