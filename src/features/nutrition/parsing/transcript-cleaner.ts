/**
 * Transcript Cleaner
 *
 * Pre-processing pass that cleans ASR (speech-to-text) artifacts
 * BEFORE the parser sees the transcript. This is the first stage
 * of the pipeline for voice inputs.
 *
 * Handles:
 *   - Filler removal: "uh", "um", "like", "I had", "on a"
 *   - Conjunction normalization: "and then" → "and"
 *   - Common ASR food mistakes: "on a" prefix, "I had a", etc.
 *   - Repeated words: "I I had" → "I had"
 */

// ─── ASR Filler / Garbage Patterns ──────────────────────────────────────────

/** Patterns that are pure ASR noise — remove completely */
const FILLER_PATTERNS: RegExp[] = [
  /\b(uh+|um+|hmm+|ah+|er+|uhh+)\b/gi,
  /\b(like|basically|literally|actually|you know)\b/gi,
  /\b(so yeah|yeah so|and yeah)\b/gi,
];

/** Leading garbage that doesn't contribute to food identification */
const LEADING_GARBAGE =
  /^(i\s+(had|ate|drank|got|grabbed|made)\s+(a\s+)?|on\s+a\s+|for\s+(lunch|dinner|breakfast|snack)\s+(i\s+(had|ate)\s+)?)/i;

/** Repeated conjunctions */
const CONJUNCTION_NOISE: [RegExp, string][] = [
  [/\band\s+then\b/gi, "and"],
  [/\band\s+also\b/gi, "and"],
  [/\bplus\s+also\b/gi, "and"],
  [/\bthen\s+i\s+(had|ate|drank)\b/gi, "and"],
  [/\balso\s+(had|ate|drank)\s+(a\s+)?/gi, "and "],
  [/\bi\s+also\s+(had|ate)\s+(a\s+)?/gi, "and "],
  [/\btogether\s+with\b/gi, "and"],
];

/** Common ASR mishearings for food-related words */
const ASR_CORRECTIONS: [RegExp, string][] = [
  [/\bfree\b/gi, "three"],
  [
    /\bfor\b(?=\s+(?:\w+\s+)*(?:corn|rice|chicken|egg|apple|banana|bread|toast))/gi,
    "four",
  ],
  [/\bwon\b(?=\s+(?:egg|apple|banana|chicken|steak))/gi, "one"],
  [
    /\btoo\b(?=\s+(?:\w+\s+)*(?:corn|rice|egg|apple|banana|chicken|bread|toast|sweet))/gi,
    "two",
  ],
  [/\bate\b(?=\s+(?:corn|rice|egg|apple|banana|chicken|bread))/gi, "eight"],
  [/\bsigh\b(?=\s+(?:\w+))/gi, "side"],
  [/\bpare\b/gi, "pear"],
  [/\bpears?\s+$/gi, "pear"],
  [/\bbowl\b(?=\s+of)/gi, "bowl"],
];

/** Repeated words from ASR stuttering */
const REPEATED_WORD = /\b(\w+)\s+\1\b/gi;

// ─── Public API ─────────────────────────────────────────────────────────────

export interface CleanedTranscript {
  /** The cleaned text, ready for parsing */
  cleaned: string;
  /** The original raw transcript */
  original: string;
  /** How much was removed (0.0 = nothing, 1.0 = everything) */
  noiseRatio: number;
  /** ASR confidence score: higher = cleaner input */
  asrConfidence: number;
}

/**
 * Clean a raw voice transcript before parsing.
 *
 * For text inputs, this is mostly a no-op (text is already clean).
 * For voice inputs, removes ASR artifacts and normalizes conjunctions.
 */
export function cleanTranscript(
  rawInput: string,
  source: "voice" | "text" | "image"
): CleanedTranscript {
  const original = rawInput.trim();

  if (!original) {
    return { cleaned: "", original, noiseRatio: 0, asrConfidence: 1.0 };
  }

  // Text and image inputs are already clean — minimal processing
  if (source !== "voice") {
    const cleaned = original.toLowerCase().trim();
    return { cleaned, original, noiseRatio: 0, asrConfidence: 0.95 };
  }

  let text = original.toLowerCase();

  // 1. Remove filler words
  for (const pattern of FILLER_PATTERNS) {
    text = text.replace(pattern, " ");
  }

  // 2. Remove leading garbage ("I had a", "on a", etc.)
  text = text.replace(LEADING_GARBAGE, "");

  // 3. Normalize conjunctions
  for (const [pattern, replacement] of CONJUNCTION_NOISE) {
    text = text.replace(pattern, replacement);
  }

  // 4. Apply ASR mishearing corrections
  for (const [pattern, replacement] of ASR_CORRECTIONS) {
    text = text.replace(pattern, replacement);
  }

  // 5. Remove ASR stuttering (repeated words)
  text = text.replace(REPEATED_WORD, "$1");

  // 6. Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();

  // Calculate noise ratio
  const originalWords = original.split(/\s+/).length;
  const cleanedWords = text.split(/\s+/).length;
  const noiseRatio =
    originalWords > 0
      ? Math.round((1 - cleanedWords / originalWords) * 100) / 100
      : 0;

  // ASR confidence: voice starts at 0.75, degrades with noise
  // More noise removed = lower confidence in the original transcription
  const asrConfidence =
    Math.round(Math.max(0.3, 0.75 - noiseRatio * 0.5) * 100) / 100;

  return {
    cleaned: text || original.toLowerCase(),
    original,
    noiseRatio,
    asrConfidence,
  };
}
