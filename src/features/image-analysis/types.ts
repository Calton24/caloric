/**
 * Image Analysis Types
 *
 * Defines all data contracts for the multi-stage image analysis pipeline.
 *
 * Pipeline: Triage → Extraction → Reasoning → Routing → Matching → Estimation → Confirmation
 */

import type { NutrientProfile } from "../nutrition/matching/matching.types";

// ─── Stage 1: Image Triage ──────────────────────────────────────────────────

/** Classification of the image content type */
export type ImageType =
  | "packaged_product"
  | "nutrition_label"
  | "barcode_focused"
  | "plated_meal"
  | "drink"
  | "multi_item_scene"
  | "unclear";

export interface TriageResult {
  imageType: ImageType;
  confidence: number;
  /** Signals that informed the triage decision */
  signals: string[];
}

// ─── Stage 2: Extraction ────────────────────────────────────────────────────

/** OCR / text extraction output */
export interface OcrExtraction {
  /** All raw text tokens found */
  rawTokens: string[];
  /** Identified brand text */
  brand: string | null;
  /** Product name text */
  productName: string | null;
  /** Flavour / variant text */
  flavour: string | null;
  /** Weight / size text (e.g., "150g") */
  weightText: string | null;
  /** Parsed weight in grams */
  weightGrams: number | null;
  /** Nutrition label values if visible */
  nutritionLabel: Partial<NutrientProfile> | null;
  /** Extraction confidence 0–1 */
  confidence: number;
}

/** Visual classification output */
export interface VisualClassification {
  /** Top category guess */
  category: string;
  /** Additional category candidates */
  alternates: string[];
  /** Whether this looks like a packaged product vs loose food */
  isPackaged: boolean;
  confidence: number;
}

/** Combined evidence from all extractors */
export interface EvidenceBundle {
  imageType: ImageType;
  ocr: OcrExtraction;
  visual: VisualClassification;
  /** Barcode string if detected */
  barcode: string | null;
  /** User-provided description */
  userDescription: string | null;
  /** Source image URI */
  imageUri: string;
}

// ─── Stage 3: Matching ──────────────────────────────────────────────────────

/** Route for matching */
export type MatchRoute =
  | "barcode_lookup"
  | "packaged_product_search"
  | "nutrition_label_direct"
  | "generic_meal_pipeline"
  | "description_only";

/** A candidate product from matching */
export interface ProductCandidate {
  name: string;
  brand: string | null;
  /** Nutrients per 100g */
  nutrientsPer100g: NutrientProfile;
  /** Pack size in grams */
  packSizeGrams: number | null;
  /** Serving size in grams */
  servingSizeGrams: number;
  servingDescription: string;
  /** Source database */
  source: "openfoodfacts" | "usda" | "ocr_label" | "local-fallback";
  sourceId: string;
  /** How well this candidate matched the evidence */
  matchScore: number;
  /** Which evidence contributed to the match */
  matchReasons: string[];
}

// ─── Stage 4: Portion Estimation ────────────────────────────────────────────

/** Available portion presets for packaged products */
export type PortionPreset =
  | "full_pack"
  | "half_pack"
  | "quarter_pack"
  | "one_serving"
  | "custom";

export interface PortionOption {
  preset: PortionPreset;
  label: string;
  grams: number;
  calories: number;
  isDefault: boolean;
}

// ─── Final Analysis Result ──────────────────────────────────────────────────

/**
 * The complete image analysis result, ready for the confirmation UI.
 * This replaces the old "one item with a weak label" approach.
 */
export interface ImageAnalysisResult {
  /** What type of image was detected */
  imageType: ImageType;

  /** Best matched product/food */
  product: ProductCandidate;

  /** Alternative candidates the user can switch to */
  alternatives: ProductCandidate[];

  /** Available portion options (for packaged products) */
  portionOptions: PortionOption[];

  /** Currently selected portion */
  selectedPortion: PortionOption;

  /** Final calculated nutrients for the selected portion */
  nutrients: NutrientProfile;

  /** Evidence that explains why this match was selected */
  evidence: {
    /** Which route was used */
    route: MatchRoute;
    /** OCR tokens that contributed */
    ocrTokens: string[];
    /** Visual classification */
    visualCategory: string;
    /** Human-readable explanation */
    matchExplanation: string;
  };

  /** Overall confidence */
  confidence: {
    ocr: number;
    visual: number;
    match: number;
    overall: number;
  };

  /** Questions for the user if clarification needed */
  clarifications: { field: string; question: string }[];

  /** Source image URI */
  imageUri: string;
}
