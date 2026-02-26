/**
 * Growth Layer - Anonymous ID helper
 *
 * Uses crypto.getRandomValues when available for better entropy.
 * Falls back to Math.random (acceptable for a non-security-critical
 * anonymous identifier used only for dedup/cooldown).
 */

import { getStorage } from "../storage";

const ANON_ID_KEY = "growth:anon_id";

function randomHex(bytes: number): string {
  // React Native ships with crypto.getRandomValues (Hermes ≥ 0.70)
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    const buf = new Uint8Array(bytes);
    globalThis.crypto.getRandomValues(buf);
    return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback — acceptable for non-security identifier
  return Math.random()
    .toString(16)
    .slice(2, 2 + bytes * 2);
}

function generateAnonId(): string {
  const time = Date.now().toString(36);
  const rand = randomHex(4); // 8 hex chars = 32 bits
  return `anon_${time}_${rand}`;
}

export async function getGrowthAnonId(): Promise<string> {
  const storage = getStorage();
  const existing = await storage.getItem(ANON_ID_KEY);

  if (existing) return existing;

  const anonId = generateAnonId();
  await storage.setItem(ANON_ID_KEY, anonId);
  return anonId;
}
