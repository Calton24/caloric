/**
 * Phrase Grouper
 *
 * Detects compound foods and prevents over-splitting.
 * "banana protein smoothie" should be 1 item, not 3.
 * "chicken and rice" should be 2 items, not 1.
 *
 * The grouper runs AFTER transcript cleanup and BEFORE parsing.
 * It produces `GroupedPhrase[]` which the parser then handles per-group.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GroupedPhrase {
  /** The text of this group (may be a compound: "banana protein smoothie") */
  text: string;
  /** Whether this was merged from multiple fragments */
  isMerged: boolean;
  /** The original fragments before merging */
  originalFragments: string[];
  /** How confident we are in the grouping (0.0–1.0) */
  groupingConfidence: number;
}

// ─── Compound Food Containers ───────────────────────────────────────────────

/**
 * Words that indicate a compound food where adjacent ingredients belong
 * together. "banana protein smoothie" = one smoothie, not banana + protein + smoothie.
 */
const CONTAINER_WORDS = new Set([
  "smoothie",
  "shake",
  "bowl",
  "wrap",
  "sandwich",
  "salad",
  "pasta",
  "curry",
  "stew",
  "soup",
  "burrito",
  "taco",
  "pizza",
  "omelette",
  "omelet",
  "stir fry",
  "parfait",
  "acai bowl",
  "poke bowl",
  "buddha bowl",
  "power bowl",
  // Cereal / breakfast containers
  "cereal",
  "cornflakes",
  "corn flakes",
  "oatmeal",
  "porridge",
  "muesli",
  "granola",
  // Meal containers
  "biryani",
  "risotto",
  "goulash",
]);

/**
 * Modifier/ingredient words that are likely part of a compound food
 * rather than separate items when adjacent to a container.
 */
const MODIFIER_WORDS = new Set([
  "protein",
  "banana",
  "strawberry",
  "blueberry",
  "mango",
  "peanut butter",
  "chocolate",
  "vanilla",
  "matcha",
  "green",
  "berry",
  "tropical",
  "mixed",
  "spinach",
  "kale",
  "avocado",
  "chicken",
  "beef",
  "tuna",
  "salmon",
  "turkey",
  "veggie",
  "vegan",
  "greek",
  "caesar",
  "garden",
  "grilled",
  "crispy",
  "spicy",
  "iced",
  "hot",
  "cold",
  "frozen",
  // Cereal / breakfast modifiers
  "honey",
  "frosted",
  "sugar",
  "cinnamon",
  "maple",
  "fruit",
  "nut",
  "raisin",
  "cocoa",
  "crunchy",
  // Meal modifiers
  "fried",
  "baked",
  "steamed",
  "roasted",
  "smoked",
  "stuffed",
]);

// ─── Split Logic ────────────────────────────────────────────────────────────

/**
 * Split input on standard delimiters ("and", ",", "&", "plus", "with a").
 * Preserves "with" only when followed by "a" (to not break "pasta with chicken").
 */
function splitOnDelimiters(input: string): string[] {
  return input
    .split(/\s*(?:,\s*|\s+and\s+|\s*&\s*|\s+plus\s+|\s+with\s+a\s+)/i)
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
}

/**
 * Check if a word/phrase is a container word.
 */
function isContainer(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return (
    CONTAINER_WORDS.has(lower) ||
    Array.from(CONTAINER_WORDS).some((c) => lower.includes(c))
  );
}

/**
 * Check if a word/phrase is a modifier that likely belongs to a container.
 */
function isModifier(text: string): boolean {
  const words = text.toLowerCase().trim().split(/\s+/);
  return words.some((w) => MODIFIER_WORDS.has(w));
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Group food phrases from cleaned transcript text.
 *
 * Strategy:
 * 1. Split on standard delimiters (comma, "and", etc.)
 * 2. Check if adjacent fragments should be merged
 *    (modifier + container = one compound food)
 * 3. Check if a fragment contains a container word with modifiers
 *    (already compound — don't split further)
 *
 * @example
 * "banana protein smoothie" → [{ text: "banana protein smoothie", isMerged: false }]
 * "protein shake, banana, smoothie" → might merge if semantic overlap detected
 * "2 eggs and toast" → [{ text: "2 eggs" }, { text: "toast" }]
 */
export function groupFoodPhrases(cleanedInput: string): GroupedPhrase[] {
  if (!cleanedInput.trim()) return [];

  const fragments = splitOnDelimiters(cleanedInput);

  if (fragments.length <= 1) {
    return [
      {
        text: cleanedInput.trim(),
        isMerged: false,
        originalFragments: [cleanedInput.trim()],
        groupingConfidence: 1.0,
      },
    ];
  }

  // Find which fragments are containers and which are modifiers
  const containerIndices = new Set<number>();
  const modifierIndices = new Set<number>();

  for (let i = 0; i < fragments.length; i++) {
    if (isContainer(fragments[i])) containerIndices.add(i);
    if (isModifier(fragments[i]) && !isContainer(fragments[i]))
      modifierIndices.add(i);
  }

  // If there's exactly one container and the rest look like modifiers/ingredients,
  // merge everything into one compound food
  if (
    containerIndices.size === 1 &&
    fragments.length <= 4 &&
    modifierIndices.size > 0
  ) {
    const containerIdx = Array.from(containerIndices)[0];
    const allOthersAreModifiers = fragments.every(
      (_, i) => i === containerIdx || modifierIndices.has(i)
    );

    if (allOthersAreModifiers) {
      // Merge all: "protein shake" + "banana" + "smoothie" → "banana protein smoothie"
      // Put modifiers first, container last
      const modifiers = fragments.filter((_, i) => i !== containerIdx);
      const container = fragments[containerIdx];
      const merged = [...modifiers, container].join(" ");

      return [
        {
          text: merged,
          isMerged: true,
          originalFragments: [...fragments],
          groupingConfidence: 0.6, // merged = uncertain, may be wrong
        },
      ];
    }
  }

  // If there are multiple containers (e.g., "smoothie and sandwich"),
  // these are definitely separate items
  if (containerIndices.size > 1) {
    // Check for semantic overlap — "protein shake" and "smoothie" are similar
    const overlapGroup = findSemanticOverlaps(fragments);
    if (overlapGroup) return overlapGroup;
  }

  // Check for semantic overlaps even without containers
  // "protein shake, banana, smoothie" → banana + smoothie might be one thing
  if (fragments.length >= 2) {
    const overlapGroup = findSemanticOverlaps(fragments);
    if (overlapGroup) return overlapGroup;
  }

  // Default: treat each fragment as independent
  return fragments.map((f) => ({
    text: f,
    isMerged: false,
    originalFragments: [f],
    groupingConfidence: 0.85, // no grouping ambiguity
  }));
}

// ─── Semantic Overlap Detection ─────────────────────────────────────────────

/** Foods that are semantically similar/overlapping — listing one AND the other is suspicious */
const OVERLAP_GROUPS: string[][] = [
  ["smoothie", "shake", "protein shake", "milkshake"],
  ["latte", "coffee", "cappuccino", "espresso", "mocha"],
  ["salad", "garden salad", "caesar salad", "mixed greens"],
  ["soup", "stew", "broth", "chowder"],
];

/**
 * Detect when fragments are semantically overlapping
 * (e.g., "protein shake" and "smoothie" are basically the same category).
 * If found, merge them into a single compound food.
 */
function findSemanticOverlaps(fragments: string[]): GroupedPhrase[] | null {
  const lowerFragments = fragments.map((f) => f.toLowerCase().trim());

  for (const group of OVERLAP_GROUPS) {
    const matchingIndices = lowerFragments
      .map((f, i) =>
        group.some((g) => f.includes(g) || g.includes(f)) ? i : -1
      )
      .filter((i) => i >= 0);

    if (matchingIndices.length >= 2) {
      // Found overlapping items — merge them, keep non-overlapping separate
      const overlapping = matchingIndices.map((i) => fragments[i]);
      const nonOverlapping = fragments.filter(
        (_, i) => !matchingIndices.includes(i)
      );

      // The merged text: combine overlapping fragments
      // Take the longest one as base, add modifiers from shorter ones
      overlapping.sort((a, b) => b.length - a.length);
      const base = overlapping[0];
      const extras = overlapping
        .slice(1)
        .filter((e) => !base.toLowerCase().includes(e.toLowerCase()));
      const merged = extras.length > 0 ? `${extras.join(" ")} ${base}` : base;

      const result: GroupedPhrase[] = [
        {
          text: merged,
          isMerged: true,
          originalFragments: overlapping,
          groupingConfidence: 0.5, // semantic overlap = we're guessing
        },
      ];

      // Add non-overlapping fragments as separate items
      for (const frag of nonOverlapping) {
        result.push({
          text: frag,
          isMerged: false,
          originalFragments: [frag],
          groupingConfidence: 0.85,
        });
      }

      return result;
    }
  }

  return null;
}
