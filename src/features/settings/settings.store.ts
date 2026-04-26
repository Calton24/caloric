/**
 * Settings Feature — Zustand Store
 *
 * App-level preferences: language, units, notifications, Apple Health.
 */

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getStorage } from "../../infrastructure/storage";
import type { AppSettings, UnitsPreference } from "./settings.types";

interface SettingsStore {
  settings: AppSettings;
  setInputLanguage: (language: string) => void;
  setUnitsPreference: (preference: UnitsPreference) => void;
  setLogReminderEnabled: (enabled: boolean) => void;
  setAppleHealthSyncEnabled: (enabled: boolean) => void;
  setLastAppleHealthSyncAt: (iso: string | null) => void;
  setLiveActivitiesEnabled: (enabled: boolean) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setHasSeenPermissions: (seen: boolean) => void;
  setHasSeenLiveActivityIntro: (seen: boolean) => void;
  resetSettings: () => void;
}

export const initialSettings: AppSettings = {
  inputLanguage: "en-US",
  unitsPreference: "system",
  logReminderEnabled: false,
  appleHealthSyncEnabled: false,
  lastAppleHealthSyncAt: null,
  liveActivitiesEnabled: false,
  notificationsEnabled: false,
  hasSeenPermissions: false,
  hasSeenLiveActivityIntro: false,
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      settings: initialSettings,

      setInputLanguage: (inputLanguage) =>
        set((s) => ({ settings: { ...s.settings, inputLanguage } })),

      setUnitsPreference: (unitsPreference) =>
        set((s) => ({ settings: { ...s.settings, unitsPreference } })),

      setLogReminderEnabled: (logReminderEnabled) =>
        set((s) => ({ settings: { ...s.settings, logReminderEnabled } })),

      setAppleHealthSyncEnabled: (appleHealthSyncEnabled) =>
        set((s) => ({ settings: { ...s.settings, appleHealthSyncEnabled } })),

      setLastAppleHealthSyncAt: (lastAppleHealthSyncAt) =>
        set((s) => ({ settings: { ...s.settings, lastAppleHealthSyncAt } })),

      setLiveActivitiesEnabled: (liveActivitiesEnabled) =>
        set((s) => ({ settings: { ...s.settings, liveActivitiesEnabled } })),

      setNotificationsEnabled: (notificationsEnabled) =>
        set((s) => ({ settings: { ...s.settings, notificationsEnabled } })),

      setHasSeenPermissions: (hasSeenPermissions) =>
        set((s) => ({ settings: { ...s.settings, hasSeenPermissions } })),

      setHasSeenLiveActivityIntro: (hasSeenLiveActivityIntro) =>
        set((s) => ({ settings: { ...s.settings, hasSeenLiveActivityIntro } })),

      resetSettings: () => set({ settings: initialSettings }),
    }),
    {
      name: "caloric-settings",
      storage: createJSONStorage(() => ({
        getItem: (key: string) => getStorage().getItem(key),
        setItem: (key: string, value: string) =>
          getStorage().setItem(key, value),
        removeItem: (key: string) => getStorage().removeItem(key),
      })),
      merge: (persisted, current) => ({
        ...current,
        settings: {
          ...(current as SettingsStore).settings,
          ...((persisted as Partial<SettingsStore>)?.settings ?? {}),
        },
      }),
    }
  )
);

/**
 * React hook — returns true once the settings store has rehydrated from
 * storage. Prevents reading default values before hydration completes.
 */
export function useSettingsHydrated(): boolean {
  return useSyncExternalStore(
    useSettingsStore.persist.onFinishHydration,
    useSettingsStore.persist.hasHydrated,
    useSettingsStore.persist.hasHydrated
  );
}
