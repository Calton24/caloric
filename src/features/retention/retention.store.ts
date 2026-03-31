/**
 * Retention Store
 *
 * Persisted state for the retention engine.
 * Tracks app opens, streak recovery, notification rotation,
 * and Day 0 auto-camera state.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getStorage } from "../../infrastructure/storage";
import type { RetentionState } from "./retention.types";

interface RetentionStore extends RetentionState {
  /** Record an app open (call once per session) */
  recordAppOpen: () => void;
  /** Record the very first meal logged */
  recordFirstMeal: () => void;
  /** Record a streak that was lost (for recovery messaging) */
  recordLostStreak: (streak: number) => void;
  /** Mark the Day 1 auto-camera prompt as shown */
  markDay1CameraShown: () => void;
  /** Advance the notification rotation index */
  advanceNotificationRotation: () => void;
  /** Record a soft paywall trigger */
  recordSoftPaywall: () => void;
  /** Reset retention state (e.g. on sign-out) */
  resetRetention: () => void;
}

function toDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export const useRetentionStore = create<RetentionStore>()(
  persist(
    (set) => ({
      firstMealAt: null,
      appOpens: 0,
      lastOpenDate: null,
      openStreak: 0,
      lastLostStreak: 0,
      day1CameraShown: false,
      notificationRotationIndex: 0,
      lastSoftPaywallDate: null,

      recordAppOpen: () =>
        set((state) => {
          const today = toDateString();
          if (state.lastOpenDate === today) {
            // Already recorded today
            return state;
          }

          const yesterday = (() => {
            const d = new Date();
            d.setDate(d.getDate() - 1);
            return toDateString(d);
          })();

          const isConsecutive = state.lastOpenDate === yesterday;

          return {
            appOpens: state.appOpens + 1,
            lastOpenDate: today,
            openStreak: isConsecutive ? state.openStreak + 1 : 1,
          };
        }),

      recordFirstMeal: () =>
        set((state) => ({
          firstMealAt: state.firstMealAt ?? new Date().toISOString(),
        })),

      recordLostStreak: (streak) => set({ lastLostStreak: streak }),

      markDay1CameraShown: () => set({ day1CameraShown: true }),

      advanceNotificationRotation: () =>
        set((state) => ({
          notificationRotationIndex: state.notificationRotationIndex + 1,
        })),

      recordSoftPaywall: () => set({ lastSoftPaywallDate: toDateString() }),

      resetRetention: () =>
        set({
          firstMealAt: null,
          appOpens: 0,
          lastOpenDate: null,
          openStreak: 0,
          lastLostStreak: 0,
          day1CameraShown: false,
          notificationRotationIndex: 0,
          lastSoftPaywallDate: null,
        }),
    }),
    {
      name: "caloric-retention",
      storage: createJSONStorage(() => ({
        getItem: (key: string) => getStorage().getItem(key),
        setItem: (key: string, value: string) =>
          getStorage().setItem(key, value),
        removeItem: (key: string) => getStorage().removeItem(key),
      })),
    }
  )
);
