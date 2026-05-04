/**
 * Meal Data Safety — regression tests for the 2026-04-29 incident.
 *
 * Background: 75 valid remote `meal_entries` rows for a single user were
 * mass-soft-deleted in a single batch immediately after sign-in, because a
 * `useNutritionStore.subscribe` watcher interpreted the local store reset as
 * 75 user-intent deletes and called `pushMealDelete()` on each missing id.
 *
 * These tests pin the post-fix invariants:
 *   1. null → existing user with empty local store cannot delete remote rows.
 *   2. resetMeals followed by tombstone replay is a no-op against the cloud.
 *   3. Explicit user delete after `markCloudRestoreComplete()` is allowed.
 */

import { mealDataSafety } from "./meal-data-safety";

const USER_A = "user-a-uuid";
const USER_B = "user-b-uuid";

describe("mealDataSafety.canDelete", () => {
  beforeEach(() => {
    mealDataSafety.reset();
  });

  it("blocks deletes when phase is idle (no user signed in)", () => {
    expect(mealDataSafety.canDelete(USER_A, "test:idle")).toBe(false);
  });

  it("blocks deletes during account switch (null → user)", () => {
    mealDataSafety.beginAccountSwitch(null, USER_A);
    expect(mealDataSafety.canDelete(USER_A, "test:account-switch")).toBe(false);
  });

  it("blocks deletes during cloud restore", () => {
    mealDataSafety.beginAccountSwitch(null, USER_A);
    mealDataSafety.beginCloudRestore(USER_A);
    expect(mealDataSafety.canDelete(USER_A, "test:restore")).toBe(false);
  });

  it("allows deletes only after cloud restore completes for the same user", () => {
    mealDataSafety.beginAccountSwitch(null, USER_A);
    mealDataSafety.beginCloudRestore(USER_A);
    mealDataSafety.markCloudRestoreComplete(USER_A);
    expect(mealDataSafety.canDelete(USER_A, "test:ready")).toBe(true);
  });

  it("blocks deletes for a user that has not been restored, even if another user has", () => {
    mealDataSafety.beginAccountSwitch(null, USER_A);
    mealDataSafety.beginCloudRestore(USER_A);
    mealDataSafety.markCloudRestoreComplete(USER_A);
    expect(mealDataSafety.canDelete(USER_B, "test:wrong-user")).toBe(false);
  });

  it("re-blocks deletes when account switch starts again", () => {
    mealDataSafety.beginAccountSwitch(null, USER_A);
    mealDataSafety.beginCloudRestore(USER_A);
    mealDataSafety.markCloudRestoreComplete(USER_A);

    // Switch to USER_B
    mealDataSafety.beginAccountSwitch(USER_A, USER_B);
    expect(mealDataSafety.canDelete(USER_A, "test:after-switch")).toBe(false);
    expect(mealDataSafety.canDelete(USER_B, "test:after-switch-b")).toBe(false);
  });

  it("reset() returns to idle and blocks all deletes", () => {
    mealDataSafety.beginAccountSwitch(null, USER_A);
    mealDataSafety.beginCloudRestore(USER_A);
    mealDataSafety.markCloudRestoreComplete(USER_A);
    expect(mealDataSafety.canDelete(USER_A, "test:before-reset")).toBe(true);

    mealDataSafety.reset();
    expect(mealDataSafety.canDelete(USER_A, "test:after-reset")).toBe(false);
  });
});

describe("Regression: 2026-04-29 mass soft-delete incident", () => {
  beforeEach(() => {
    mealDataSafety.reset();
  });

  it("scenario 1: null → existing user with empty local store cannot delete remote rows", () => {
    // Simulate: app boots with no auth, then user signs into an existing
    // account. Local stores are empty (fresh install or reset). The old buggy
    // watcher would synthesise 75 `pushMealDelete()` calls here.

    // useResetStoresOnUserChange enters account_switch BEFORE resetMeals().
    mealDataSafety.beginAccountSwitch(null, USER_A);

    // …local stores are reset… (we simulate by checking the gate state)
    expect(mealDataSafety.canDelete(USER_A, "watcher:after-reset")).toBe(false);

    // useProgressSync starts cloud restore.
    mealDataSafety.beginCloudRestore(USER_A);
    expect(mealDataSafety.canDelete(USER_A, "watcher:during-restore")).toBe(
      false
    );

    // Even at the moment restore completes but before the safety phase is
    // promoted, deletes are still blocked.
    expect(mealDataSafety.canDelete(USER_A, "watcher:before-ready")).toBe(
      false
    );
  });

  it("scenario 2: resetMeals → batch-replay would not soft-delete remote meals", () => {
    // This locks the `pushAllToSupabase` tombstone replay path.
    mealDataSafety.beginAccountSwitch(null, USER_A);

    // Suppose 75 stale tombstones existed in deletedMealIds (they shouldn't,
    // but this is the worst case). The tombstone replay loop would call
    // pushMealDelete(id, USER_A, "pushAllToSupabase:replay") on each one.
    for (const fakeId of Array.from({ length: 75 }, (_, i) => `meal-${i}`)) {
      expect(mealDataSafety.canDelete(USER_A, "pushAllToSupabase:replay")).toBe(
        false
      );
      // (No actual network call is made because canDelete returns false.)
      void fakeId;
    }
  });

  it("scenario 3: explicit user delete after hydration allows soft-deleting only that meal", () => {
    mealDataSafety.beginAccountSwitch(null, USER_A);
    mealDataSafety.beginCloudRestore(USER_A);
    mealDataSafety.markCloudRestoreComplete(USER_A);

    // User taps the trash icon on one meal in the UI. removeMeal pushes a
    // tombstone, the subscription detects the new tombstone, and calls
    // pushMealDelete(mealId, userId, "explicit-user-delete").
    expect(mealDataSafety.canDelete(USER_A, "explicit-user-delete")).toBe(true);
  });
});
