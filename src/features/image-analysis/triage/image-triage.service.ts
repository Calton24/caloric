/**
 * Image Triage Service
 *
 * Stage 1 of the image analysis pipeline.
 * Decides what kind of image the user captured, so downstream
 * stages can branch to the right extraction/matching strategy.
 *
 * Currently uses text-based signals (user description + any future OCR).
 * When a vision model is loaded via llama.rn, it can also use visual cues.
 */

import type { ImageType, TriageResult } from "../types";

// ─── Keyword patterns for triage ─────────────────────────────────────────────

const PACKAGED_SIGNALS = [
  // Brands
  /walkers|sensations|lays|doritos|pringles|kettle|tyrrells|mccoys/i,
  /cadbury|galaxy|kitkat|snickers|mars|twix|bounty|maltesers/i,
  /coca[- ]?cola|pepsi|fanta|sprite|7[- ]?up|dr[. ]?pepper|lucozade|ribena/i,
  /kellogg|weetabix|cheerios|shreddies|crunchy\s*nut|special\s*k/i,
  /heinz|ambrosia|batchelors|bisto|oxo|knorr|maggi/i,
  /mcvities|hobnobs|digestives|oreo|jaffa\s*cakes/i,
  /innocent|tropicana|oasis|volvic|evian|highland\s*spring/i,
  /muller|yeo\s*valley|activia|danone/i,
  /ben\s*&?\s*jerry|häagen|magnum|cornetto/i,
  /quorn|linda\s*mccartney|birdseye|findus/i,
  /warburtons|hovis|kingsmill/i,
  /nandos|greggs|subway/i,

  // Product types that are usually packaged
  /\b(crisps|chips|crackers|biscuits|cookies|cereal|granola)\b/i,
  /\b(chocolate\s*bar|protein\s*bar|energy\s*bar|snack\s*bar|flapjack)\b/i,
  /\b(ready\s*meal|microwave\s*meal|pot\s*noodle|instant\s*noodle)\b/i,
  /\b(yoghurt|yogurt|fromage\s*frais)\b/i,
  /\b(juice\s*carton|smoothie|energy\s*drink|soft\s*drink)\b/i,
  /\b(tin|can|packet|pack|bag|box|pouch|bottle|carton|tub|pot|bar|sachet|wrapper)\b/i,

  // Weight on pack
  /\b\d+\s*g\b/i,
  /\b\d+\s*ml\b/i,
  /\b\d+\s*cl\b/i,
  /\b\d+\s*l\b/i,
  /\bper\s*100\s*g\b/i,
  /\bkcal\b/i,
];

const PLATED_MEAL_SIGNALS = [
  /\b(plate|bowl|dish|serving|portion|meal|dinner|lunch|breakfast|supper)\b/i,
  /\b(grilled|roasted|fried|steamed|baked|boiled|sauteed|pan[- ]?fried)\b/i,
  /\b(with|and|on\s+top|side\s+of|accompanied)\b/i,
  /\b(chicken|beef|pork|lamb|fish|salmon|steak|tofu)\b/i,
  /\b(rice|pasta|noodles|potatoes|chips|salad|vegetables|bread)\b/i,
  /\b(curry|stir[- ]?fry|casserole|stew|soup|risotto|paella)\b/i,
  /\b(burger|pizza|sandwich|wrap|taco|burrito|kebab)\b/i,
  /\b(omelette|scrambled|poached|benedict)\b/i,
];

const DRINK_SIGNALS = [
  /\b(coffee|latte|cappuccino|espresso|americano|mocha|macchiato)\b/i,
  /\b(tea|matcha|chai)\b/i,
  /\b(beer|wine|cocktail|gin|vodka|whisky|rum|prosecco|champagne|cider)\b/i,
  /\b(smoothie|milkshake|juice|squash)\b/i,
  /\b(glass|cup|mug|pint|bottle)\b.*\b(of)\b/i,
];

const NUTRITION_LABEL_SIGNALS = [
  /\bnutrition\s*(facts|information|label|panel|table)\b/i,
  /\bcalories?\s*per\s*(100g|serving)\b/i,
  /\benergy\s*\d+\s*k?cal\b/i,
  /\bprotein\s*\d+\s*g\b/i,
  /\bcarbohydrate\s*\d+\s*g\b/i,
  /\bfat\s*\d+\s*g\b/i,
];

const BARCODE_SIGNALS = [
  /\bbarcode\b/i,
  /\bscan\b/i,
  /\bUPC\b/i,
  /\bEAN\b/i,
  /^\d{8,13}$/,
];

// ─── Scoring function ────────────────────────────────────────────────────────

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((p) => p.test(text)).length;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Classify the image type from available signals.
 *
 * @param description  User-provided text description of the photo
 * @param ocrText      Raw OCR text extracted from the image (if available)
 * @returns            TriageResult with imageType and confidence
 */
export function triageImage(
  description: string | null,
  ocrText: string | null = null
): TriageResult {
  // Combine all text signals
  const text = [description, ocrText].filter(Boolean).join(" ");

  if (!text.trim()) {
    return {
      imageType: "unclear",
      confidence: 0.2,
      signals: ["no text input"],
    };[]
  }

  // Score each category
  const scores: Array<{ type: ImageType; score: number; signals: string[] }> =
    [];

  const packaged = countMatches(text, PACKAGED_SIGNALS);
  if (packaged > 0) {
    scores.push({
      type: "packaged_product",
      score: Math.min(0.3 + packaged * 0.15, 0.95),
      signals: PACKAGED_SIGNALS.filter((p) => p.test(text)).map(
        (p) => p.source
      ),
    });
  }

  const label = countMatches(text, NUTRITION_LABEL_SIGNALS);
  if (label > 0) {
    scores.push({
      type: "nutrition_label",
      score: Math.min(0.4 + label * 0.2, 0.95),
      signals: ["nutrition label keywords detected"],
    });
  }

  const barcode = countMatches(text, BARCODE_SIGNALS);
  if (barcode > 0) {
    scores.push({
      type: "barcode_focused",
      score: Math.min(0.3 + barcode * 0.2, 0.9),
      signals: ["barcode-related keywords"],
    });
  }

  const drink = countMatches(text, DRINK_SIGNALS);
  if (drink > 0) {
    scores.push({
      type: "drink",
      score: Math.min(0.25 + drink * 0.15, 0.85),
      signals: ["drink keywords detected"],
    });
  }

  const plated = countMatches(text, PLATED_MEAL_SIGNALS);
  if (plated > 0) {
    scores.push({
      type: "plated_meal",
      score: Math.min(0.2 + plated * 0.12, 0.85),
      signals: ["meal/cooking keywords detected"],
    });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    // No strong signals — default to plated meal (most common use case)
    return {
      imageType: "plated_meal",
      confidence: 0.3,
      signals: ["no strong category signals, defaulting to plated meal"],
    };
  }

  return {
    imageType: scores[0].type,
    confidence: scores[0].score,
    signals: scores[0].signals,
  };
}
