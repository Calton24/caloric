import { router } from "expo-router";
import { extractTextFromImage } from "../image-analysis/ocr/text-recognition.service";
import { analyzeImage } from "../image-analysis/pipeline";
import { captionFoodImage } from "./image/image-captioning.service";
import { parseMealInput } from "./nutrition-parser.service";
import {
    mealEstimateToDraft,
    runNutritionPipeline,
} from "./nutrition-pipeline";
import { useNutritionDraftStore } from "./nutrition.draft.store";
import { buildMealEntryFromDraft } from "./nutrition.helpers";
import { useNutritionStore } from "./nutrition.store";
import { MealSource } from "./nutrition.types";
import type { InputSource } from "./parsing/food-candidate.schema";
import { isLocalLlmReady } from "./parsing/local-llm.service";

/**
 * Map old MealSource to new InputSource for the pipeline.
 */
function toInputSource(source: MealSource): InputSource {
  switch (source) {
    case "voice":
      return "voice";
    case "camera":
    case "image":
      return "image";
    default:
      return "text";
  }
}

export function useLoggingFlow() {
  const draft = useNutritionDraftStore((state) => state.draft);
  const setDraft = useNutritionDraftStore((state) => state.setDraft);
  const updateDraft = useNutritionDraftStore((state) => state.updateDraft);
  const clearDraft = useNutritionDraftStore((state) => state.clearDraft);

  const addMeal = useNutritionStore((state) => state.addMeal);

  /**
   * Start the logging flow using the new nutrition pipeline.
   * Runs parse → match → estimate, then navigates to confirm screen.
   *
   * Falls back to the old regex parser if the pipeline fails.
   */
  async function startFromInput(input: string, source: MealSource) {
    try {
      // New pipeline: parse → match (USDA/OFF) → estimate
      const inputSource = toInputSource(source);
      const estimate = await runNutritionPipeline(input, inputSource);
      const pipelineDraft = mealEstimateToDraft(estimate);
      setDraft(pipelineDraft);
    } catch {
      // Fallback: old regex parser (always works, no network)
      console.warn("Pipeline failed, using legacy parser");
      const parsed = parseMealInput(input, source);
      setDraft(parsed);
    }

    router.push("/(modals)/confirm-meal" as never);
  }

  function saveDraftAsMeal() {
    if (!draft) {
      throw new Error("No meal draft available");
    }

    const meal = buildMealEntryFromDraft({ draft });
    addMeal(meal);
    clearDraft();

    // dismissAll() pops to the first screen in the modal stack (tracking).
    // The extra back() closes the modal presentation and returns to home.
    router.dismissAll();
    router.back();
  }

  /**
   * Start the logging flow from a captured image.
   *
   * Multi-stage pipeline:
   *   1. Try new image analysis pipeline (triage → extract → route → match → estimate)
   *   2. If packaged product detected → use OFF match with portion options
   *   3. If plated meal / generic → fall through to text pipeline
   *   4. If vision model available → use LLM captioning
   *   5. Final fallback → text description through text pipeline
   *
   * Returns true if a valid draft was created, false if analysis produced
   * no usable result (caller should handle empty-result UX).
   * Does NOT navigate — caller is responsible for navigation timing.
   */
  async function startFromImage(
    imagePath: string,
    description?: string
  ): Promise<boolean> {
    try {
      // ── Stage 0: Run on-device OCR to extract text from image ──
      // This is the bridge between "camera sees pixels" and
      // "pipeline gets searchable text" (brand names, weights, etc.)
      const ocrText = await extractTextFromImage(imagePath);

      // ── Stage A: Multi-stage image analysis pipeline ────
      // Feeds OCR text + description into triage → extract → route → match
      const imageResult = await analyzeImage(
        imagePath,
        description ?? null,
        ocrText
      );

      if (imageResult) {
        // Packaged product / branded match found!
        // Create a draft with the full image analysis result attached
        const productTitle = [
          imageResult.product.brand,
          imageResult.product.name,
        ]
          .filter(Boolean)
          .join(" — ");

        setDraft({
          title: productTitle || imageResult.product.name,
          source: "camera",
          rawInput: description || "photo",
          calories: imageResult.nutrients.calories,
          protein: imageResult.nutrients.protein,
          carbs: imageResult.nutrients.carbs,
          fat: imageResult.nutrients.fat,
          confidence: imageResult.confidence.overall,
          parseMethod: `image-analysis (${imageResult.evidence.route})`,
          imageAnalysis: imageResult,
        });

        return true;
      }

      // ── Stage B: Local vision model → LLM captioning ───────
      if (isLocalLlmReady()) {
        const captionResult = await captionFoodImage(imagePath, description);

        if (captionResult.success && captionResult.items.length > 0) {
          const rawInput = captionResult.items
            .map((item) => {
              const qty = item.quantity !== 1 ? `${item.quantity} ` : "";
              const unit =
                item.unit !== "serving" && item.unit !== "piece"
                  ? `${item.unit} `
                  : "";
              return `${qty}${unit}${item.name}`;
            })
            .join(" and ");

          const estimate = await runNutritionPipeline(rawInput, "image");
          const pipelineDraft = mealEstimateToDraft(estimate);
          pipelineDraft.source = "camera";
          setDraft(pipelineDraft);
          return true;
        }
      }

      // ── Stage C: Text description / OCR text → text pipeline ──
      const textForPipeline = description?.trim() || ocrText;
      if (textForPipeline && textForPipeline.length > 0) {
        const estimate = await runNutritionPipeline(textForPipeline, "image");
        const pipelineDraft = mealEstimateToDraft(estimate);
        pipelineDraft.source = "camera";
        setDraft(pipelineDraft);
        return true;
      }

      // ── Stage D: No signals → no valid result ──────────────
      return false;
    } catch (e) {
      console.warn("Image pipeline failed:", e);
      return false;
    }
  }

  function cancelLogging() {
    clearDraft();
    router.dismiss();
  }

  return {
    draft,
    updateDraft,
    clearDraft,
    startFromInput,
    startFromImage,
    saveDraftAsMeal,
    cancelLogging,
  };
}
