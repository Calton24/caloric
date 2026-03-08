export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
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
      label: date.toLocaleDateString("en-GB", { weekday: "short" }).slice(0, 1),
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
 */
export function formatDateHeader(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}
