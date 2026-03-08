import type { ImageAnalysisResult } from "../image-analysis/types";
import type { EstimatedFoodItem } from "./estimation/estimation.types";
import { MealSource } from "./nutrition.types";

export interface MealDraft {
  title: string;
  source: MealSource;
  rawInput?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;

  // ── Enhanced pipeline fields (optional — backward compatible) ──
  /** Individual estimated food items from the matching pipeline */
  estimatedItems?: EstimatedFoodItem[];
  /** Overall confidence score */
  confidence?: number;
  /** Which parser produced the output */
  parseMethod?: string;

  /** Emoji representing the dominant food in this meal */
  emoji?: string;

  // ── Image analysis fields (optional — backward compatible) ──
  /** Full image analysis result for packaged products */
  imageAnalysis?: ImageAnalysisResult;
}
