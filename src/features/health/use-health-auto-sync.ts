/**
 * useHealthAutoSync — Foreground Auto-Sync Hook
 *
 * When Apple Health sync is enabled, automatically syncs weight + nutrition
 * when the app returns to foreground (at most once per 15 minutes).
 */

import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import { usePermissionsStore } from "../permissions";
import { useSettingsStore } from "../settings";
import { syncWithHealthKit } from "./health-sync.service";

const MIN_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export function useHealthAutoSync() {
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    const subscription = AppState.addEventListener(
      "change",
      async (nextState: AppStateStatus) => {
        if (nextState !== "active") return;

        const { appleHealthSyncEnabled } = useSettingsStore.getState().settings;
        if (!appleHealthSyncEnabled) return;

        const now = Date.now();
        if (now - lastSyncRef.current < MIN_SYNC_INTERVAL_MS) return;
        lastSyncRef.current = now;

        const { appleHealthReadEnabled, appleHealthWriteEnabled } =
          usePermissionsStore.getState().permissions;

        try {
          await syncWithHealthKit({
            read: appleHealthReadEnabled,
            write: appleHealthWriteEnabled,
          });
          useSettingsStore
            .getState()
            .setLastAppleHealthSyncAt(new Date().toISOString());
        } catch {
          // Silent fail — don't interrupt the user
        }
      }
    );

    return () => subscription.remove();
  }, []);
}
