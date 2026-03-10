import { router } from "expo-router";
import { labelFoodImage } from "../image-analysis/ocr/image-labeling.service";
import { extractTextFromImage } from "../image-analysis/ocr/text-recognition.service";
import { analyzeImage } from "../image-analysis/pipeline";
import { captionFoodImage } from "./image/image-captioning.service";
import { lookupBarcode } from "./matching/openfoodfacts.service";
import { parseMealInput } from "./nutrition-parser.service";
import {
    mealEstimateToDraft,
    runNutritionPipeline,
} from "./nutrition-pipeline";
import { useNutritionDraftStore } from "./nutrition.draft.store";
import { buildMealEntryFromDraft } from "./nutrition.helpers";
import { useNutritionStore } from "./nutrition.store";
import { MealSource } from "./nutrition.types";
import { getFoodEmoji } from "./ontology/food-emoji";
import type { InputSource } from "./parsing/food-candidate.schema";
import { isLocalLlmReady } from "./parsing/local-llm.service";
import { validateFoodResult } from "./validation/food-validator.service";

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
      const rawOcr = await extractTextFromImage(imagePath);
      // Discard tiny OCR fragments (e.g. "8 r") — not enough signal
      const ocrText = rawOcr && rawOcr.trim().length >= 4 ? rawOcr : null;

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

      // ── Stage B.5: ML Kit image labeling → visual food recognition ──
      // When OCR finds no text and LLM is unavailable, use on-device
      // image labeling to identify food from pixels (e.g. "ice cream",
      // "chocolate", "pizza") and feed labels into the text pipeline.
      const imageLabels = await labelFoodImage(imagePath);
      if (imageLabels && imageLabels.length > 0) {
        // Build the best possible input by combining all available signals:
        // description (user intent) + OCR text (package info) + ML Kit labels (visual)
        const signalParts: string[] = [];
        if (description?.trim()) signalParts.push(description.trim());
        if (ocrText) signalParts.push(ocrText);
        signalParts.push(imageLabels);
        const labelInput = signalParts.join(" ");

        const estimate = await runNutritionPipeline(labelInput, "image");
        const pipelineDraft = mealEstimateToDraft(estimate);

        // Validate: reject garbage results before showing to user
        const validation = validateFoodResult(
          pipelineDraft.title,
          pipelineDraft.calories,
          pipelineDraft.protein,
          pipelineDraft.carbs,
          pipelineDraft.fat
        );
        if (validation.valid || validation.confidenceMultiplier > 0.3) {
          pipelineDraft.source = "camera";
          pipelineDraft.confidence =
            Math.round(
              (pipelineDraft.confidence ?? 0.5) *
                validation.confidenceMultiplier *
                100
            ) / 100;
          // Lower confidence floor for pure image-based matches (no OCR/description)
          if (!ocrText && !description?.trim()) {
            pipelineDraft.confidence = Math.max(
              0.15,
              Math.min(pipelineDraft.confidence, 0.65)
            );
          }
          setDraft(pipelineDraft);
          return true;
        }

        // Validation failed — try just the ML Kit labels alone
        // (combined input may have introduced noise from OCR)
        if (signalParts.length > 1) {
          const labelOnlyEstimate = await runNutritionPipeline(
            imageLabels,
            "image"
          );
          const labelOnlyDraft = mealEstimateToDraft(labelOnlyEstimate);
          const labelOnlyValidation = validateFoodResult(
            labelOnlyDraft.title,
            labelOnlyDraft.calories,
            labelOnlyDraft.protein,
            labelOnlyDraft.carbs,
            labelOnlyDraft.fat
          );
          if (
            labelOnlyValidation.valid ||
            labelOnlyValidation.confidenceMultiplier > 0.3
          ) {
            labelOnlyDraft.source = "camera";
            labelOnlyDraft.confidence =
              Math.round(
                (labelOnlyDraft.confidence ?? 0.4) *
                  labelOnlyValidation.confidenceMultiplier *
                  100
              ) / 100;
            labelOnlyDraft.confidence = Math.max(
              0.15,
              Math.min(labelOnlyDraft.confidence, 0.6)
            );
            setDraft(labelOnlyDraft);
            return true;
          }
        }
        // Both attempts failed — fall through to next stage
      }

      // ── Stage C: Text description / OCR text → text pipeline ──
      const textForPipeline = description?.trim() || ocrText;
      if (textForPipeline && textForPipeline.length > 0) {
        const estimate = await runNutritionPipeline(textForPipeline, "image");
        const pipelineDraft = mealEstimateToDraft(estimate);

        // Validate: reject garbage results before showing to user
        const validation = validateFoodResult(
          pipelineDraft.title,
          pipelineDraft.calories,
          pipelineDraft.protein,
          pipelineDraft.carbs,
          pipelineDraft.fat
        );
        if (validation.valid || validation.confidenceMultiplier > 0.3) {
          pipelineDraft.source = "camera";
          pipelineDraft.confidence =
            Math.round(
              (pipelineDraft.confidence ?? 0.5) *
                validation.confidenceMultiplier *
                100
            ) / 100;
          setDraft(pipelineDraft);
          return true;
        }
        // Validation failed — return false instead of showing garbage
      }

      // ── Stage D: No signals → no valid result ──────────────
      return false;
    } catch (e) {
      console.warn("Image pipeline failed:", e);
      return false;
    }
  }

  /**
   * Start the logging flow from a scanned barcode.
   * Looks up the product on Open Food Facts and creates a draft.
   * Returns true if a product was found.
   */
  async function startFromBarcode(barcode: string): Promise<boolean> {
    try {
      const match = await lookupBarcode(barcode);
      if (!match) return false;

      const title = [match.brand, match.name].filter(Boolean).join(" — ");
      // Try emoji from full title first (may contain "juice", "sparkling" etc.), then product name
      const emoji =
        getFoodEmoji(title, "beverage") !== "☕"
          ? getFoodEmoji(title, "beverage")
          : getFoodEmoji(match.name, "beverage");

      setDraft({
        title: title || match.name,
        source: "camera",
        rawInput: `barcode: ${barcode}`,
        calories: match.nutrients.calories,
        protein: match.nutrients.protein,
        carbs: match.nutrients.carbs,
        fat: match.nutrients.fat,
        confidence: 1.0,
        parseMethod: "barcode-lookup",
        emoji,
        estimatedItems: [
          {
            name: match.name,
            matchedName: match.name,
            matchSource: "openfoodfacts",
            matchId: barcode,
            estimatedServings: 1,
            nutrients: match.nutrients,
            confidence: 1.0,
            emoji,
          } as never,
        ],
      });

      return true;
    } catch (e) {
      console.warn("Barcode lookup failed:", e);
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
    startFromBarcode,
    saveDraftAsMeal,
    cancelLogging,
  };
}
