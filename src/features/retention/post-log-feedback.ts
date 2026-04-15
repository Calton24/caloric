/**
 * Retention Engine — Post-Log Feedback
 *
 * Delegates to the day-journey system for exact day-by-day after-log messages.
 * First meal of the day gets the specific journey message.
 * Subsequent meals get a lightweight "logged" confirmation.
 */

import { getAfterLogContent } from "./day-journey";
import type { PostLogFeedback } from "./retention.types";

const SUBSEQUENT_MEAL: PostLogFeedback = {
  message: "Logged",
  subMessage: "Another meal tracked",
  emoji: "✓",
  type: "progress",
};

/**
 * Get post-log feedback for the current streak day.
 * First meal of the day gets the exact journey-scripted message.
 * Subsequent meals get a minimal confirmation.
 */
export function getPostLogFeedback(
  currentStreak: number,
  totalMealsToday: number
): PostLogFeedback {
  // Subsequent meals — keep it lightweight
  if (totalMealsToday > 1) {
    return SUBSEQUENT_MEAL;
  }

  // First meal of the day — use the exact day-journey content
  const content = getAfterLogContent(currentStreak);

  // Map journey phase to feedback type
  const typeMap: Record<string, PostLogFeedback["type"]> = {
    hook: "progress",
    commitment: "pressure",
    identity: "identity",
    "lock-in": "celebration",
    post: "identity",
  };

  return {
    message: content.message,
    subMessage: content.sub,
    emoji: content.emoji,
    type: typeMap[content.phase] ?? "progress",
  };
}
