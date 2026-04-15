/**
 * Meal Analysis Types
 *
 * Domain model for the AI-powered food image analysis pipeline.
 * Covers the full lifecycle: request → model output → resolution → result.
 *
 * Architecture:
 *   Client captures image → Edge Function calls gpt-4o-mini →
 *   model decomposes meal into components → server resolves nutrition →
 *   client receives editable structured result.
 */

import type { NutrientProfile } from "../nutrition/matching/matching.types";

// ─── Model Output (what gpt-4o-mini returns) ────────────────────────────────

/** A single food component detected by the vision model */
export interface DetectedFoodComponent {
  /** Canonical food label: "spaghetti", "meatballs", "tomato sauce" */
  label: string;
  /** Short visual description: "pile of pasta with sauce on top" */
  visualDescription: string;
  /** Estimated portion */
  portion: {
    /** Estimated weight in grams */
    grams: number;
    /** Human-readable: "about 1.5 cups" */
    humanReadable: string;
    /** What visual cues informed this estimate */
    reasoning: string;
  };
  /** Model's confidence in detection: 0.0–1.0 */
  confidence: number;
  /** Number of discrete items if countable (0 if not countable) */
  count: number;
  /** Size of each individual item if countable */
  itemSize: "small" | "medium" | "large" | "unknown";
  /** Whether the model is uncertain about this component */
  isAmbiguous: boolean;
  /** Alternative labels if ambiguous: ["marinara", "bolognese"] */
  alternatives: string[];
  /** Relative area of the plate/bowl this occupies: 0.0–1.0 */
  relativeArea: number;
}

/** The complete structured output from gpt-4o-mini */
export interface MealDecomposition {
  /** High-level meal description: "pasta with meatballs and sauce" */
  mealSummary: string;
  /** Container type if visible: "bowl", "plate", "container", "unknown" */
  containerType: "bowl" | "plate" | "container" | "cup" | "unknown";
  /** Estimated container size context */
  containerSize: "small" | "medium" | "large" | "unknown";
  /** Individual food components */
  foods: DetectedFoodComponent[];
  /** Overall scene confidence */
  sceneConfidence: number;
  /** Whether multiple distinct items are visible */
  isMultiItem: boolean;
  /** Any caveats the model wants to flag */
  caveats: string[];
}

// ─── Resolved Result (after nutrition lookup) ────────────────────────────────

/** A food component with resolved nutrition data */
export interface ResolvedFoodItem {
  /** Original model output */
  detected: DetectedFoodComponent;
  /** Resolved canonical food name from nutrition DB */
  resolvedName: string;
  /** Which nutrition source matched */
  nutritionSource: "local" | "ontology" | "usda" | "openfoodfacts" | "fallback";
  /** Nutrients for the estimated portion */
  nutrients: NutrientProfile;
  /** Nutrients per 100g (for portion adjustment) */
  nutrientsPer100g: NutrientProfile;
  /** Confidence breakdown */
  confidence: {
    /** Model saw this food clearly */
    detection: number;
    /** Portion estimate quality */
    portion: number;
    /** Nutrition DB match quality */
    nutritionMatch: number;
    /** Combined confidence */
    overall: number;
  };
  /** Whether user should review this item */
  needsReview: boolean;
  /** Why review is needed: "portion uncertain", "ambiguous food" */
  reviewReason?: string;
}

// ─── Analysis Session ────────────────────────────────────────────────────────

/** Overall confidence band for the entire analysis */
export type ConfidenceBand = "high" | "medium" | "low";

/** Scan state machine */
export type AnalysisState =
  | "idle"
  | "capturing"
  | "uploading"
  | "analyzing"
  | "resolving"
  | "completed"
  | "error"
  | "editing"
  | "confirmed";

/** The complete analysis result */
export interface MealAnalysisResult {
  /** Unique session ID */
  sessionId: string;
  /** Raw model decomposition */
  decomposition: MealDecomposition;
  /** Resolved food items with nutrition */
  items: ResolvedFoodItem[];
  /** Summed totals */
  totals: NutrientProfile;
  /** Overall confidence band */
  confidenceBand: ConfidenceBand;
  /** Overall confidence score 0–1 */
  overallConfidence: number;
  /** Model latency in ms */
  modelLatencyMs: number;
  /** Total pipeline latency in ms */
  totalLatencyMs: number;
  /** Source image URI (local) */
  imageUri: string;
  /** Caveats from the model */
  caveats: string[];
}

// ─── API Contract ────────────────────────────────────────────────────────────

/** Request payload sent to the Edge Function */
export interface AnalyzeMealRequest {
  /** Base64-encoded image (JPEG) */
  imageBase64: string;
  /** Optional user hint: "this is my lunch" */
  userHint?: string;
  /** Timezone offset for meal time context */
  timezoneOffset?: number;
}

/** Response from the ai-scan Edge Function */
export interface AnalyzeMealResponse {
  /** Whether analysis succeeded */
  success: boolean;
  /** Decomposed foods (before nutrition resolution) */
  decomposition: MealDecomposition;
  /** Model latency in ms */
  modelLatencyMs: number;
  /** Scan event ID for telemetry linking */
  scanEventId?: string;
  /** Token usage from OpenAI */
  tokensUsed?: number;
  /** Remaining free credits (from ai-scan choke point) */
  remainingFreeCredits?: number;
  /** Whether user has active pro subscription */
  isPro?: boolean;
  /** AI vendor used for analysis */
  vendor?: string;
  /** AI model used for analysis */
  model?: string;
  /** Error message if failed */
  error?: string;
}

// ─── Correction Types ────────────────────────────────────────────────────────

/** Types of corrections a user can make */
export type CorrectionType =
  | "portion_edit"
  | "name_edit"
  | "removed"
  | "added"
  | "macros_edit";

/** A single per-item correction record */
export interface VisionCorrectionRecord {
  originalLabel: string;
  originalGrams: number | null;
  originalCalories: number | null;
  originalConfidence: number | null;
  correctedLabel: string | null;
  correctedGrams: number | null;
  correctedCalories: number | null;
  correctionType: CorrectionType;
}

/** Telemetry update payload for finalizing a scan event */
export interface ScanTelemetryUpdate {
  scanEventId: string;
  visionModel: string;
  visionLatencyMs: number;
  visionTokensUsed: number | null;
  decomposition: MealDecomposition;
  resolvedItems: ResolvedFoodItem[];
  confidenceBand: ConfidenceBand;
  originalTotals: NutrientProfile;
  finalTotals: NutrientProfile;
  itemsAdded: number;
  itemsRemoved: number;
  itemsPortionEdited: number;
}
