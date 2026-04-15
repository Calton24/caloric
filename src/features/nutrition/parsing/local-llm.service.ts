/**
 * Local LLM Service (Stub)
 *
 * llama.rn has been removed from this project.
 * All functions return graceful "unavailable" responses so callers
 * fall back to regex parsing + API-based nutrition lookups.
 *
 * The public API surface is preserved so existing imports continue to work.
 */

import type { ParsedFoodItem } from "./food-candidate.schema";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LlmParseResult {
  success: boolean;
  items: ParsedFoodItem[];
  model?: string;
  error?: string;
}

// ─── Stubs ───────────────────────────────────────────────────────────────────

export function configureLlmModel(_modelPath: string): void {
  // no-op — llama.rn removed
}

export function isLocalLlmAvailable(): boolean {
  return false;
}

export function isLocalLlmReady(): boolean {
  return false;
}

export function resetLlmAvailability(): void {
  // no-op
}

const NOT_INSTALLED: LlmParseResult = {
  success: false,
  items: [],
  error: "llama.rn has been removed",
};

export async function parseWithLocalLlm(
  _rawInput: string
): Promise<LlmParseResult> {
  return NOT_INSTALLED;
}

export async function parseImageWithLocalLlm(
  _imagePath: string,
  _additionalContext?: string
): Promise<LlmParseResult> {
  return NOT_INSTALLED;
}
