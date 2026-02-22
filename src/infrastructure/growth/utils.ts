/**
 * Growth Layer - Pure utilities
 */

export const COOLDOWN_MS = 60 * 1000;
export const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type GrowthRequestErrorCode =
  | "cooldown"
  | "duplicate"
  | "invalid_title"
  | "unknown";

export class GrowthRequestError extends Error {
  readonly code: GrowthRequestErrorCode;

  constructor(code: GrowthRequestErrorCode, message: string) {
    super(message);
    this.name = "GrowthRequestError";
    this.code = code;
  }
}

export function normaliseTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

export function hashString(input: string): string {
  let hash = 0x811c9dc5;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

export function getDedupeHash(title: string, anonId: string): string {
  const normalized = normaliseTitle(title);
  return hashString(`${anonId}::${normalized}`);
}

export function getCooldownRemainingMs(
  lastMs: number | null,
  nowMs: number,
  cooldownMs: number = COOLDOWN_MS
): number {
  if (!lastMs || lastMs <= 0) return 0;
  const remaining = cooldownMs - (nowMs - lastMs);
  return remaining > 0 ? remaining : 0;
}

export function isWithinWindow(
  lastMs: number | null,
  nowMs: number,
  windowMs: number = DEDUPE_WINDOW_MS
): boolean {
  if (!lastMs || lastMs <= 0) return false;
  return nowMs - lastMs < windowMs;
}
