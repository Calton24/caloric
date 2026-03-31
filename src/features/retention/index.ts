/**
 * Retention Engine — Public API
 *
 * Day 1→21+ psychological journey system.
 * Phases: Hook → Commitment → Identity → Lock-in → Lifestyle
 * Conversion days: 3 (soft), 7 (hard), 14 (hard), 21 (strongest)
 */

export {
    getAfterLogContent,
    getDayBanner,
    getDayContent,
    getDayNotification,
    getDayPaywall,
    getPhase,
    isConversionDay
} from "./day-journey";
export type { DayContent, JourneyPhase, PaywallTrigger } from "./day-journey";
export {
    getDailyMotivation,
    getExactDayPressure,
    getMilestonePressure
} from "./milestone-pressure";
export { getNextNotification } from "./notification-templates";
export { getPostLogFeedback } from "./post-log-feedback";
export { useRetentionStore } from "./retention.store";
export type {
    MilestonePressure,
    NotificationCategory,
    NotificationTemplate,
    PostLogFeedback,
    RetentionState,
    StreakRecovery
} from "./retention.types";
export {
    getStreakRecovery,
    getStreakRecoveryNotification
} from "./streak-recovery";
export { useRetentionEngine } from "./useRetentionEngine";

