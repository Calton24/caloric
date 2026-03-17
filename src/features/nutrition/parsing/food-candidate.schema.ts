/**
 * Food Candidate Schema
 *
 * The canonical data contract for the parsing layer.
 * All three input modes (voice, text, image) produce a `ParsedInput`
 * containing one or more `ParsedFoodItem` objects.
 *
 * This is the ONLY shape that flows from input capture → matching pipeline.
 * "AI extracts structure. Databases provide facts."
 */

// ─── Units ───────────────────────────────────────────────────────────────────

/** Supported quantity units that the parser can output */
export type FoodUnit =
  | "piece"
  | "serving"
  | "cup"
  | "tablespoon"
  | "teaspoon"
  | "oz"
  | "g"
  | "ml"
  | "slice"
  | "bowl"
  | "plate"
  | "handful"
  | "scoop"
  | "bar"
  | "can"
  | "bottle"
  | "glass";

/** How the input was captured */
export type InputSource = "voice" | "text" | "image";

/** Which parser produced the structured output */
export type ParseMethod = "local-llm" | "regex" | "fallback";

// ─── Multi-layer Confidence ──────────────────────────────────────────────────

/**
 * Structured confidence that reveals WHERE uncertainty lies.
 * Each layer is 0.0–1.0. `overall` is the geometric mean.
 *
 * A confident parse + bad match ≠ a good result —
 * and now users can see exactly which layer is weak.
 */
export interface ItemConfidence {
  /** How clean/reliable the raw transcript was (voice = lower, text = higher) */
  asr: number;
  /** How well the parser extracted structured data from text */
  parse: number;
  /** How confidently we grouped/split items (1.0 = no ambiguity) */
  grouping: number;
  /** How well the DB match aligns with the parsed food name */
  match: number;
  /** How precise the portion estimate is (explicit "200g" = high, "bowl" = low) */
  portion: number;
  /** Geometric mean of all layers */
  overall: number;
}

/**
 * Human-readable summary of what's uncertain and why.
 * Drives the UI labels instead of raw percentages.
 */
export interface ConfidenceInsight {
  /** Short label: "Banana detected" */
  summary: string;
  /** Issues found: ["Portion uncertain — bowl sizes vary"] */
  issues: string[];
  /** Whether the user should be prompted for clarification */
  needsClarification: boolean;
}

// ─── Parsed Food Item ────────────────────────────────────────────────────────

/**
 * A single food item extracted from user input.
 *
 * This is NOT the final calorie figure — it's a structured *candidate*
 * that the matching layer will resolve against real nutrition databases.
 *
 * @example
 * {
 *   name: "croissant",
 *   quantity: 1,
 *   unit: "piece",
 *   preparation: null,
 *   confidence: 0.91,
 *   rawFragment: "a croissant"
 * }
 */
export interface ParsedFoodItem {
  /** Normalized food name (lowercase, singular when possible) */
  name: string;

  /** Parsed quantity — defaults to 1 if not detected */
  quantity: number;

  /** Unit of measurement — defaults to "serving" if ambiguous */
  unit: FoodUnit;

  /** Size qualifier: "small", "medium", or "large" — used for portion weight lookup */
  sizeQualifier?: "small" | "medium" | "large";

  /** Preparation method or modifier: "grilled", "with butter", "whole milk" */
  preparation: string | null;

  /** Parser confidence for this item: 0.0 – 1.0 */
  confidence: number;

  /** The raw substring from the input that produced this item */
  rawFragment: string;
}

// ─── Parsed Input (top-level output) ─────────────────────────────────────────

/**
 * The complete output of the parsing stage.
 * One `ParsedInput` per user submission (voice utterance, text entry, or photo).
 */
export interface ParsedInput {
  /** Extracted food candidates */
  items: ParsedFoodItem[];

  /** Verbatim user input (transcript, typed text, or image caption) */
  rawInput: string;

  /** How the input was captured */
  source: InputSource;

  /** Which parser produced the result */
  parseMethod: ParseMethod;

  /** ISO timestamp of when parsing completed */
  parsedAt: string;
}
