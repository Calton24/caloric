/**
 * Image Captioning Service
 *
 * Converts a food photograph into structured food candidates.
 * Supports two strategies:
 *
 * 1. **Local multimodal LLM** (llama.rn with a vision model like LLaVA)
 *    → Best results, fully offline, requires model download
 *
 * 2. **Open Food Facts image search** (fallback)
 *    → Uses barcode if detected, otherwise returns generic caption
 *
 * Both paths produce the same `ParsedFoodItem[]` output, which feeds into
 * the existing match → estimate pipeline.
 *
 * "Camera capture → food captioning → same pipeline."
 */

import type { ParsedFoodItem } from "../parsing/food-candidate.schema";
import {
    isLocalLlmReady,
    parseImageWithLocalLlm,
} from "../parsing/local-llm.service";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ImageCaptionResult {
  success: boolean;
  items: ParsedFoodItem[];
  method: "local-llm" | "fallback-prompt";
  error?: string;
}

// ─── Fallback: prompt-based captioning ───────────────────────────────────────

/**
 * When no vision model is available, generate a generic single-item candidate
 * from any user-provided text description. The user can refine on the confirm screen.
 */
function fallbackCaption(userDescription?: string): ImageCaptionResult {
  if (userDescription && userDescription.trim().length > 0) {
    // User provided a description alongside the photo — use it as-is
    return {
      success: true,
      items: [
        {
          name: userDescription.trim().toLowerCase(),
          quantity: 1,
          unit: "serving",
          preparation: null,
          confidence: 0.5,
          rawFragment: userDescription.trim(),
        },
      ],
      method: "fallback-prompt",
    };
  }

  // No description, no vision model — return a generic placeholder
  return {
    success: true,
    items: [
      {
        name: "meal",
        quantity: 1,
        unit: "serving",
        preparation: null,
        confidence: 0.3,
        rawFragment: "photo",
      },
    ],
    method: "fallback-prompt",
  };
}

// ─── Main API ────────────────────────────────────────────────────────────────

/**
 * Analyze a food image and return structured food candidates.
 *
 * @param imagePath     Local file path or URI to the captured image
 * @param description   Optional text description the user provided alongside the photo
 *
 * Strategy:
 * 1. If a local multimodal LLM is ready, use it for vision-based captioning
 * 2. Otherwise, fall back to user-provided description or generic placeholder
 */
export async function captionFoodImage(
  imagePath: string,
  description?: string
): Promise<ImageCaptionResult> {
  // Strategy 1: Local multimodal LLM (best quality)
  if (isLocalLlmReady()) {
    try {
      const result = await parseImageWithLocalLlm(imagePath, description);

      if (result.success && result.items.length > 0) {
        return {
          success: true,
          items: result.items,
          method: "local-llm",
        };
      }
      // LLM couldn't parse → fall through to fallback
    } catch {
      // Vision inference failed → fall through
    }
  }

  // Strategy 2: Fallback — use description or generic
  return fallbackCaption(description);
}
