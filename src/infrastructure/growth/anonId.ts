/**
 * Growth Layer - Anonymous ID helper
 */

import { getStorage } from "../storage";

const ANON_ID_KEY = "growth:anon_id";

function generateAnonId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(16).slice(2, 10);
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
