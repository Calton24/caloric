/**
 * Nutrition Parser Service
 *
 * Orchestrates the parsing stage of the nutrition pipeline.
 * Takes raw user input (from any source) and produces a `ParsedInput`:
 *
 *   raw text → try local LLM → fall back to regex → ParsedInput
 *
 * This service does NOT estimate calories. It only extracts structure.
 * The matching and estimation layers handle nutrient data.
 */

import type { InputSource, ParsedInput } from "./food-candidate.schema";
import { parseWithLocalLlm } from "./local-llm.service";
import { parseWithRegex } from "./regex-parser";

export interface ParseOptions {
  /** Skip local LLM and go straight to regex. */
  skipLlm?: boolean;
}

/**
 * Parse raw user input into structured food candidates.
 *
 * Tries local LLM first for higher-quality parsing, then falls back
 * to the deterministic regex parser which is always available.
 *
 * @param rawInput  The raw user input (transcript, typed text, or image caption)
 * @param source    How the input was captured: "voice" | "text" | "image"
 * @param options   Parse options (e.g. skipLlm for camera fallback paths)
 * @returns         Structured ParsedInput with food candidates
 */
export async function parseNutritionInput(
  rawInput: string,
  source: InputSource,
  options: ParseOptions = {}
): Promise<ParsedInput> {
  const trimmed = rawInput.trim();

  if (!trimmed) {
    return {
      items: [],
      rawInput: trimmed,
      source,
      parseMethod: "fallback",
      parsedAt: new Date().toISOString(),
    };
  }

  // 1. Try local LLM (higher quality, structured JSON output)
  //    Skip if caller already used LLM in a prior stage (e.g. image captioning)
  if (!options.skipLlm) {
    const llmResult = await parseWithLocalLlm(trimmed);

    if (llmResult.success && llmResult.items.length > 0) {
      return {
        items: llmResult.items.map((item) => ({
          ...item,
          // Ensure rawFragment is populated
          rawFragment: item.rawFragment || trimmed,
        })),
        rawInput: trimmed,
        source,
        parseMethod: "local-llm",
        parsedAt: new Date().toISOString(),
      };
    }
  }

  // 2. Fall back to regex parser (always available, deterministic)
  const regexItems = parseWithRegex(trimmed);

  if (regexItems.length > 0) {
    return {
      items: regexItems,
      rawInput: trimmed,
      source,
      parseMethod: "regex",
      parsedAt: new Date().toISOString(),
    };
  }

  // 3. Absolute fallback: treat entire input as one unknown food
  return {
    items: [
      {
        name: trimmed,
        quantity: 1,
        unit: "serving",
        preparation: null,
        confidence: 0.3,
        rawFragment: trimmed,
      },
    ],
    rawInput: trimmed,
    source,
    parseMethod: "fallback",
    parsedAt: new Date().toISOString(),
  };
}
