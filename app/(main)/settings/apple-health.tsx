/**
 * Apple Health Settings
 *
 * Master sync toggle + individual read/write toggles.
 * Reads/writes from useSettingsStore (appleHealthSyncEnabled) and
 * usePermissionsStore (appleHealthReadEnabled, appleHealthWriteEnabled).
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Switch,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    getHealthService,
    syncWithHealthKit,
} from "../../../src/features/health";
import { usePermissionsStore } from "../../../src/features/permissions";
import { useSettingsStore } from "../../../src/features/settings";
import { useAppTranslation } from "../../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../../src/theme/useTheme";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

export default function AppleHealthScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();

  // Settings store
  const appleHealthSyncEnabled = useSettingsStore(
    (s) => s.settings.appleHealthSyncEnabled
  );
  const lastAppleHealthSyncAt = useSettingsStore(
    (s) => s.settings.lastAppleHealthSyncAt
  );
  const setAppleHealthSyncEnabled = useSettingsStore(
    (s) => s.setAppleHealthSyncEnabled
  );
  const setLastAppleHealthSyncAt = useSettingsStore(
    (s) => s.setLastAppleHealthSyncAt
  );

  // Permissions store
  const appleHealthReadEnabled = usePermissionsStore(
    (s) => s.permissions.appleHealthReadEnabled
  );
  const appleHealthWriteEnabled = usePermissionsStore(
    (s) => s.permissions.appleHealthWriteEnabled
  );
  const setAppleHealthReadEnabled = usePermissionsStore(
    (s) => s.setAppleHealthReadEnabled
  );
  const setAppleHealthWriteEnabled = usePermissionsStore(
    (s) => s.setAppleHealthWriteEnabled
  );

  const [syncing, setSyncing] = useState(false);

  const handleToggleMaster = useCallback(
    async (value: boolean) => {
      if (value) {
        // Request HealthKit permissions when enabling
        const service = getHealthService();
        const available = await service.isAvailable();
        if (!available) {
          Alert.alert(
            t("settings.notAvailable"),
            t("settings.notAvailableDesc")
          );
          return;
        }
        const granted = await service.requestPermissions({
          read: true,
          write: true,
        });
        if (!granted) {
          Alert.alert(
            t("settings.permissionRequired"),
            t("settings.permissionRequiredDesc")
          );
          return;
        }
      }
      setAppleHealthSyncEnabled(value);
      if (!value) {
        setAppleHealthReadEnabled(false);
        setAppleHealthWriteEnabled(false);
      }
    },
    [
      setAppleHealthSyncEnabled,
      setAppleHealthReadEnabled,
      setAppleHealthWriteEnabled,
    ]
  );

  const handleSyncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await syncWithHealthKit({
        read: appleHealthReadEnabled,
        write: appleHealthWriteEnabled,
      });
      setLastAppleHealthSyncAt(new Date().toISOString());
      Alert.alert(
        t("settings.syncComplete"),
        t("settings.syncCompleteDesc", {
          weightImported: result.weightImported,
          mealsExported: result.mealsExported,
        })
      );
    } catch {
      Alert.alert(t("settings.syncFailed"), t("settings.syncFailedDesc"));
    } finally {
      setSyncing(false);
    }
  }, [
    syncing,
    appleHealthReadEnabled,
    appleHealthWriteEnabled,
    setLastAppleHealthSyncAt,
  ]);

  const lastSyncLabel = lastAppleHealthSyncAt
    ? t("settings.lastSynced", {
        date: new Date(lastAppleHealthSyncAt).toLocaleString(),
      })
    : t("settings.neverSynced");

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
            {t("settings.appleHealth")}
          </TText>
          <View style={{ width: 24 }} />
        </View>

        <TSpacer size="md" />

        <View style={styles.content}>
          {/* Master toggle */}
          <TText
            style={[styles.sectionTitle, { color: theme.colors.textMuted }]}
          >
            {t("settings.sync")}
          </TText>
          <View
            style={[
              styles.section,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <ToggleRow
              icon="heart"
              iconColor="#F87171"
              label={t("settings.appleHealthSync")}
              value={appleHealthSyncEnabled}
              onToggle={handleToggleMaster}
            />
          </View>

          <TSpacer size="lg" />

          {/* Sub-toggles (only enabled when master is on) */}
          <TText
            style={[styles.sectionTitle, { color: theme.colors.textMuted }]}
          >
            {t("settings.data")}
          </TText>
          <View
            style={[
              styles.section,
              {
                backgroundColor: theme.colors.surfaceSecondary,
                opacity: appleHealthSyncEnabled ? 1 : 0.5,
              },
            ]}
          >
            <ToggleRow
              icon="download-outline"
              iconColor="#60A5FA"
              label={t("settings.importWeight")}
              value={appleHealthReadEnabled}
              onToggle={(v) =>
                appleHealthSyncEnabled && setAppleHealthReadEnabled(v)
              }
              disabled={!appleHealthSyncEnabled}
            />
            <View
              style={{
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.border,
              }}
            />
            <ToggleRow
              icon="push-outline"
              iconColor="#34D399"
              label={t("settings.exportNutrition")}
              value={appleHealthWriteEnabled}
              onToggle={(v) =>
                appleHealthSyncEnabled && setAppleHealthWriteEnabled(v)
              }
              disabled={!appleHealthSyncEnabled}
            />
          </View>

          <TSpacer size="lg" />

          {/* Sync status */}
          <TText
            style={[styles.sectionTitle, { color: theme.colors.textMuted }]}
          >
            {t("settings.status")}
          </TText>
          <View
            style={[
              styles.section,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <View style={styles.statusRow}>
              <TText
                style={[
                  styles.statusLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {lastSyncLabel}
              </TText>
            </View>
          </View>

          <TSpacer size="md" />

          {/* Sync Now button */}
          <Pressable
            onPress={handleSyncNow}
            disabled={!appleHealthSyncEnabled || syncing}
            style={[
              styles.syncButton,
              {
                backgroundColor: theme.colors.primary,
                opacity: appleHealthSyncEnabled && !syncing ? 1 : 0.5,
              },
            ]}
          >
            {syncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <TText style={styles.syncButtonText}>
                {t("settings.syncNow")}
              </TText>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ── Toggle Row (local) ──────────────────────────────────────
function ToggleRow({
  icon,
  iconColor,
  label,
  value,
  onToggle,
  disabled = false,
}: {
  icon: string;
  iconColor: string;
  label: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  disabled?: boolean;
}) {
  const { theme } = useTheme();

  return (
    <View style={styles.row}>
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
        disabled={disabled}
        trackColor={{
          false: theme.colors.surfaceSecondary,
          true: theme.colors.primary + "88",
        }}
        thumbColor={value ? theme.colors.primary : theme.colors.textMuted}
      />
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
  content: {
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
  statusRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  statusLabel: {
    fontSize: 14,
  },
  syncButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  syncButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
