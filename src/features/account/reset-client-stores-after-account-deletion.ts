/**
 * Clears local Zustand state and user-owned persisted keys after the server has
 * confirmed account deletion. Shared by Settings and the home profile menu.
 */

import { insightTelemetry, useInsightStore } from "../insights";
import { useChallengeStore } from "../challenge/challenge.store";
import { useGoalsStore } from "../goals/goals.store";
import { useNutritionStore } from "../nutrition/nutrition.store";
import { useProfileStore } from "../profile/profile.store";
import { useProgressStore } from "../progress/progress.store";
import { useRetentionStore } from "../retention/retention.store";
import { useShareStore } from "../share/share.store";
import { useStreakStore } from "../streak/streak.store";
import { useSubscriptionStore } from "../subscription";
import { useAppTrialStore } from "../subscription/app-trial.store";
import { useScanCreditsStore } from "../subscription/scanCredits.store";
import { useWaterStore } from "../water/water.store";
import { useBackgroundScanStore } from "../camera/background-scan.store";
import { usePortionLearningStore } from "../nutrition/memory/portion-learning.service";
import { usePendingMealReviewStore } from "../nutrition/pending-meal-review.store";
import { usePermissionsStore } from "../permissions/permissions.store";
import { useSettingsStore } from "../settings/settings.store";
import { useLastKnownAccessStore } from "../access/last-known-access.store";
import { clearPendingPaywallHandoffMarker } from "../onboarding/post-auth-onboarding-handoff";
import { removeUserOwnedStorageKeys } from "./remove-user-owned-storage-keys";

export async function resetClientStoresAfterAccountDeletion(
  userId?: string | null
): Promise<void> {
  if (__DEV__) {
    console.log("[DeleteAccount] local cleanup started");
  }
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
  useAppTrialStore.getState().reset();
  useScanCreditsStore.getState().resetCredits();
  useInsightStore.getState().reset();
  insightTelemetry.resetSession();
  usePortionLearningStore.setState({ corrections: {} });
  usePendingMealReviewStore.getState().clearPendingMealReview("account_deleted");
  useBackgroundScanStore.setState({ jobs: {} });
  useSettingsStore.getState().resetSettings();
  usePermissionsStore.getState().resetPermissions();
  useLastKnownAccessStore.getState().reset();
  await clearPendingPaywallHandoffMarker().catch(() => {});
  await removeUserOwnedStorageKeys({ userId });
  if (__DEV__) {
    console.log("[DeleteAccount] local cleanup complete");
  }
}
