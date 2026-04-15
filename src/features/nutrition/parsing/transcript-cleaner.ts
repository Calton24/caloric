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
  // Hesitation markers
  /\b(uh+|um+|hmm+|ah+|er+|uhh+|eh+|huh|mhm)\b/gi,
  // Discourse markers / hedges
  /\b(like|basically|literally|actually|you know|i mean|i think|i guess|i suppose)\b/gi,
  /\b(probably|maybe|perhaps|apparently|honestly|seriously|obviously)\b/gi,
  /\b(kind of|sort of|kinda|sorta)\b/gi,
  // Conversational glue
  /\b(so yeah|yeah so|and yeah|oh and|oh yeah|well)\b/gi,
  /\b(right|okay|ok|alright|anyways?|anyway)\b/gi,
  /\b(so)\b/gi,
  /\bjust\b/gi,
  // Temporal fillers that don't affect food identification
  /\b(today|yesterday|this morning|last night|earlier|later|tonight)\b/gi,
  /\b(before|after)\s+(that|this|work|class|gym|the gym|my workout|working out)\b/gi,
  // Self-corrections
  /\b(wait|no wait|let me think|hold on|actually wait)\b/gi,
];

/** Leading garbage that doesn't contribute to food identification */
const LEADING_GARBAGE =
  /^((?:just\s+)?(?:i\s+)?(?:had|ate|drank|got|grabbed|made|finished|tried|cooked|prepared|ordered|picked up|wolfed down|chowed down on|munched on|snacked on|sipped|downed|devoured|consumed|enjoyed|whipped up)\s+(?:a\s+|an\s+|some\s+|the\s+|my\s+)?|on\s+a\s+|for\s+(?:lunch|dinner|breakfast|snack|brunch|supper|my\s+(?:morning|afternoon|evening)\s+(?:snack|meal))\s+(?:i\s+(?:had|ate|drank|got|grabbed|made|finished|tried|cooked|prepared|ordered)\s+(?:a\s+|an\s+|some\s+|the\s+|my\s+)?)?)/i;

/** Repeated conjunctions and conversational connectors */
const CONJUNCTION_NOISE: [RegExp, string][] = [
  [/\band\s+then\b/gi, "and"],
  [/\band\s+also\b/gi, "and"],
  [/\bplus\s+also\b/gi, "and"],
  [/\bthen\s+i\s+(had|ate|drank)\b/gi, "and"],
  [/\balso\s+(had|ate|drank)\s+(a\s+)?/gi, "and "],
  [/\bi\s+also\s+(had|ate)\s+(a\s+)?/gi, "and "],
  [/\btogether\s+with\b/gi, "and"],
  // Formal connectors → "and"
  [/\balong\s+with\b/gi, "and"],
  [/\bas\s+well\s+as\b/gi, "and"],
  [/\bfollowed\s+by\b/gi, "and"],
  [/\bon\s+the\s+side\b/gi, "and"],
  [/\bplus\b/gi, "and"],
  // Conversational connectors: "eggs I had a coffee" → "eggs and coffee"
  // The "I" prefix ensures we only match mid-sentence re-verbing, not
  // the main sentence verb ("ate a chicken salad" must NOT become "and chicken salad").
  [
    /\bi\s+(had|ate|drank|got|grabbed|finished|tried|ordered)\s+an?\s+/gi,
    "and ",
  ],
  [
    /\bi\s+(had|ate|drank|got|grabbed|finished|tried|ordered)\s+some\s+/gi,
    "and ",
  ],
  [
    /\bi\s+(had|ate|drank|got|grabbed|finished|tried|ordered)\s+the\s+/gi,
    "and ",
  ],
  // Bare verbs (without "I") are only safe when a food word precedes them.
  // A lookbehind ensures "eggs had a coffee" → "eggs and coffee" but
  // "just ate a salad" does NOT fire (handled by LEADING_GARBAGE instead).
  [/(?<=\w)\s+(had|ate|drank|got|grabbed)\s+an?\s+/gi, " and "],
  [/(?<=\w)\s+(had|ate|drank|got|grabbed)\s+some\s+/gi, " and "],
  [/(?<=\w)\s+(had|ate|drank|got|grabbed)\s+the\s+/gi, " and "],
  // Bare "then" between food fragments: "eggs then toast" → "eggs and toast"
  [/\bthen\s+/gi, "and "],
  // "and afterwards" / "and after that" → "and"
  [/\band\s+after(?:wards|that)?\b/gi, "and"],
];

/** Common ASR mishearings for food-related words */
const ASR_CORRECTIONS: [RegExp, string][] = [
  // "free" → "three" ONLY at start of text or after conjunction+comma
  // (ASR says "free eggs" meaning "three eggs" — but never corrupts
  //  "sugar free", "gluten free", "free range", etc.)
  [
    /(?:^|(?<=\band\s)|(?<=,\s*))\bfree\b(?!\s+range)(?=\s+(?:\w+\s+)*(?:corn|rice|chicken|eggs?|apples?|bananas?|bread|toast|pieces?|cups?|slices?|bowls?))/gi,
    "three",
  ],
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
  // Common food word ASR mistakes
  [/\bwhite\s+flower\b/gi, "white flour"],
  [/\bflower\b(?=\s+tortilla)/gi, "flour"],
  [/\bout\s+meal\b/gi, "oatmeal"],
  [/\boak\s+meal\b/gi, "oatmeal"],
  [/\byo\s+gurt\b/gi, "yogurt"],
  [/\bberry's\b/gi, "berries"],
  [/\bcherry's\b/gi, "cherries"],
  [/\bstraw\s+berries\b/gi, "strawberries"],
  [/\bblue\s+berries\b/gi, "blueberries"],
  [/\brass\s+berries\b/gi, "raspberries"],
  [/\bground\s+beef\b/gi, "ground beef"],
  [/\bchick\s+peas?\b/gi, "chickpeas"],
  [/\bcheck\s+peas?\b/gi, "chickpeas"],
  [/\bsweet\s+corn\b/gi, "sweet corn"],
  [/\bbrockoli\b/gi, "broccoli"],
  [/\bbrocoli\b/gi, "broccoli"],
  [/\bcalliflower\b/gi, "cauliflower"],
  [/\bkeen\s*wah?\b/gi, "quinoa"],
  [/\bavacado\b/gi, "avocado"],
  [/\bguacomole\b/gi, "guacamole"],
  [/\bprotien\b/gi, "protein"],
  [/\bcrason[ts]?\b/gi, "croissant"],
  [/\bcrossant\b/gi, "croissant"],
  [/\bespreso\b/gi, "espresso"],
  [/\bcapuchino\b/gi, "cappuccino"],
  [/\bmoosley\b/gi, "muesli"],
  [/\bmuseli\b/gi, "muesli"],
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

  // 0. Expand contractions FIRST: "I've had" → "I had"
  text = text.replace(/\bi've\s+(had|eaten)\b/gi, "i had");
  text = text.replace(/\bi've\s+been\s+eating\b/gi, "i had");

  // 0.5. Normalize multi-word connectors BEFORE fillers remove "well", "also"
  //      "as well as" → "and", "along with" → "and", etc.
  text = text.replace(/\balong\s+with\b/gi, "and");
  text = text.replace(/\bas\s+well\s+as\b/gi, "and");
  text = text.replace(/\bfollowed\s+by\b/gi, "and");
  text = text.replace(/\bon\s+the\s+side\b/gi, "and");
  text = text.replace(/\btogether\s+with\b/gi, "and");

  // 0.6. Remove pronouns + verbs: "she had X" → "X", "but I also had" → "and"
  text = text.replace(
    /\b(she|he|they|we)\s+(had|ate|drank|got|grabbed)\s+/gi,
    ""
  );
  text = text.replace(/\bbut\s+/gi, "and ");

  // 0.7. Strip mid-sentence meal context BEFORE ASR corrections corrupt "for"
  text = text.replace(
    /\bfor\s+(?:breakfast|lunch|dinner|brunch|supper|snack|my\s+(?:morning|afternoon|evening)\s+(?:snack|meal))\b/gi,
    ""
  );

  // 0.8. Remove "a side of" → just the food
  text = text.replace(/\ba?\s*side\s+of\s+/gi, "");

  // 1. Remove filler words
  for (const pattern of FILLER_PATTERNS) {
    text = text.replace(pattern, " ");
  }

  // 1.5. Trim so LEADING_GARBAGE anchors correctly after filler removal
  text = text.replace(/^\s+/, "");

  // 2. Remove leading garbage ("I had a", "ate a", "on a", etc.)
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

  // 5.5. Re-trim and re-apply leading garbage after stutter removal
  //      "I I had eggs" → stutter fix → "i had eggs" → leading garbage → "eggs"
  text = text.replace(/^\s+/, "");
  text = text.replace(LEADING_GARBAGE, "");

  // 6. Clean up orphan pronouns/articles left by conjunction replacement
  //    e.g. "eggs i and coffee" → "eggs and coffee"
  text = text.replace(/\b(i|my|we)\s+and\b/gi, "and");
  text = text.replace(/\band\s+and\b/gi, "and");

  // 7. Collapse whitespace and strip leading/trailing "and"
  text = text.replace(/\s+/g, " ").trim();
  text = text
    .replace(/^and\s+/i, "")
    .replace(/\s+and$/i, "")
    .trim();

  // Strip bare conjunctions/articles that are the entire remaining text
  if (/^(and|or|the|a|an|some|i|my|we|it|its|was|is)$/i.test(text)) {
    text = "";
  }

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
    cleaned: text,
    original,
    noiseRatio,
    asrConfidence,
  };
}
