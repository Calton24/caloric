// Pin the post-save nav mode to "replaceTabs" so this suite exercises the
// canonical post-save behavior even while the device-side bisect default is
// hard-coded to "none". Bisect-mode coverage lives in paywall-mode-style
// matrix tests rather than this one.
jest.mock("../src/features/debug/safe-mode-flags", () => ({
  FOOD_LOG_SAFE_MODE: false,
  FOOD_LOG_RENDER_FAKE_HOME: false,
  FOOD_LOG_POST_SAVE_NAV_MODE: "replaceTabs",
  assertFoodLogSafeModeImport: jest.fn(),
}));

import {
  getLastMealLogNavigationMethod,
  replaceHomeAfterMealLog,
  resetLastMealLogNavigationMethodForTests,
  safeReturnToHomeAfterMealLog,
} from "../src/features/food-logging/safe-return-after-meal-log";
import { validateConfirmMealDraftForTrack } from "../src/features/food-logging/confirm-meal-track.validation";
import {
  ENABLE_POST_SAVE_EXTRAS,
  TRACK_CALORIES_HOME_HREF,
} from "../src/features/food-logging/track-calories.constants";
import { mapDraftSourceToTrackFlow } from "../src/features/food-logging/track-calories-utils";
import type { MealDraft } from "../src/features/nutrition/nutrition.draft.types";

describe("confirm-meal track path", () => {
  afterEach(() => {
    resetLastMealLogNavigationMethodForTests();
  });

  it("post-save growth extras are off for isolation", () => {
    expect(ENABLE_POST_SAVE_EXTRAS).toBe(false);
  });

  it("mapDraftSourceToTrackFlow maps entry sources", () => {
    expect(mapDraftSourceToTrackFlow("voice")).toBe("voice");
    expect(mapDraftSourceToTrackFlow("barcode")).toBe("barcode");
    expect(mapDraftSourceToTrackFlow("camera")).toBe("ai_camera");
    expect(mapDraftSourceToTrackFlow("image")).toBe("ai_camera");
    expect(mapDraftSourceToTrackFlow("manual")).toBe("text");
    expect(mapDraftSourceToTrackFlow(undefined)).toBe("text");
  });

  it("validateConfirmMealDraftForTrack rejects null draft", () => {
    const r = validateConfirmMealDraftForTrack(null, null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("no_draft");
  });

  it("validateConfirmMealDraftForTrack accepts minimal barcode-style draft", () => {
    const draft: MealDraft = {
      title: "Ketchup",
      source: "barcode",
      calories: 15,
      protein: 0,
      carbs: 0,
      fat: 0,
      estimatedItems: undefined,
    };
    const r = validateConfirmMealDraftForTrack(draft, "2026-05-07");
    expect(r.ok).toBe(true);
  });

  it("validateConfirmMealDraftForTrack rejects bad log date", () => {
    const draft: MealDraft = {
      title: "Ketchup",
      source: "barcode",
      calories: 15,
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    const r = validateConfirmMealDraftForTrack(draft, "not-a-date");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("invalid_log_date");
  });

  it("validateConfirmMealDraftForTrack rejects unknown meal source", () => {
    const draft = {
      title: "Ok",
      source: "not-a-real-source",
      calories: 10,
      protein: 0,
      carbs: 0,
      fat: 0,
    } as unknown as MealDraft;
    const r = validateConfirmMealDraftForTrack(draft, null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("draft_validation");
  });

  it("replaceHomeAfterMealLog calls replace once with tabs home href", () => {
    const calls: { method: string; href: unknown }[] = [];
    const router = {
      replace: (href: unknown) => {
        calls.push({ method: "replace", href });
      },
    };
    replaceHomeAfterMealLog(router as any, {
      pathname: "/(modals)/confirm-meal",
      segments: ["(modals)", "confirm-meal"],
    });
    expect(calls).toEqual([{ method: "replace", href: TRACK_CALORIES_HOME_HREF }]);
    expect(getLastMealLogNavigationMethod()).toBe("replace_home");
  });

  it("safeReturnToHomeAfterMealLog delegates to single replace", () => {
    const replace = jest.fn();
    safeReturnToHomeAfterMealLog(
      { replace } as any,
      { pathname: "/x", segments: ["x"] },
    );
    expect(replace).toHaveBeenCalledTimes(1);
    expect(replace.mock.calls[0][0]).toBe(TRACK_CALORIES_HOME_HREF);
  });
});
