/**
 * Removes persisted keys that belong to the signed-in user / CalCut domain.
 * Intentionally does NOT call `AsyncStorage.clear()` — that would wipe the whole
 * app namespace (theme, i18n, Supabase session keys, third-party SDK state, etc.).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "../../lib/storage/storage.keys";
import { getStorage } from "../../infrastructure/storage";
import { clearPersistedMealsForUser } from "../food-logging/repositories/meal.repository";

/** Zustand `persist({ name })` keys and other explicit user-data keys. */
const STATIC_USER_DATA_KEYS: string[] = [
  ...Object.values(STORAGE_KEYS),
  "caloric-meals",
  "caloric-profile",
  "caloric-permissions",
  "caloric-challenge",
  "caloric-pending-meal-review",
  "caloric-goals",
  "caloric-retention",
  "caloric-share-milestones",
  "caloric-insights",
  "caloric-background-scan",
  "caloric-settings",
  "caloric-water",
  "caloric-streak",
  "caloric-weight-logs",
  "caloric-portion-learning",
  "caloric:subscription_state",
  "caloric:scan_credits",
  "caloric:paywall_triggers_seen",
  "caloric:last_known_access:v1",
  "caloric-user-consent",
  "caloric-consent-version",
  "caloric-review-meal-count",
  "caloric-review-prompted",
  "caloric_food_region",
  "growth:anon_id",
  "ab_assignments_v1",
  "@calcut/onboarding_pending_paywall_handoff_v1",
  "last_food_log_commit",
  "last_track_calories_phase",
];

async function collectFoodLogTxnKeys(): Promise<string[]> {
  try {
    const all = await AsyncStorage.getAllKeys();
    return all.filter((k) => k.startsWith("food_log_txn_"));
  } catch {
    return [];
  }
}

export async function removeUserOwnedStorageKeys(options: {
  userId?: string | null;
}): Promise<void> {
  const { userId } = options;
  if (userId) {
    await clearPersistedMealsForUser(userId);
  }

  const dynamic = await collectFoodLogTxnKeys();
  const keys = [...new Set([...STATIC_USER_DATA_KEYS, ...dynamic])];
  await getStorage().multiRemove(keys);
}
