/**
 * Streak Types
 */

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastLogDate: string | null; // ISO date string (YYYY-MM-DD)
  streakStartDate: string | null;
}

export interface DailyLogEntry {
  logDate: string; // YYYY-MM-DD
  mealCount: number;
  totalCals: number;
}
