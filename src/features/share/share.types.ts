/**
 * Share Types — milestone-based sharing system
 */

export type MilestoneKey =
  | "first_log"
  | "day_3"
  | "day_7"
  | "day_14"
  | "day_21";

export interface MilestoneConfig {
  key: MilestoneKey;
  day: number;
  emoji: string;
  title: string;
  subtitle: string;
  quote: string;
}

export interface MilestoneCheck {
  triggered: boolean;
  milestone: MilestoneConfig | null;
}

/**
 * Persisted state: which milestones the user has already seen.
 */
export interface ShareStore {
  seenMilestones: MilestoneKey[];
  markSeen: (key: MilestoneKey) => void;
  reset: () => void;
}
