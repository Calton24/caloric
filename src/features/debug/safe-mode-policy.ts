/**
 * Safe-mode policy — single place that maps FOOD_LOG_SAFE_MODE to specific
 * feature-level gates.
 *
 * RULES:
 *   ✅ Safe to disable: anything that writes to native subsystems or triggers
 *      post-log side effects (Health, Live Activities, analytics, haptics,
 *      notifications, activity monitor, presence, growth SDK).
 *
 *   ❌ Must NEVER disable: cloud restore, profile restore, goals, weight logs,
 *      RevenueCat identity, offerings.  Gating these while still marking
 *      syncRestoredFor = userId creates a false "restored" signal — the app
 *      opens Home with 0 meals and wrong weight even though the backend is fine.
 *      That is a data-loss UX, not a crash fix.
 */
import { FOOD_LOG_SAFE_MODE } from "./safe-mode-flags";

export const SafeModePolicy = {
  /** True when any safe-mode restriction is active. */
  enabled: FOOD_LOG_SAFE_MODE,

  // ── Side effects safe to suppress ───────────────────────────────────────

  /** Apple Health read/write. */
  appleHealthDisabled: FOOD_LOG_SAFE_MODE,

  /** Live Activity updates. */
  liveActivityDisabled: FOOD_LOG_SAFE_MODE,

  /** Analytics events (PostHog, in-house). */
  analyticsDisabled: FOOD_LOG_SAFE_MODE,

  /** Growth SDK (feature flags, A/B tests). */
  growthDisabled: FOOD_LOG_SAFE_MODE,

  /** Haptic feedback. */
  hapticsDisabled: FOOD_LOG_SAFE_MODE,

  /** Push-notification scheduling. */
  notificationsDisabled: FOOD_LOG_SAFE_MODE,

  /** Activity monitor (step counting, motion). */
  activityMonitorDisabled: FOOD_LOG_SAFE_MODE,

  /** Presence / real-time channel. */
  presenceDisabled: FOOD_LOG_SAFE_MODE,

  // ── Must always run — hardcoded false ───────────────────────────────────

  /**
   * Cloud restore (meals, profile, goals, weight logs) from Supabase.
   * This is READ-ONLY and safe in every mode.  Disabling it while still
   * marking syncRestoredFor = userId creates a false-restored signal that
   * causes users to see empty history and wrong weight values.
   */
  cloudRestoreDisabled: false as const,

  /** Profile row fetch and commit to useProfileStore. */
  profileRestoreDisabled: false as const,

  /** Goals row fetch and commit to useGoalsStore. */
  goalsRestoreDisabled: false as const,

  /** Weight logs fetch and commit to useProgressStore. */
  weightLogsRestoreDisabled: false as const,

  /** RevenueCat SDK identity (logIn / logOut). */
  revenueCatIdentityDisabled: false as const,

  /** RevenueCat offerings fetch. */
  offeringsDisabled: false as const,

  /** Streak store updates. */
  streakStoreDisabled: false as const,
} as const;
