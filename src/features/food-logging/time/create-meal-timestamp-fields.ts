import type { MealEntry } from "../../nutrition/nutrition.types";

export function getUserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function getLocalDateTimeParts(now: Date, timeZone: string): {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(now);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

export function createMealTimestampFields(
  now: Date = new Date(),
  timeZone: string = getUserTimeZone()
): Pick<
  MealEntry,
  | "loggedAt"
  | "loggedAtUtc"
  | "loggedAtLocal"
  | "loggedDateLocal"
  | "timezone"
  | "timezoneOffsetMinutes"
> {
  const p = getLocalDateTimeParts(now, timeZone);
  const loggedAtUtc = now.toISOString();
  const loggedAtLocal = `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}`;
  const loggedDateLocal = `${p.year}-${p.month}-${p.day}`;

  return {
    loggedAt: loggedAtUtc,
    loggedAtUtc,
    loggedAtLocal,
    loggedDateLocal,
    timezone: timeZone,
    timezoneOffsetMinutes: -now.getTimezoneOffset(),
  };
}

export function resolveMealLoggedAtUtc(meal: Partial<MealEntry>): string {
  if (typeof meal.loggedAtUtc === "string" && meal.loggedAtUtc.trim().length > 0) {
    return meal.loggedAtUtc;
  }
  if (typeof meal.loggedAt === "string" && meal.loggedAt.trim().length > 0) {
    return meal.loggedAt;
  }
  return new Date().toISOString();
}

export function resolveMealLoggedDateLocal(meal: Partial<MealEntry>): string {
  if (
    typeof meal.loggedDateLocal === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(meal.loggedDateLocal)
  ) {
    return meal.loggedDateLocal;
  }
  const timeZone =
    typeof meal.timezone === "string" && meal.timezone.trim().length > 0
      ? meal.timezone
      : getUserTimeZone();
  const date = new Date(resolveMealLoggedAtUtc(meal));
  const p = getLocalDateTimeParts(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

export function formatMealTimeForDisplay(meal: Partial<MealEntry>): string {
  const timeZone =
    typeof meal.timezone === "string" && meal.timezone.trim().length > 0
      ? meal.timezone
      : getUserTimeZone();
  const date = new Date(resolveMealLoggedAtUtc(meal));
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

