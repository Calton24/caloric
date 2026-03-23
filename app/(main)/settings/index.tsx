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
import * as WebBrowser from "expo-web-browser";
import React, { useCallback } from "react";
import {
    Alert,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../../src/features/auth/useAuth";
import {
    areLiveActivitiesAvailable,
    endLiveActivity,
} from "../../../src/features/live-activity";
import { usePermissionsStore } from "../../../src/features/permissions";
import {
    getLanguageLabel,
    getUnitsLabel,
    useSettingsStore,
} from "../../../src/features/settings";
import { useSubscriptionStore } from "../../../src/features/subscription";
import { getBillingProvider } from "../../../src/lib/billing";
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

export default function SettingsScreen() {
  const { theme, toggleMode } = useTheme();
  const router = useRouter();
  const { user, signOut, deleteAccount } = useAuth();

  // ── Settings store ──
  const settings = useSettingsStore((s) => s.settings);
  const languageLabel = getLanguageLabel(settings.inputLanguage);
  const unitsLabel = getUnitsLabel(settings);

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
      ? "Free"
      : subscription.trialStarted
        ? "Free Trial"
        : subscription.plan === "monthly"
          ? "Monthly"
          : "Yearly";

  // ── Handlers ──
  const handleToggleLiveActivities = useCallback(
    async (value: boolean) => {
      if (value) {
        if (Platform.OS !== "ios") {
          Alert.alert("iOS Only", "Live Activities are only available on iOS.");
          return;
        }
        if (!areLiveActivitiesAvailable()) {
          Alert.alert(
            "Live Activities Unavailable",
            "Make sure you're running a development build (not Expo Go) on iOS 16.2+, " +
              "and that Live Activities are enabled in iOS Settings > Caloric > Live Activities."
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
            Settings
          </TText>
          <Pressable onPress={handleDone} hitSlop={12}>
            <TText
              style={[styles.doneButton, { color: theme.colors.textSecondary }]}
            >
              Done
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
                label={subscription.plan ? "You are Pro" : "Upgrade to Pro"}
                value={
                  subscription.plan
                    ? "Thank you for your support!"
                    : subscriptionLabel
                }
                onPress={() => {}}
                showChevron
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Appearance ── */}
          <Animated.View entering={FadeIn.duration(400)}>
            <SectionHeader title="Appearance" />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsToggle
                icon={theme.mode === "dark" ? "moon" : "sunny"}
                iconColor={theme.mode === "dark" ? "#FBBF24" : "#6366F1"}
                label="Dark Mode"
                value={theme.mode === "dark"}
                onToggle={() => toggleMode()}
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── General ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <SectionHeader title="General" />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsRow
                icon="globe-outline"
                iconColor={theme.colors.primary}
                label="Voice & Text Input"
                value={languageLabel}
                onPress={() =>
                  router.push("/(main)/settings/voice-text-input" as any)
                }
              />
              <SettingsRow
                icon="text-outline"
                iconColor={theme.colors.primary}
                label="Units"
                value={unitsLabel}
                onPress={() => router.push("/(main)/settings/units" as any)}
              />
              <SettingsRow
                icon="accessibility-outline"
                iconColor={theme.colors.primary}
                label="Body Measurements"
                onPress={() =>
                  router.push("/(main)/settings/body-measurements" as any)
                }
              />
              <SettingsRow
                icon="notifications-outline"
                iconColor={theme.colors.primary}
                label="Notifications"
                onPress={() =>
                  router.push("/(main)/settings/notifications" as any)
                }
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Apple Health ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <SectionHeader title="Apple Health" />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsRow
                icon="heart"
                iconColor="#F87171"
                label="Apple Health"
                onPress={() =>
                  router.push("/(main)/settings/apple-health" as any)
                }
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Extensions ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <SectionHeader title="Extensions" />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsToggle
                icon="phone-portrait-outline"
                iconColor={theme.colors.primary}
                label="Live Activities"
                description="Showing the current progress on your lockscreen."
                value={liveActivitiesEnabled}
                onToggle={handleToggleLiveActivities}
              />
            </View>
          </Animated.View>

          {/* ── Legal ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(350)}>
            <SectionHeader title="Legal" />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsRow
                icon="document-text-outline"
                iconColor={theme.colors.textSecondary}
                label="Privacy Policy"
                onPress={() =>
                  WebBrowser.openBrowserAsync(
                    "https://calton24.github.io/caloric/privacy-policy"
                  )
                }
              />
              <SettingsRow
                icon="document-outline"
                iconColor={theme.colors.textSecondary}
                label="Terms of Service"
                onPress={() =>
                  WebBrowser.openBrowserAsync(
                    "https://calton24.github.io/caloric/terms-of-service"
                  )
                }
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Subscription ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(380)}>
            <SectionHeader title="Subscription" />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsRow
                icon="arrow-undo-outline"
                iconColor={theme.colors.textSecondary}
                label="Restore Purchases"
                onPress={async () => {
                  try {
                    const provider = getBillingProvider();
                    await provider.restorePurchases();
                    Alert.alert("Success", "Purchases restored successfully.");
                  } catch {
                    Alert.alert(
                      "Error",
                      "Could not restore purchases. Please try again."
                    );
                  }
                }}
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Account ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <SectionHeader title="Account" />
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
                  label="Email"
                  value={user.email}
                  showChevron={false}
                />
              )}
              <SettingsRow
                icon="log-out-outline"
                iconColor={theme.colors.error}
                label="Sign Out"
                onPress={() => {
                  Alert.alert(
                    "Sign Out",
                    "Are you sure you want to sign out?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Sign Out",
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
                label="Delete Account"
                onPress={() => {
                  Alert.alert(
                    "Delete Account",
                    "This will permanently delete your account and all your data. This action cannot be undone.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () => {
                          Alert.alert(
                            "Are you absolutely sure?",
                            "All your meals, progress, and settings will be permanently erased.",
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Delete Forever",
                                style: "destructive",
                                onPress: async () => {
                                  const { error } = await deleteAccount();
                                  if (error) {
                                    Alert.alert(
                                      "Error",
                                      "Could not delete account. Please try again."
                                    );
                                  } else {
                                    router.replace("/(onboarding)/landing");
                                  }
                                },
                              },
                            ]
                          );
                        },
                      },
                    ]
                  );
                }}
              />
            </View>
          </Animated.View>

          <TSpacer size="xxl" />
          <TSpacer size="xxl" />
        </ScrollView>
      </SafeAreaView>
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
});
