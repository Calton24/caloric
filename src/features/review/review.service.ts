/**
 * In-App Review Service
 *
 * Triggers the native App Store / Play Store review prompt
 * after the user has logged a threshold number of meals.
 *
 * Only prompts once. Respects platform availability.
 */

import { getStorage } from "../../infrastructure/storage";

const MEAL_COUNT_KEY = "caloric-review-meal-count";
const REVIEW_PROMPTED_KEY = "caloric-review-prompted";
const REVIEW_THRESHOLD = 5;

/**
 * Increment the meal count and show the review prompt if it's time.
 * Fire-and-forget — never throws.
 */
export async function trackMealAndMaybePromptReview(): Promise<void> {
  const storage = getStorage();

  const prompted = await storage.getItem(REVIEW_PROMPTED_KEY);
  if (prompted === "true") return;

  const countStr = await storage.getItem(MEAL_COUNT_KEY);
  const count = (parseInt(countStr || "0", 10) || 0) + 1;
  await storage.setItem(MEAL_COUNT_KEY, String(count));

  if (count >= REVIEW_THRESHOLD) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const StoreReview = require("expo-store-review");
      if (await StoreReview.isAvailableAsync()) {
        await StoreReview.requestReview();
        await storage.setItem(REVIEW_PROMPTED_KEY, "true");
      }
    } catch {
      // Silently ignore — review prompt is non-critical
    }
  }
}
