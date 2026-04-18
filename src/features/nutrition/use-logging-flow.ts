import { router } from "expo-router";
import { getHealthService } from "../health";
import { labelFoodImage } from "../image-analysis/ocr/image-labeling.service";
import { extractTextFromImage } from "../image-analysis/ocr/text-recognition.service";
import { analyzeImage } from "../image-analysis/pipeline";
import {
    runVisionPipeline,
    type VisionPipelineResult,
} from "../image-analysis/vision-pipeline";
import { analyzeMealImage } from "../meal-analysis/meal-analysis.service";
import type { MealAnalysisResult } from "../meal-analysis/meal-analysis.types";
import { usePermissionsStore } from "../permissions/permissions.store";
import { trackMealAndMaybePromptReview } from "../review/review.service";
import { useSettingsStore } from "../settings";
import { captionFoodImage } from "./image/image-captioning.service";
import { lookupBarcode as lookupBarcodeDataset } from "./matching/dataset-lookup.service";
import { lookupBarcode as lookupBarcodeOFF } from "./matching/openfoodfacts.service";
import { rebuildFoodMemory } from "./memory/food-memory.service";
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

  const meals = useNutritionStore((state) => state.meals);

  /**
   * Start the logging flow using the new nutrition pipeline.
   * Runs parse → match → estimate, then navigates to confirm screen.
   *
   * Returns false if no food items were detected (caller should prompt retry).
   * Falls back to the old regex parser if the pipeline fails.
   */
  async function startFromInput(
    input: string,
    source: MealSource
  ): Promise<boolean> {
    try {
      // New pipeline: parse → match (USDA/OFF) → estimate
      const inputSource = toInputSource(source);
      const estimate = await runNutritionPipeline(input, inputSource);

      // No food detected — signal caller to prompt retry
      if (estimate.items.length === 0) {
        return false;
      }

      const pipelineDraft = mealEstimateToDraft(estimate);
      setDraft(pipelineDraft);
    } catch {
      // Fallback: old regex parser (always works, no network)
      console.warn("Pipeline failed, using legacy parser");
      const parsed = parseMealInput(input, source);
      setDraft(parsed);
    }

    router.push("/(modals)/confirm-meal" as never);
    return true;
  }

  /**
   * Save the draft as a meal entry without navigating.
   * Useful when caller needs to show a modal (e.g. milestone) before leaving.
   */
  function saveDraftWithoutNav() {
    if (!draft) {
      throw new Error("No meal draft available");
    }

    const logDate = useNutritionDraftStore.getState().logDate;
    const meal = buildMealEntryFromDraft({
      draft,
      loggedAt: logDate ?? undefined,
    });
    addMeal(meal);

    // Auto-export to Apple Health if write sync is enabled
    const { appleHealthSyncEnabled } = useSettingsStore.getState().settings;
    const { appleHealthWriteEnabled } =
      usePermissionsStore.getState().permissions;
    if (
      appleHealthSyncEnabled &&
      appleHealthWriteEnabled &&
      meal.calories > 0
    ) {
      const healthService = getHealthService();
      const loggedAt = new Date(meal.loggedAt);
      healthService
        .writeCalories(
          meal.calories,
          loggedAt,
          new Date(loggedAt.getTime() + 60_000)
        )
        .catch(() => {}); // fire-and-forget, don't block UI
    }

    // Rebuild food memory with updated meal history
    rebuildFoodMemory([meal, ...meals]);

    // Prompt for App Store review after enough meals (fire-and-forget)
    trackMealAndMaybePromptReview().catch(() => {});
  }

  /** Navigate back to home after a save (or deferred milestone modal). */
  function navigateAfterSave() {
    // Dismiss all modals at once (safer than while-loop dismissal)
    if (router.canDismiss()) {
      router.dismissAll();
    }
    // Navigate to home tab to show the logged food
    router.replace("/(tabs)" as never);
    // Clear draft after navigation settles
    setTimeout(() => {
      clearDraft();
    }, 100);
  }

  function saveDraftAsMeal() {
    saveDraftWithoutNav();
    navigateAfterSave();
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

          const estimate = await runNutritionPipeline(rawInput, "image", {
            skipLlmParse: true,
          });
          const pipelineDraft = mealEstimateToDraft(estimate);
          pipelineDraft.source = "camera";
          setDraft(pipelineDraft);
          return true;
        }
      }

      // ── Stage B.5: Cloud vision (GPT-4o-mini) → meal decomposition ──
      // When the image pipeline returned null (plated meal / generic food)
      // and local LLM is not available, try the cloud-based meal analysis.
      if (!isLocalLlmReady()) {
        try {
          console.log(
            "[startFromImage] Stage B.5: calling analyzeMealImage..."
          );
          const cloudResult: MealAnalysisResult = await analyzeMealImage(
            imagePath,
            description
          );
          console.log(
            "[startFromImage] Stage B.5: got result, items:",
            cloudResult.items.length,
            "confidence:",
            cloudResult.overallConfidence
          );

          if (
            cloudResult.items.length > 0 &&
            cloudResult.overallConfidence > 0.3
          ) {
            setDraft({
              title: cloudResult.items.map((i) => i.resolvedName).join(", "),
              source: "camera",
              rawInput: description || "photo",
              calories: cloudResult.totals.calories,
              protein: cloudResult.totals.protein,
              carbs: cloudResult.totals.carbs,
              fat: cloudResult.totals.fat,
              confidence: cloudResult.overallConfidence,
              parseMethod: "cloud-vision (gpt-4o-mini)",
            });
            console.log(
              "[startFromImage] Stage B.5: draft set, returning true"
            );
            return true;
          }
        } catch (e) {
          // Cloud vision failed — fall through to ML Kit labels
          console.warn("Cloud vision analysis failed, falling back:", e);
        }
      }

      // ── Stage C: ML Kit image labeling → visual food recognition ──
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

        const estimate = await runNutritionPipeline(labelInput, "image", {
          skipLlmParse: true,
        });
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
            "image",
            { skipLlmParse: true }
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
        const estimate = await runNutritionPipeline(textForPipeline, "image", {
          skipLlmParse: true,
        });
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
      console.log(
        "[startFromImage] Stage D: all stages exhausted, returning false"
      );
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
      // Try local dataset first (1.84M branded foods), fall back to OpenFoodFacts
      let match =
        (await lookupBarcodeDataset(barcode)) ??
        (await lookupBarcodeOFF(barcode));

      // iOS reports UPC-A as EAN-13 with leading '0' — try the 12-digit UPC-A variant
      if (!match && barcode.length === 13 && barcode.startsWith("0")) {
        const upcA = barcode.slice(1);
        match =
          (await lookupBarcodeDataset(upcA)) ?? (await lookupBarcodeOFF(upcA));
      }

      if (!match) return false;

      const matchSource =
        match.source === "dataset" ? "dataset" : "openfoodfacts";

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
            matchSource: matchSource,
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

  /**
   * Run the new vision pipeline to detect food candidates from a photo.
   *
   * Returns structured candidates instead of auto-creating a draft.
   * The camera UX shows candidates to the user for confirmation.
   * After the user picks one, call `startFromInput(candidate.name, "camera")`
   * to resolve nutrition data and create the draft.
   *
   * Pipeline: Quality Gate → ML Kit Labels → Taxonomy → Top-3 Candidates
   */
  async function detectFoodCandidates(
    imagePath: string,
    description?: string
  ): Promise<VisionPipelineResult> {
    return runVisionPipeline(imagePath, description);
  }

  return {
    draft,
    updateDraft,
    clearDraft,
    startFromInput,
    startFromImage,
    startFromBarcode,
    detectFoodCandidates,
    saveDraftAsMeal,
    saveDraftWithoutNav,
    navigateAfterSave,
    cancelLogging,
  };
}
