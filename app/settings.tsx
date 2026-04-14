/**
 * Settings Screen
 *
 * Organized by domain, not by screen location:
 *   - Profile (name, units)
 *   - Goal Plan (current plan summary, recalculate)
 *   - Permissions (mic, camera, notifications)
 *   - Apple Health (read/write toggles)
 *   - Live Activities (Island toggle)
 *   - Subscription (current plan, manage)
 *   - About (version, restore purchases)
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUnits } from "../hooks/useUnits";
import { useAuth } from "../src/features/auth/useAuth";
import {
    exportAllDataCSV,
    exportMealsCSV,
    exportWeightCSV,
} from "../src/features/export/data-export.service";
import { deleteUserAccount } from "../src/features/settings/account-deletion.service";
import { useRevenueCat } from "../src/features/subscription/useRevenueCat";
import {
    useGoalsStore,
    useNutritionStore,
    usePermissionsStore,
    useProfileStore,
    useProgressStore,
    useSubscriptionStore,
} from "../src/stores";
import { useTheme } from "../src/theme/useTheme";
import { TSpacer } from "../src/ui/primitives/TSpacer";
import { TText } from "../src/ui/primitives/TText";

// ─── Appearance Toggle Component ───────────────────────────
function AppearanceToggle() {
  const { theme, toggleMode } = useTheme();
  const isDark = theme.mode === "dark";

  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: (isDark ? "#FBBF24" : "#6366F1") + "22" },
        ]}
      >
        <Ionicons
          name={isDark ? "moon" : "sunny"}
          size={18}
          color={isDark ? "#FBBF24" : "#6366F1"}
        />
      </View>
      <TText style={[styles.rowLabel, { color: theme.colors.text }]}>
        Dark Mode
      </TText>
      <Switch
        value={isDark}
        onValueChange={toggleMode}
        trackColor={{
          false: theme.colors.surfaceSecondary,
          true: theme.colors.primary + "88",
        }}
        thumbColor={isDark ? theme.colors.primary : theme.colors.textMuted}
      />
    </View>
  );
}

// ─── Section Row Component ─────────────────────────────────
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
  value,
  onToggle,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  const { theme } = useTheme();

  return (
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
  const { theme } = useTheme();
  const router = useRouter();
  const units = useUnits();
  const { user, signOut } = useAuth();

  // ── Domain stores ──
  const profile = useProfileStore((s) => s.profile);
  const plan = useGoalsStore((s) => s.plan);
  const permissions = usePermissionsStore((s) => s.permissions);
  const setAppleHealthReadEnabled = usePermissionsStore(
    (s) => s.setAppleHealthReadEnabled
  );
  const setAppleHealthWriteEnabled = usePermissionsStore(
    (s) => s.setAppleHealthWriteEnabled
  );
  const setLiveActivitiesEnabled = usePermissionsStore(
    (s) => s.setLiveActivitiesEnabled
  );
  const subscription = useSubscriptionStore((s) => s.subscription);
  const meals = useNutritionStore((s) => s.meals);
  const weightLogs = useProgressStore((s) => s.weightLogs);
  const {
    isPro,
    presentPaywall,
    presentCustomerCenter,
    restorePurchases,
    isRestoring,
  } = useRevenueCat();

  const handleExport = async (type: "meals" | "weight" | "all") => {
    try {
      if (type === "meals") await exportMealsCSV(meals);
      else if (type === "weight") await exportWeightCSV(weightLogs);
      else await exportAllDataCSV(meals, weightLogs);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Export failed";
      Alert.alert("Export Error", msg);
    }
  };

  const planLabel =
    plan && plan.calorieBudget > 0
      ? `${plan!.calorieBudget} cal/day · ${plan!.timeframeWeeks} weeks`
      : "Not set";

  const subscriptionLabel =
    subscription.plan === null
      ? "Free"
      : subscription.trialStarted
        ? "Challenge"
        : subscription.plan === "monthly"
          ? "Monthly"
          : "Yearly";

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            Settings
          </TText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Appearance ── */}
          <Animated.View entering={FadeIn.duration(400)}>
            <SectionHeader title="APPEARANCE" />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <AppearanceToggle />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Profile ── */}
          <Animated.View entering={FadeIn.duration(400)}>
            <SectionHeader title="PROFILE" />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsRow
                icon="person-outline"
                iconColor={theme.colors.primary}
                label="Name"
                value={profile.id}
                onPress={() => {}}
              />
              <SettingsRow
                icon="resize-outline"
                iconColor={theme.colors.info}
                label="Units"
                value={profile.weightUnit === "lbs" ? "Imperial" : "Metric"}
                onPress={() => units.toggleWeightUnit()}
              />
              <SettingsRow
                icon="body-outline"
                iconColor={theme.colors.accent}
                label="Activity Level"
                value={
                  (profile.activityLevel ?? "moderate")
                    .charAt(0)
                    .toUpperCase() +
                  (profile.activityLevel ?? "moderate").slice(1)
                }
                onPress={() => {}}
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Goal Plan ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <SectionHeader title="GOAL PLAN" />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsRow
                icon="flag-outline"
                iconColor={theme.colors.success}
                label="Current Plan"
                value={planLabel}
                showChevron={false}
              />
              <SettingsRow
                icon="refresh-outline"
                iconColor={theme.colors.primary}
                label="Edit Goals"
                onPress={() => router.push("/goals" as any)}
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Permissions ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <SectionHeader title="PERMISSIONS" />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsRow
                icon="mic-outline"
                iconColor="#60A5FA"
                label="Microphone"
                value={permissions.microphone}
                showChevron={false}
              />
              <SettingsRow
                icon="camera-outline"
                iconColor="#F87171"
                label="Camera"
                value={permissions.camera}
                showChevron={false}
              />
              <SettingsRow
                icon="notifications-outline"
                iconColor="#FBBF24"
                label="Notifications"
                value={permissions.notifications}
                showChevron={false}
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Apple Health & Live Activities ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <SectionHeader title="INTEGRATIONS" />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsToggle
                icon="heart-outline"
                iconColor="#F87171"
                label="Apple Health (Read)"
                value={permissions.appleHealthReadEnabled}
                onToggle={() =>
                  setAppleHealthReadEnabled(!permissions.appleHealthReadEnabled)
                }
              />
              <SettingsToggle
                icon="heart-outline"
                iconColor="#F87171"
                label="Apple Health (Write)"
                value={permissions.appleHealthWriteEnabled}
                onToggle={() =>
                  setAppleHealthWriteEnabled(
                    !permissions.appleHealthWriteEnabled
                  )
                }
              />
              <SettingsToggle
                icon="phone-portrait-outline"
                iconColor={theme.colors.primary}
                label="Live Activities"
                value={permissions.liveActivitiesEnabled}
                onToggle={() =>
                  setLiveActivitiesEnabled(!permissions.liveActivitiesEnabled)
                }
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Data Export ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(350)}>
            <SectionHeader title="DATA" />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsRow
                icon="nutrition-outline"
                iconColor={theme.colors.primary}
                label="Export Meals"
                value={`${meals.length} meals`}
                onPress={() => handleExport("meals")}
              />
              <SettingsRow
                icon="scale-outline"
                iconColor={theme.colors.info}
                label="Export Weight"
                value={`${weightLogs.length} entries`}
                onPress={() => handleExport("weight")}
              />
              <SettingsRow
                icon="download-outline"
                iconColor={theme.colors.success}
                label="Export All Data"
                onPress={() => handleExport("all")}
              />
            </View>
          </Animated.View>

          <TSpacer size="md" />

          {/* ── Subscription ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <SectionHeader title="SUBSCRIPTION" />
            <View
              style={[
                styles.section,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <SettingsRow
                icon="card-outline"
                iconColor={theme.colors.success}
                label="Current Plan"
                value={subscriptionLabel}
                showChevron={false}
              />
              <SettingsRow
                icon="star-outline"
                iconColor={theme.colors.primary}
                label={isPro ? "You’re Pro" : "Upgrade to Pro"}
                onPress={presentPaywall}
              />
              <SettingsRow
                icon="arrow-undo-outline"
                iconColor={theme.colors.textSecondary}
                label={isRestoring ? "Restoring…" : "Restore Purchases"}
                onPress={isRestoring ? undefined : restorePurchases}
              />
              <SettingsRow
                icon="settings-outline"
                iconColor={theme.colors.textSecondary}
                label="Manage Subscription"
                onPress={presentCustomerCenter}
              />
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Legal ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(420)}>
            <SectionHeader title="LEGAL" />
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
                label="Terms of Service"
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

          {/* ── Account ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(450)}>
            <SectionHeader title="ACCOUNT" />
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
                icon="trash-outline"
                iconColor={theme.colors.error}
                label="Delete Account"
                onPress={() => {
                  Alert.alert(
                    "Delete Account",
                    "This will permanently delete your account and all associated data. This action cannot be undone.\n\nAre you sure you want to continue?",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: async () => {
                          const result = await deleteUserAccount();
                          if (result.success) {
                            router.replace("/(onboarding)/landing");
                          } else {
                            Alert.alert(
                              "Deletion Failed",
                              result.error ||
                                "Unable to delete account. Please contact support at support@caloric.app"
                            );
                          }
                        },
                      },
                    ]
                  );
                }}
              />
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
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
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
});
