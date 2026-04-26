/**
 * Image Pipeline Service
 *
 * Standalone (non-hook) version of startFromImage that runs in the background.
 * Writes progress and results to useBackgroundScanStore.
 *
 * Every store write is guarded by a stale-check:
 *   if (getState().activeJobId !== jobId) return;
 *
 * This means if the user starts a second scan before the first finishes,
 * the first pipeline's writes are silently discarded. No race conditions.
 */

import { labelFoodImage } from "../image-analysis/ocr/image-labeling.service";
import { extractTextFromImage } from "../image-analysis/ocr/text-recognition.service";
import { analyzeImage } from "../image-analysis/pipeline";
import { analyzeMealImage } from "../meal-analysis/meal-analysis.service";
import type { MealAnalysisResult } from "../meal-analysis/meal-analysis.types";
import { captionFoodImage } from "../nutrition/image/image-captioning.service";
import {
    mealEstimateToDraft,
    runNutritionPipeline,
} from "../nutrition/nutrition-pipeline";
import { useNutritionDraftStore } from "../nutrition/nutrition.draft.store";
import { isLocalLlmReady } from "../nutrition/parsing/local-llm.service";
import { validateFoodResult } from "../nutrition/validation/food-validator.service";
import { useBackgroundScanStore } from "./background-scan.store";

// ─── Stale-guard helper ───────────────────────────────────────────────────────

function isActive(jobId: string): boolean {
  return useBackgroundScanStore.getState().activeJobId === jobId;
}

// ─── Main pipeline ────────────────────────────────────────────────────────────

/**
 * Run the image analysis pipeline for a given jobId.
 * Fire-and-forget — callers must NOT await this.
 *
 * Mirrors the logic in useLoggingFlow.startFromImage but operates entirely
 * via Zustand .getState() calls, making it safe to call outside React.
 */
export async function runImagePipeline(
  jobId: string,
  imagePath: string,
  description?: string
): Promise<void> {
  const { setStage, completeScan, failScan } =
    useBackgroundScanStore.getState();
  const setDraft = useNutritionDraftStore.getState().setDraft;

  try {
    // ── Stage 0: OCR ──────────────────────────────────────────────────
    if (!isActive(jobId)) return;
    setStage(jobId, 0);

    const rawOcr = await extractTextFromImage(imagePath);
    const ocrText = rawOcr && rawOcr.trim().length >= 4 ? rawOcr : null;

    // ── Stage 1: Image analysis pipeline ─────────────────────────────
    if (!isActive(jobId)) return;
    setStage(jobId, 1);

    const imageResult = await analyzeImage(
      imagePath,
      description ?? null,
      ocrText
    );

    if (imageResult) {
      if (!isActive(jobId)) return;
      const productTitle = [imageResult.product.brand, imageResult.product.name]
        .filter(Boolean)
        .join(" — ");
      const draft = {
        title: productTitle || imageResult.product.name,
        source: "camera" as const,
        rawInput: description || "photo",
        calories: imageResult.nutrients.calories,
        protein: imageResult.nutrients.protein,
        carbs: imageResult.nutrients.carbs,
        fat: imageResult.nutrients.fat,
        confidence: imageResult.confidence.overall,
        parseMethod: `image-analysis (${imageResult.evidence.route})`,
        imageAnalysis: imageResult,
      };
      setDraft(draft);
      completeScan(jobId, draft);
      return;
    }

    // ── Stage 2: Local vision / cloud vision ──────────────────────────
    if (!isActive(jobId)) return;
    setStage(jobId, 2);

    if (isLocalLlmReady()) {
      const captionResult = await captionFoodImage(imagePath, description);
      if (captionResult.success && captionResult.items.length > 0) {
        if (!isActive(jobId)) return;
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
        const draft = {
          ...mealEstimateToDraft(estimate),
          source: "camera" as const,
        };
        if (!isActive(jobId)) return;
        setDraft(draft);
        completeScan(jobId, draft);
        return;
      }
    } else {
      // Cloud vision
      try {
        const cloudResult: MealAnalysisResult = await analyzeMealImage(
          imagePath,
          description
        );
        if (
          cloudResult.items.length > 0 &&
          cloudResult.overallConfidence > 0.3
        ) {
          if (!isActive(jobId)) return;
          const draft = {
            title: cloudResult.items.map((i) => i.resolvedName).join(", "),
            source: "camera" as const,
            rawInput: description || "photo",
            calories: cloudResult.totals.calories,
            protein: cloudResult.totals.protein,
            carbs: cloudResult.totals.carbs,
            fat: cloudResult.totals.fat,
            confidence: cloudResult.overallConfidence,
            parseMethod: "cloud-vision (gpt-4o-mini)",
          };
          setDraft(draft);
          completeScan(jobId, draft);
          return;
        }
      } catch {
        // Fall through to ML Kit labels
      }
    }

    // ── Stage 3: ML Kit labels + text fallback ────────────────────────
    if (!isActive(jobId)) return;
    setStage(jobId, 3);

    const imageLabels = await labelFoodImage(imagePath);
    if (imageLabels && imageLabels.length > 0) {
      const signalParts: string[] = [];
      if (description?.trim()) signalParts.push(description.trim());
      if (ocrText) signalParts.push(ocrText);
      signalParts.push(imageLabels);
      const labelInput = signalParts.join(" ");

      const estimate = await runNutritionPipeline(labelInput, "image", {
        skipLlmParse: true,
      });
      const pipelineDraft = mealEstimateToDraft(estimate);
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
        if (!ocrText && !description?.trim()) {
          pipelineDraft.confidence = Math.max(
            0.15,
            Math.min(pipelineDraft.confidence, 0.65)
          );
        }
        if (!isActive(jobId)) return;
        setDraft(pipelineDraft);
        completeScan(jobId, pipelineDraft);
        return;
      }
    }

    // Text description fallback
    const textForPipeline = description?.trim() || ocrText;
    if (textForPipeline) {
      const estimate = await runNutritionPipeline(textForPipeline, "image", {
        skipLlmParse: true,
      });
      const pipelineDraft = mealEstimateToDraft(estimate);
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
        if (!isActive(jobId)) return;
        setDraft(pipelineDraft);
        completeScan(jobId, pipelineDraft);
        return;
      }
    }

    // All stages exhausted — no usable result
    if (!isActive(jobId)) return;
    failScan(jobId, "No food detected");
  } catch (e) {
    if (!isActive(jobId)) return;
    const message = e instanceof Error ? e.message : "Analysis failed";
    failScan(jobId, message);
  }
}
