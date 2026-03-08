/**
 * Local LLM Service
 *
 * Abstraction over llama.rn for local on-device inference.
 * When llama.rn is installed and a model is loaded, this produces
 * higher-quality structured food candidates than the regex parser.
 *
 * When llama.rn is NOT available (not installed, model not downloaded),
 * this gracefully reports unavailability so the parser falls back to regex.
 *
 * Supports both text and image (multimodal) inputs.
 */

import type { ParsedFoodItem } from "./food-candidate.schema";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LlmParseResult {
  success: boolean;
  items: ParsedFoodItem[];
  /** Model name if inference ran */
  model?: string;
  /** Why inference failed, if it did */
  error?: string;
}

// ─── LLM Availability ───────────────────────────────────────────────────────

let _llmAvailable: boolean | null = null;
let _llamaContext: any = null;

/** Path to the downloaded GGUF model file (set via configureLlmModel) */
let _modelPath: string | null = null;

/**
 * Configure the path to the local GGUF model file.
 * Must be called before parseWithLocalLlm will produce results.
 *
 * Example: configureLlmModel(FileSystem.documentDirectory + 'models/phi-3-mini-Q4_K_M.gguf')
 */
export function configureLlmModel(modelPath: string): void {
  // If changing models, release old context
  if (_modelPath !== modelPath && _llamaContext) {
    try {
      _llamaContext.release();
    } catch {
      /* ignore */
    }
    _llamaContext = null;
  }
  _modelPath = modelPath;
}

/**
 * Check whether a local LLM is available for inference.
 * Caches the result after first check.
 */
export function isLocalLlmAvailable(): boolean {
  if (_llmAvailable !== null) return _llmAvailable;

  try {
    // Dynamic require — if llama.rn is installed, this succeeds
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("llama.rn");
    _llmAvailable = true;
  } catch {
    _llmAvailable = false;
  }

  return _llmAvailable;
}

/** Check whether LLM is ready (installed + model configured) */
export function isLocalLlmReady(): boolean {
  return isLocalLlmAvailable() && _modelPath !== null;
}

/** Reset the availability cache (for testing) */
export function resetLlmAvailability(): void {
  _llmAvailable = null;
  if (_llamaContext) {
    try {
      _llamaContext.release();
    } catch {
      /* ignore */
    }
    _llamaContext = null;
  }
}

// ─── System Prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a food parsing assistant. Given a user's description of what they ate, extract individual food items as structured JSON.

Rules:
- Extract each distinct food item separately
- Estimate quantity (default to 1 if unclear)
- Identify the most appropriate unit (piece, cup, bowl, slice, serving, g, oz, ml, etc.)
- Note any preparation method (grilled, fried, with butter, etc.)
- Rate your confidence 0.0-1.0 for each item
- Output ONLY valid JSON, no explanation

Output format:
{
  "items": [
    {
      "name": "food name (lowercase, singular)",
      "quantity": 1,
      "unit": "piece",
      "preparation": null,
      "confidence": 0.9
    }
  ]
}`;

const IMAGE_SYSTEM_PROMPT = `You are a food identification assistant. Given an image of a meal, identify individual food items as structured JSON.

Rules:
- Identify each visible food item separately
- Estimate quantity for each item
- Identify the most appropriate unit (piece, cup, bowl, slice, serving, etc.)
- Note visible preparation methods (grilled, fried, etc.)
- Rate your confidence 0.0-1.0 for each item (lower for items that are hard to see)
- Output ONLY valid JSON, no explanation

Output format:
{
  "items": [
    {
      "name": "food name (lowercase, singular)",
      "quantity": 1,
      "unit": "piece",
      "preparation": null,
      "confidence": 0.7
    }
  ]
}`;

// ─── Internal: get or create context ─────────────────────────────────────────

async function getOrCreateContext(): Promise<any> {
  if (_llamaContext) return _llamaContext;

  if (!_modelPath) {
    throw new Error(
      "No model path configured. Call configureLlmModel() first."
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { initLlama } = require("llama.rn");

  _llamaContext = await initLlama({
    model: _modelPath,
    n_ctx: 2048, // Context window — 2k is enough for food parsing
    n_gpu_layers: 99, // Offload as many layers as possible to GPU/ANE
  });

  return _llamaContext;
}

// ─── Parse JSON from LLM output ──────────────────────────────────────────────

function extractJsonFromOutput(text: string): any | null {
  // Try direct parse
  try {
    return JSON.parse(text.trim());
  } catch {
    /* fall through */
  }

  // Try extracting from markdown code block
  const jsonMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch {
      /* fall through */
    }
  }

  // Try finding first { ... } block
  const braceMatch = text.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]);
    } catch {
      /* fall through */
    }
  }

  return null;
}

function validateAndNormalizeLlmItems(parsed: any): ParsedFoodItem[] {
  if (!parsed?.items || !Array.isArray(parsed.items)) return [];

  const validUnits = new Set([
    "piece",
    "serving",
    "cup",
    "tablespoon",
    "teaspoon",
    "oz",
    "g",
    "ml",
    "slice",
    "bowl",
    "plate",
    "handful",
    "scoop",
    "bar",
    "can",
    "bottle",
    "glass",
  ]);

  return parsed.items
    .filter(
      (item: any) => typeof item?.name === "string" && item.name.length > 0
    )
    .map(
      (item: any): ParsedFoodItem => ({
        name: item.name.toLowerCase().trim(),
        quantity:
          typeof item.quantity === "number" && item.quantity > 0
            ? item.quantity
            : 1,
        unit: validUnits.has(item.unit) ? item.unit : "serving",
        preparation:
          typeof item.preparation === "string" ? item.preparation : undefined,
        confidence:
          typeof item.confidence === "number"
            ? Math.max(0, Math.min(1, item.confidence))
            : 0.7,
        rawFragment: item.name,
      })
    );
}

// ─── Parse with LLM ─────────────────────────────────────────────────────────

/**
 * Parse food input using the local LLM.
 *
 * Returns `{ success: false }` if:
 *   - llama.rn is not installed
 *   - No model is loaded/configured
 *   - Inference fails or produces invalid JSON
 *
 * The caller should fall back to regex parsing when `success` is false.
 */
export async function parseWithLocalLlm(
  rawInput: string
): Promise<LlmParseResult> {
  if (!isLocalLlmAvailable()) {
    return {
      success: false,
      items: [],
      error: "llama.rn is not installed",
    };
  }

  if (!_modelPath) {
    return {
      success: false,
      items: [],
      error: "No model configured — call configureLlmModel() first",
    };
  }

  try {
    const context = await getOrCreateContext();

    const result = await context.completion({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: rawInput },
      ],
      n_predict: 1024,
      temperature: 0.1, // Low temp for consistent structured output
      stop: ["\n\n", "```\n"],
    });

    const text = result.text ?? "";
    const jsonOutput = extractJsonFromOutput(text);

    if (!jsonOutput) {
      return {
        success: false,
        items: [],
        error: "LLM output was not valid JSON",
      };
    }

    const items = validateAndNormalizeLlmItems(jsonOutput);

    if (items.length === 0) {
      return {
        success: false,
        items: [],
        error: "LLM returned no recognizable food items",
      };
    }

    return {
      success: true,
      items,
      model: _modelPath.split("/").pop() ?? "local",
    };
  } catch (err) {
    return {
      success: false,
      items: [],
      error: err instanceof Error ? err.message : "Unknown LLM error",
    };
  }
}

// ─── Parse Image with LLM (multimodal) ──────────────────────────────────────

/**
 * Parse food from an image using a multimodal LLM.
 *
 * Requires a multimodal model (e.g., LLaVA, Phi-3-vision).
 * The image path should be a local file URI.
 *
 * Returns `{ success: false }` if the model doesn't support vision
 * or inference fails.
 */
export async function parseImageWithLocalLlm(
  imagePath: string,
  additionalContext?: string
): Promise<LlmParseResult> {
  if (!isLocalLlmAvailable()) {
    return {
      success: false,
      items: [],
      error: "llama.rn is not installed",
    };
  }

  if (!_modelPath) {
    return {
      success: false,
      items: [],
      error: "No model configured — call configureLlmModel() first",
    };
  }

  try {
    const context = await getOrCreateContext();

    const userContent: any[] = [
      {
        type: "image_url",
        image_url: { url: imagePath },
      },
      {
        type: "text",
        text: additionalContext
          ? `Identify the food items in this image. Additional context: ${additionalContext}`
          : "Identify all the food items visible in this image.",
      },
    ];

    const result = await context.completion({
      messages: [
        { role: "system", content: IMAGE_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      n_predict: 1024,
      temperature: 0.1,
      stop: ["\n\n", "```\n"],
    });

    const text = result.text ?? "";
    const jsonOutput = extractJsonFromOutput(text);

    if (!jsonOutput) {
      return {
        success: false,
        items: [],
        error: "Multimodal LLM output was not valid JSON",
      };
    }

    const items = validateAndNormalizeLlmItems(jsonOutput);

    if (items.length === 0) {
      return {
        success: false,
        items: [],
        error: "LLM found no food items in image",
      };
    }

    return {
      success: true,
      items,
      model: _modelPath.split("/").pop() ?? "local-vision",
    };
  } catch (err) {
    return {
      success: false,
      items: [],
      error:
        err instanceof Error ? err.message : "Unknown multimodal LLM error",
    };
  }
}
