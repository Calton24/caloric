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
import { Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    useGoalsStore,
    usePermissionsStore,
    useProfileStore,
    useSubscriptionStore,
} from "../src/stores";
import { useTheme } from "../src/theme/useTheme";
import { TSpacer } from "../src/ui/primitives/TSpacer";
import { TText } from "../src/ui/primitives/TText";

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

  const planLabel =
    plan && plan.calorieBudget > 0
      ? `${plan!.calorieBudget} cal/day · ${plan!.timeframeWeeks} weeks`
      : "Not set";

  const subscriptionLabel =
    subscription.plan === null
      ? "Free"
      : subscription.trialStarted
        ? "Free Trial"
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
                onPress={() => {}}
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
                label="Recalculate Plan"
                onPress={() => {}}
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
                icon="arrow-undo-outline"
                iconColor={theme.colors.textSecondary}
                label="Restore Purchases"
                onPress={() => {
                  /* Restore purchases – wire to RevenueCat */
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
