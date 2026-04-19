/**
 * Date utilities for calendar views and date operations.
 * All locale-aware formatting uses the i18n layer.
 */
import {
    formatDateHeader as fmtDateHeader,
    formatMonthYear,
    formatWeekdayShort,
} from "../../infrastructure/i18n";

/**
 * Returns YYYY-MM-DD in the device's local timezone.
 * All date comparisons in the app should use this
 * so that "today" matches the user's wall-clock date.
 */
export function toLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Returns YYYY-MM-DDTHH:mm:ss in the device's local timezone.
 * Use for loggedAt timestamps so startsWith(localDate) matching works.
 */
export function toLocalDateTime(date: Date = new Date()): string {
  const datePart = toLocalDate(date);
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${datePart}T${hh}:${mm}:${ss}`;
}

/** @deprecated Use toLocalDate instead */
export function toISODate(date: Date): string {
  return toLocalDate(date);
}

export function getWeekDays(baseDate = new Date()) {
  const current = new Date(baseDate);
  const day = current.getDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const monday = new Date(current);
  monday.setDate(current.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

    return {
      key: toISODate(date),
      label: formatWeekdayShort(date).slice(0, 1), // First letter of localized weekday
      dayNumber: date.getDate(),
      date,
      isToday: toISODate(date) === toISODate(new Date()),
    };
  });
}

/**
 * Returns the 0-indexed weekday offset (0=Mon, 6=Sun)
 * for a given ISO date string within its week.
 */
export function getWeekdayIndex(isoDate: string): number {
  const d = new Date(isoDate + "T12:00:00"); // noon to avoid TZ edge
  const jsDay = d.getDay(); // 0=Sun
  return jsDay === 0 ? 6 : jsDay - 1; // convert to 0=Mon
}

/**
 * Formats a Date into a readable string like "Friday, Mar 7"
 * Uses the current i18n locale.
 */
export function formatDateHeader(date: Date): string {
  return fmtDateHeader(date);
}

/**
 * Returns all days in the month for a given date,
 * with padding for the grid layout (Mon-start weeks).
 */
export function getMonthDays(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // Day of week for 1st (0=Sun → convert to Mon-start: 0=Mon)
  const jsDay = firstDay.getDay();
  const startOffset = jsDay === 0 ? 6 : jsDay - 1; // padding before 1st

  const today = toISODate(new Date());

  const days: ({
    key: string;
    dayNumber: number;
    date: Date;
    isToday: boolean;
  } | null)[] = [];

  // Leading empty cells
  for (let i = 0; i < startOffset; i++) {
    days.push(null);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const key = toISODate(date);
    days.push({ key, dayNumber: d, date, isToday: key === today });
  }

  return {
    days,
    monthLabel: formatMonthYear(firstDay),
    year,
    month,
  };
}

/** Format month header e.g. "June 2025" (locale-aware) */
export function formatMonthHeader(date: Date): string {
  return formatMonthYear(date);
}
