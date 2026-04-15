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
  // Drinks
  "smoothie",
  "shake",
  "latte",
  "cappuccino",
  "mocha",
  "frappuccino",
  "milkshake",
  // Bowls
  "bowl",
  "acai bowl",
  "poke bowl",
  "buddha bowl",
  "power bowl",
  "grain bowl",
  "burrito bowl",
  "rice bowl",
  "noodle bowl",
  // Wraps & sandwiches
  "wrap",
  "sandwich",
  "sub",
  "hoagie",
  "panini",
  "pita",
  "flatbread",
  "croissant sandwich",
  // Salads
  "salad",
  // Plated meals
  "pasta",
  "curry",
  "stew",
  "soup",
  "chili",
  "casserole",
  "stir fry",
  // Mexican
  "burrito",
  "taco",
  "quesadilla",
  "enchilada",
  "fajita",
  "nachos",
  // Italian
  "pizza",
  "risotto",
  "lasagna",
  // Asian
  "sushi",
  "ramen",
  "pho",
  "pad thai",
  "bibimbap",
  "fried rice",
  "lo mein",
  "chow mein",
  "teriyaki",
  "dumplings",
  // Indian
  "biryani",
  "tikka masala",
  "dal",
  // Breakfast
  "omelette",
  "omelet",
  "parfait",
  "cereal",
  "cornflakes",
  "corn flakes",
  "oatmeal",
  "porridge",
  "muesli",
  "granola",
  "pancakes",
  "waffles",
  "french toast",
  "overnight oats",
  "chia pudding",
  // Other
  "goulash",
  "paella",
  "jambalaya",
  "gumbo",
  "potpie",
  "pot pie",
  "pie",
  "cobbler",
]);

/**
 * Modifier/ingredient words that are likely part of a compound food
 * rather than separate items when adjacent to a container.
 */
const MODIFIER_WORDS = new Set([
  // Proteins
  "protein",
  "chicken",
  "beef",
  "tuna",
  "salmon",
  "turkey",
  "shrimp",
  "tofu",
  // Fruits
  "banana",
  "strawberry",
  "blueberry",
  "mango",
  "raspberry",
  "acai",
  "berry",
  "tropical",
  "mixed",
  "apple",
  "peach",
  "cherry",
  // Nut butters / supplements
  "peanut butter",
  "almond butter",
  "chocolate",
  "vanilla",
  "matcha",
  "whey",
  "collagen",
  // Vegetables / greens
  "spinach",
  "kale",
  "avocado",
  "mushroom",
  "pepper",
  "onion",
  "tomato",
  "green",
  // Flavor modifiers
  "veggie",
  "vegan",
  "greek",
  "caesar",
  "garden",
  "buffalo",
  "bbq",
  "teriyaki",
  "thai",
  "mexican",
  "italian",
  "mediterranean",
  // Cooking methods (that form compound names)
  "grilled",
  "crispy",
  "spicy",
  "fried",
  "baked",
  "steamed",
  "roasted",
  "smoked",
  "stuffed",
  "pan",
  "stir",
  // Temperature
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
  // Grain/flour modifiers
  "whole wheat",
  "multigrain",
  "sourdough",
  "gluten free",
]);

// ─── Split Logic ────────────────────────────────────────────────────────────

/**
 * Known food words that indicate a "with X" is a separate addition/topping,
 * not a preparation method. "salad with avocado" → avocado is a separate item.
 * Small condiments (butter, salt, honey) stay attached as preparation.
 */
const WITH_ITEM_WORDS = new Set([
  // Proteins — always separate items
  "chicken",
  "beef",
  "pork",
  "fish",
  "salmon",
  "tuna",
  "shrimp",
  "prawns",
  "turkey",
  "bacon",
  "ham",
  "sausage",
  "sausages",
  "egg",
  "eggs",
  "tofu",
  "steak",
  "lamb",
  "meatballs",
  "tempeh",
  "seitan",
  "jerky",
  // Fruits — always separate items
  "banana",
  "apple",
  "avocado",
  "blueberries",
  "strawberries",
  "raspberries",
  "blackberries",
  "mango",
  "berries",
  "grapes",
  "orange",
  "pear",
  "peach",
  "pineapple",
  "watermelon",
  "melon",
  "kiwi",
  "plum",
  "cherries",
  "pomegranate",
  "fig",
  "figs",
  "dates",
  // Vegetables — always separate items
  "spinach",
  "kale",
  "tomato",
  "tomatoes",
  "onion",
  "onions",
  "peppers",
  "mushrooms",
  "broccoli",
  "cauliflower",
  "corn",
  "lettuce",
  "cucumber",
  "carrots",
  "celery",
  "zucchini",
  "asparagus",
  "green beans",
  "sweet potato",
  "sweet potatoes",
  "beets",
  "cabbage",
  "brussels sprouts",
  "edamame",
  // Dairy (substantial portions)
  "cheese",
  "yogurt",
  "cottage cheese",
  "cream cheese",
  // Grains — always separate items
  "rice",
  "bread",
  "pasta",
  "noodles",
  "oats",
  "granola",
  "quinoa",
  "couscous",
  "bulgur",
  "crackers",
  "tortilla",
  "toast",
  "bagel",
  "muffin",
  "croissant",
  // Legumes
  "beans",
  "lentils",
  "chickpeas",
  "hummus",
  // Substantial toppings
  "peanut butter",
  "almond butter",
  "guacamole",
  "salsa",
  "nuts",
  "almonds",
  "walnuts",
  "pecans",
  "cashews",
  "seeds",
  "chia seeds",
  "flax seeds",
  // Dressings (named dressings are separate)
  "olive oil dressing",
  "ranch dressing",
  "vinaigrette",
  "caesar dressing",
  "balsamic dressing",
  "italian dressing",
  "blue cheese dressing",
  "thousand island",
  // Supplements
  "protein powder",
  "protein",
  "whey",
  "collagen",
]);

/**
 * Small additions that should stay attached to the base food
 * as preparation/modifier rather than split into separate items.
 * "toast with butter" → one item, not two.
 */
const WITH_PREP_WORDS = new Set([
  // Fats / spreads
  "butter",
  "margarine",
  "olive oil",
  "oil",
  "coconut oil",
  "cooking spray",
  // Sweeteners
  "sugar",
  "honey",
  "maple syrup",
  "syrup",
  "agave",
  "stevia",
  // Preserves
  "jam",
  "jelly",
  "marmalade",
  "nutella",
  // Dairy additions
  "cream",
  "milk",
  "whipped cream",
  "half and half",
  "creamer",
  // Condiments
  "mayo",
  "mayonnaise",
  "ketchup",
  "mustard",
  "hot sauce",
  "sriracha",
  "tabasco",
  "soy sauce",
  "teriyaki sauce",
  "bbq sauce",
  "worcestershire",
  "fish sauce",
  // Dressings (generic — named dressings are in WITH_ITEM_WORDS)
  "dressing",
  "sauce",
  "gravy",
  "pesto",
  "aioli",
  "chimichurri",
  "tahini",
  // Seasonings
  "salt",
  "pepper",
  "seasoning",
  "spice",
  "herbs",
  "oregano",
  "basil",
  "thyme",
  "cumin",
  "paprika",
  "chili flakes",
  "red pepper flakes",
  // Citrus / aromatics
  "lemon",
  "lime",
  "lemon juice",
  "lime juice",
  "garlic",
  "ginger",
  "cinnamon",
  "vanilla",
  "nutmeg",
  // Vinegars
  "vinegar",
  "balsamic",
  "apple cider vinegar",
  // Misc small additions
  "sprinkles",
  "croutons",
  "parmesan",
  "sour cream",
  "salsa",
  "relish",
  "pickles",
]);

/**
 * Check if a "with X" clause refers to a recognizable food item
 * (should be split as separate item) vs a preparation method
 * (should stay attached, e.g. "with butter", "with salt").
 */
function isWithClauseASeparateItem(withText: string): boolean {
  const lower = withText.toLowerCase().trim();
  // Check exact item matches first — "olive oil dressing" should match
  // WITH_ITEM_WORDS before "olive oil" prefix-matches WITH_PREP_WORDS
  for (const item of WITH_ITEM_WORDS) {
    if (lower === item) return true;
  }
  // Check prep words — these stay attached
  for (const prep of WITH_PREP_WORDS) {
    if (lower === prep || lower.startsWith(prep + " ")) return false;
  }
  // Check prefix/partial item matches
  for (const item of WITH_ITEM_WORDS) {
    if (lower.startsWith(item + " ") || lower.startsWith(item)) return true;
  }
  return false;
}

/**
 * Split "X with Y with Z" into separate items when Y and Z are
 * recognizable foods/toppings. Keeps "with butter" attached when
 * it looks like a preparation modifier.
 *
 * "chicken salad with avocado with olive oil dressing"
 *   → ["chicken salad", "avocado", "olive oil dressing"]
 *
 * "toast with butter" → ["toast with butter"] (kept together)
 */
function splitWithClauses(fragment: string): string[] {
  // Split on "with" boundaries
  const parts = fragment.split(/\s+with\s+/i);
  if (parts.length <= 1) return [fragment];

  const base = parts[0].trim();
  const result: string[] = [base];

  for (let i = 1; i < parts.length; i++) {
    const withPart = parts[i].trim();
    if (!withPart) continue;

    if (isWithClauseASeparateItem(withPart)) {
      // This is a separate food item — split it out
      result.push(withPart);
    } else {
      // This is a preparation/modifier — attach to the base
      result[0] = `${result[0]} with ${withPart}`;
    }
  }

  return result;
}

/**
 * Compound foods containing "and" — must be protected before
 * splitting on "and" delimiter.
 */
const AND_COMPOUNDS: string[] = [
  "mac and cheese",
  "fish and chips",
  "sweet and sour",
  "sweet and sour chicken",
  "sweet and sour pork",
  "peanut butter and jelly",
  "bread and butter",
  "salt and pepper",
  "franks and beans",
  "surf and turf",
  "chips and salsa",
  "chips and guacamole",
  "biscuits and gravy",
  "half and half",
];

/**
 * Split input on standard delimiters ("and", ",", "&", "plus", "with a").
 * Then further split "with X" clauses where X is a recognizable food.
 */
function splitOnDelimiters(input: string): string[] {
  // Protect compound foods containing "and" from being split
  let processed = input;
  const placeholders: Map<string, string> = new Map();
  for (const compound of AND_COMPOUNDS) {
    const idx = processed.toLowerCase().indexOf(compound);
    if (idx >= 0) {
      const placeholder = `__COMPOUND_${placeholders.size}__`;
      const original = processed.slice(idx, idx + compound.length);
      placeholders.set(placeholder, original);
      processed =
        processed.slice(0, idx) +
        placeholder +
        processed.slice(idx + compound.length);
    }
  }

  const initial = processed
    .split(
      /\s*(?:,\s*|\s+and\s+|\s*&\s*|\s+plus\s+|\s+with\s+a\s+|\s+on\s+|\s+(?:had|ate|drank|got|grabbed)\s+(?:an?\s+|some\s+|the\s+)?)/i
    )
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  // Restore placeholders
  const restored = initial.map((f) => {
    for (const [placeholder, original] of placeholders) {
      f = f.replace(placeholder, original);
    }
    return f;
  });

  // Post-process: split any fragment that has "with X" where X is a food
  const result: string[] = [];
  for (const frag of restored) {
    result.push(...splitWithClauses(frag));
  }

  return result;
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
      // Don't merge if a "modifier" is actually a standalone food item
      // e.g. "avocado" split from "chicken salad with avocado" shouldn't be merged back
      // Check individual words too — "a banana" contains "banana" which is standalone
      const standaloneModifiers = fragments.filter((f, i) => {
        if (i === containerIdx) return false;
        const lower = f.toLowerCase().trim();
        if (WITH_ITEM_WORDS.has(lower)) return true;
        // Check if any word in the fragment is a standalone food
        const words = lower.replace(/^(a|an|the|some)\s+/i, "").trim();
        if (WITH_ITEM_WORDS.has(words)) return true;
        // Multi-word fragments with food words are likely separate items
        if (lower.split(/\s+/).length >= 2) {
          return lower.split(/\s+/).some((w) => WITH_ITEM_WORDS.has(w));
        }
        return false;
      });
      if (standaloneModifiers.length > 0) {
        // Some "modifiers" are actually separate foods — don't merge
        return fragments.map((f) => ({
          text: f,
          isMerged: false,
          originalFragments: [f],
          groupingConfidence: 0.85,
        }));
      }

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
