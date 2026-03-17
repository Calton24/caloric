/**
 * Hierarchical Food Taxonomy
 *
 * Two-level classification for image-detected foods:
 *   Level 1: Broad category (packaged, plated, dessert, drink, snack)
 *   Level 2: Specific sub-category within each L1
 *
 * Designed to work WITH ML Kit Image Labeling output labels.
 * Use `classifyIntoTaxonomy()` to map a set of ML Kit labels
 * into the most specific (L1, L2) pair.
 *
 * "Taxonomy first. Then lookup. Never the other way around."
 */

// ─── Level 1 Categories ─────────────────────────────────────────────────────

export type FoodCategoryL1 =
  | "packaged_food"
  | "plated_meal"
  | "dessert"
  | "drink"
  | "snack"
  | "fruit_veg"
  | "non_food";

// ─── Level 2 Sub-categories ─────────────────────────────────────────────────

export type DessertL2 =
  | "ice_cream"
  | "cake"
  | "pastry"
  | "cookie"
  | "chocolate"
  | "pudding"
  | "frozen_treat"
  | "generic_dessert";

export type DrinkL2 =
  | "coffee"
  | "tea"
  | "smoothie"
  | "milkshake"
  | "juice"
  | "soda"
  | "alcohol"
  | "water"
  | "generic_drink";

export type PlatedMealL2 =
  | "sandwich"
  | "burger"
  | "pizza"
  | "pasta"
  | "rice_dish"
  | "salad"
  | "soup"
  | "sushi"
  | "wrap_taco"
  | "stir_fry"
  | "curry"
  | "breakfast"
  | "generic_meal";

export type SnackL2 =
  | "chips"
  | "nuts"
  | "popcorn"
  | "bar"
  | "crackers"
  | "generic_snack";

export type PackagedL2 =
  | "cereal"
  | "canned"
  | "boxed"
  | "bottled"
  | "wrapped"
  | "generic_packaged";

export type FruitVegL2 = "fruit" | "vegetable" | "mixed";

export type FoodCategoryL2 =
  | DessertL2
  | DrinkL2
  | PlatedMealL2
  | SnackL2
  | PackagedL2
  | FruitVegL2
  | "unknown";

// ─── Taxonomy Result ─────────────────────────────────────────────────────────

export interface TaxonomyClassification {
  l1: FoodCategoryL1;
  l2: FoodCategoryL2;
  /** The food name guess from taxonomy (e.g. "chocolate ice cream") */
  foodGuess: string;
  /** Confidence 0–1 in this classification */
  confidence: number;
  /** ML Kit labels that contributed */
  contributingLabels: string[];
}

// ─── Label → Taxonomy Mapping ────────────────────────────────────────────────

/**
 * Maps ML Kit Image Labeling labels to (L1, L2, foodGuess) tuples.
 * Ordered by specificity — more specific entries first.
 */
interface TaxonomyRule {
  /** ML Kit labels that must ALL be present (AND logic) */
  requiredLabels: string[];
  /** ML Kit labels where at least ONE must be present (OR logic) */
  anyLabels?: string[];
  l1: FoodCategoryL1;
  l2: FoodCategoryL2;
  foodGuess: string;
  /** Priority — higher wins when multiple rules match */
  priority: number;
}

const TAXONOMY_RULES: TaxonomyRule[] = [
  // ─── Desserts (highest specificity) ────────────────────
  {
    requiredLabels: ["chocolate", "frozen dessert"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "ice_cream",
    foodGuess: "chocolate ice cream",
    priority: 95,
  },
  {
    requiredLabels: ["vanilla", "frozen dessert"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "ice_cream",
    foodGuess: "vanilla ice cream",
    priority: 95,
  },
  {
    requiredLabels: ["strawberry", "frozen dessert"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "ice_cream",
    foodGuess: "strawberry ice cream",
    priority: 95,
  },
  {
    requiredLabels: ["frozen dessert"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "ice_cream",
    foodGuess: "ice cream",
    priority: 85,
  },
  {
    requiredLabels: ["ice cream"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "ice_cream",
    foodGuess: "ice cream",
    priority: 85,
  },
  {
    requiredLabels: ["gelato"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "frozen_treat",
    foodGuess: "gelato",
    priority: 85,
  },
  {
    requiredLabels: ["sorbet"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "frozen_treat",
    foodGuess: "sorbet",
    priority: 85,
  },
  {
    requiredLabels: ["chocolate", "cake"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "cake",
    foodGuess: "chocolate cake",
    priority: 92,
  },
  {
    requiredLabels: ["cake"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "cake",
    foodGuess: "cake",
    priority: 80,
  },
  {
    requiredLabels: ["cheesecake"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "cake",
    foodGuess: "cheesecake",
    priority: 88,
  },
  {
    requiredLabels: ["cupcake"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "cake",
    foodGuess: "cupcake",
    priority: 88,
  },
  {
    requiredLabels: ["brownie"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "cookie",
    foodGuess: "brownie",
    priority: 88,
  },
  {
    requiredLabels: ["cookie"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "cookie",
    foodGuess: "cookie",
    priority: 82,
  },
  {
    requiredLabels: ["baked goods"],
    anyLabels: ["chocolate", "sweet"],
    l1: "dessert",
    l2: "pastry",
    foodGuess: "pastry",
    priority: 70,
  },
  {
    requiredLabels: ["donut"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "pastry",
    foodGuess: "donut",
    priority: 88,
  },
  {
    requiredLabels: ["doughnut"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "pastry",
    foodGuess: "donut",
    priority: 88,
  },
  {
    requiredLabels: ["pastry"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "pastry",
    foodGuess: "pastry",
    priority: 78,
  },
  {
    requiredLabels: ["croissant"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "pastry",
    foodGuess: "croissant",
    priority: 88,
  },
  {
    requiredLabels: ["muffin"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "pastry",
    foodGuess: "muffin",
    priority: 85,
  },
  {
    requiredLabels: ["pie"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "pastry",
    foodGuess: "pie",
    priority: 78,
  },
  {
    requiredLabels: ["chocolate"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "chocolate",
    foodGuess: "chocolate",
    priority: 65,
  },
  {
    requiredLabels: ["pudding"],
    anyLabels: undefined,
    l1: "dessert",
    l2: "pudding",
    foodGuess: "pudding",
    priority: 80,
  },
  {
    requiredLabels: ["pancake"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "breakfast",
    foodGuess: "pancake",
    priority: 82,
  },
  {
    requiredLabels: ["waffle"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "breakfast",
    foodGuess: "waffle",
    priority: 82,
  },

  // ─── Drinks ────────────────────────────────────────────
  {
    requiredLabels: ["coffee"],
    anyLabels: undefined,
    l1: "drink",
    l2: "coffee",
    foodGuess: "coffee",
    priority: 80,
  },
  {
    requiredLabels: ["espresso"],
    anyLabels: undefined,
    l1: "drink",
    l2: "coffee",
    foodGuess: "espresso",
    priority: 85,
  },
  {
    requiredLabels: ["latte"],
    anyLabels: undefined,
    l1: "drink",
    l2: "coffee",
    foodGuess: "latte",
    priority: 85,
  },
  {
    requiredLabels: ["cappuccino"],
    anyLabels: undefined,
    l1: "drink",
    l2: "coffee",
    foodGuess: "cappuccino",
    priority: 85,
  },
  {
    requiredLabels: ["tea"],
    anyLabels: undefined,
    l1: "drink",
    l2: "tea",
    foodGuess: "tea",
    priority: 78,
  },
  {
    requiredLabels: ["smoothie"],
    anyLabels: undefined,
    l1: "drink",
    l2: "smoothie",
    foodGuess: "smoothie",
    priority: 85,
  },
  {
    requiredLabels: ["milkshake"],
    anyLabels: undefined,
    l1: "drink",
    l2: "milkshake",
    foodGuess: "milkshake",
    priority: 88,
  },
  {
    requiredLabels: ["juice"],
    anyLabels: undefined,
    l1: "drink",
    l2: "juice",
    foodGuess: "juice",
    priority: 78,
  },
  {
    requiredLabels: ["orange juice"],
    anyLabels: undefined,
    l1: "drink",
    l2: "juice",
    foodGuess: "orange juice",
    priority: 90,
  },
  {
    requiredLabels: ["beer"],
    anyLabels: undefined,
    l1: "drink",
    l2: "alcohol",
    foodGuess: "beer",
    priority: 85,
  },
  {
    requiredLabels: ["wine"],
    anyLabels: undefined,
    l1: "drink",
    l2: "alcohol",
    foodGuess: "wine",
    priority: 85,
  },
  {
    requiredLabels: ["cocktail"],
    anyLabels: undefined,
    l1: "drink",
    l2: "alcohol",
    foodGuess: "cocktail",
    priority: 85,
  },
  {
    requiredLabels: ["soft drink"],
    anyLabels: undefined,
    l1: "drink",
    l2: "soda",
    foodGuess: "soda",
    priority: 78,
  },
  {
    requiredLabels: ["drink"],
    anyLabels: undefined,
    l1: "drink",
    l2: "generic_drink",
    foodGuess: "drink",
    priority: 50,
  },

  // ─── Plated meals ─────────────────────────────────────
  {
    requiredLabels: ["pizza"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "pizza",
    foodGuess: "pizza",
    priority: 90,
  },
  {
    requiredLabels: ["burger"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "burger",
    foodGuess: "burger",
    priority: 88,
  },
  {
    requiredLabels: ["hamburger"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "burger",
    foodGuess: "hamburger",
    priority: 88,
  },
  {
    requiredLabels: ["sandwich"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "sandwich",
    foodGuess: "sandwich",
    priority: 85,
  },
  {
    requiredLabels: ["hot dog"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "sandwich",
    foodGuess: "hot dog",
    priority: 88,
  },
  {
    requiredLabels: ["sushi"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "sushi",
    foodGuess: "sushi",
    priority: 90,
  },
  {
    requiredLabels: ["pasta"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "pasta",
    foodGuess: "pasta",
    priority: 82,
  },
  {
    requiredLabels: ["spaghetti"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "pasta",
    foodGuess: "spaghetti",
    priority: 88,
  },
  {
    requiredLabels: ["noodle"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "pasta",
    foodGuess: "noodles",
    priority: 80,
  },
  {
    requiredLabels: ["ramen"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "pasta",
    foodGuess: "ramen",
    priority: 88,
  },
  {
    requiredLabels: ["rice"],
    anyLabels: ["chicken", "meat", "fish", "vegetable", "curry"],
    l1: "plated_meal",
    l2: "rice_dish",
    foodGuess: "rice dish",
    priority: 78,
  },
  {
    requiredLabels: ["fried rice"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "rice_dish",
    foodGuess: "fried rice",
    priority: 88,
  },
  {
    requiredLabels: ["curry"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "curry",
    foodGuess: "curry",
    priority: 85,
  },
  {
    requiredLabels: ["salad"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "salad",
    foodGuess: "salad",
    priority: 78,
  },
  {
    requiredLabels: ["soup"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "soup",
    foodGuess: "soup",
    priority: 80,
  },
  {
    requiredLabels: ["stew"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "soup",
    foodGuess: "stew",
    priority: 80,
  },
  {
    requiredLabels: ["taco"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "wrap_taco",
    foodGuess: "taco",
    priority: 88,
  },
  {
    requiredLabels: ["burrito"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "wrap_taco",
    foodGuess: "burrito",
    priority: 88,
  },
  {
    requiredLabels: ["wrap"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "wrap_taco",
    foodGuess: "wrap",
    priority: 78,
  },
  {
    requiredLabels: ["stir fry"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "stir_fry",
    foodGuess: "stir fry",
    priority: 85,
  },

  // Broad meal labels from ML Kit
  {
    requiredLabels: ["meal"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "generic_meal",
    foodGuess: "meal",
    priority: 40,
  },
  {
    requiredLabels: ["dish"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "generic_meal",
    foodGuess: "meal",
    priority: 38,
  },
  {
    requiredLabels: ["food"],
    anyLabels: ["plate", "bowl", "dish"],
    l1: "plated_meal",
    l2: "generic_meal",
    foodGuess: "plated meal",
    priority: 35,
  },

  // Breakfast
  {
    requiredLabels: ["egg"],
    anyLabels: ["bread", "toast", "bacon", "breakfast"],
    l1: "plated_meal",
    l2: "breakfast",
    foodGuess: "eggs and toast",
    priority: 80,
  },
  {
    requiredLabels: ["omelette"],
    anyLabels: undefined,
    l1: "plated_meal",
    l2: "breakfast",
    foodGuess: "omelette",
    priority: 85,
  },
  {
    requiredLabels: ["cereal"],
    anyLabels: ["milk", "bowl"],
    l1: "plated_meal",
    l2: "breakfast",
    foodGuess: "cereal with milk",
    priority: 80,
  },

  // ─── Snacks ────────────────────────────────────────────
  {
    requiredLabels: ["chips"],
    anyLabels: undefined,
    l1: "snack",
    l2: "chips",
    foodGuess: "chips",
    priority: 78,
  },
  {
    requiredLabels: ["french fries"],
    anyLabels: undefined,
    l1: "snack",
    l2: "chips",
    foodGuess: "french fries",
    priority: 85,
  },
  {
    requiredLabels: ["fries"],
    anyLabels: undefined,
    l1: "snack",
    l2: "chips",
    foodGuess: "fries",
    priority: 85,
  },
  {
    requiredLabels: ["popcorn"],
    anyLabels: undefined,
    l1: "snack",
    l2: "popcorn",
    foodGuess: "popcorn",
    priority: 85,
  },
  {
    requiredLabels: ["nuts"],
    anyLabels: undefined,
    l1: "snack",
    l2: "nuts",
    foodGuess: "nuts",
    priority: 78,
  },
  {
    requiredLabels: ["pretzel"],
    anyLabels: undefined,
    l1: "snack",
    l2: "crackers",
    foodGuess: "pretzel",
    priority: 82,
  },
  {
    requiredLabels: ["crackers"],
    anyLabels: undefined,
    l1: "snack",
    l2: "crackers",
    foodGuess: "crackers",
    priority: 78,
  },
  {
    requiredLabels: ["snack"],
    anyLabels: undefined,
    l1: "snack",
    l2: "generic_snack",
    foodGuess: "snack",
    priority: 40,
  },

  // ─── Fruit & Vegetables ────────────────────────────────
  {
    requiredLabels: ["banana"],
    anyLabels: undefined,
    l1: "fruit_veg",
    l2: "fruit",
    foodGuess: "banana",
    priority: 88,
  },
  {
    requiredLabels: ["apple"],
    anyLabels: undefined,
    l1: "fruit_veg",
    l2: "fruit",
    foodGuess: "apple",
    priority: 88,
  },
  {
    requiredLabels: ["orange"],
    anyLabels: undefined,
    l1: "fruit_veg",
    l2: "fruit",
    foodGuess: "orange",
    priority: 85,
  },
  {
    requiredLabels: ["strawberry"],
    anyLabels: undefined,
    l1: "fruit_veg",
    l2: "fruit",
    foodGuess: "strawberry",
    priority: 85,
  },
  {
    requiredLabels: ["grape"],
    anyLabels: undefined,
    l1: "fruit_veg",
    l2: "fruit",
    foodGuess: "grapes",
    priority: 85,
  },
  {
    requiredLabels: ["watermelon"],
    anyLabels: undefined,
    l1: "fruit_veg",
    l2: "fruit",
    foodGuess: "watermelon",
    priority: 88,
  },
  {
    requiredLabels: ["fruit"],
    anyLabels: undefined,
    l1: "fruit_veg",
    l2: "fruit",
    foodGuess: "fruit",
    priority: 60,
  },
  {
    requiredLabels: ["vegetable"],
    anyLabels: undefined,
    l1: "fruit_veg",
    l2: "vegetable",
    foodGuess: "vegetables",
    priority: 55,
  },
  {
    requiredLabels: ["broccoli"],
    anyLabels: undefined,
    l1: "fruit_veg",
    l2: "vegetable",
    foodGuess: "broccoli",
    priority: 85,
  },
  {
    requiredLabels: ["carrot"],
    anyLabels: undefined,
    l1: "fruit_veg",
    l2: "vegetable",
    foodGuess: "carrot",
    priority: 85,
  },

  // ─── Packaged food signals ────────────────────────────
  {
    requiredLabels: ["packaging"],
    anyLabels: undefined,
    l1: "packaged_food",
    l2: "generic_packaged",
    foodGuess: "packaged food",
    priority: 55,
  },
  {
    requiredLabels: ["bottle"],
    anyLabels: undefined,
    l1: "packaged_food",
    l2: "bottled",
    foodGuess: "bottled product",
    priority: 50,
  },
  {
    requiredLabels: ["can"],
    anyLabels: undefined,
    l1: "packaged_food",
    l2: "canned",
    foodGuess: "canned product",
    priority: 50,
  },
];

// ─── Non-food labels (rejection signals) ─────────────────────────────────────

const NON_FOOD_LABELS = new Set([
  "person",
  "people",
  "human",
  "face",
  "hand",
  "car",
  "vehicle",
  "building",
  "architecture",
  "animal",
  "dog",
  "cat",
  "bird",
  "furniture",
  "table",
  "chair",
  "desk",
  "computer",
  "phone",
  "screen",
  "keyboard",
  "clothing",
  "shoe",
  "hat",
  "tree",
  "plant",
  "flower",
  "grass",
  "sky",
  "cloud",
  "mountain",
  "beach",
  "text",
  "sign",
  "paper",
  "book",
]);

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Classify ML Kit labels into the food taxonomy.
 *
 * @param labels  Array of { label, confidence } from ML Kit Image Labeling
 * @returns       TaxonomyClassification with (L1, L2, foodGuess)
 */
export function classifyIntoTaxonomy(
  labels: { label: string; confidence: number }[]
): TaxonomyClassification {
  if (labels.length === 0) {
    return {
      l1: "non_food",
      l2: "unknown",
      foodGuess: "unknown",
      confidence: 0.1,
      contributingLabels: [],
    };
  }

  const labelSet = new Set(labels.map((l) => l.label.toLowerCase()));
  const labelConfMap = new Map(
    labels.map((l) => [l.label.toLowerCase(), l.confidence])
  );

  // Check for non-food dominance
  const nonFoodCount = labels.filter((l) =>
    NON_FOOD_LABELS.has(l.label.toLowerCase())
  ).length;
  const foodCount = labels.length - nonFoodCount;
  if (nonFoodCount > 0 && foodCount === 0) {
    return {
      l1: "non_food",
      l2: "unknown",
      foodGuess: "not food",
      confidence: 0.8,
      contributingLabels: labels.map((l) => l.label),
    };
  }

  // Find all matching taxonomy rules
  const matches: {
    rule: TaxonomyRule;
    matchedLabels: string[];
    avgConfidence: number;
  }[] = [];

  for (const rule of TAXONOMY_RULES) {
    // Check all required labels are present
    const allRequired = rule.requiredLabels.every((rl) => labelSet.has(rl));
    if (!allRequired) continue;

    // Check anyLabels (if specified, at least one must be present)
    if (rule.anyLabels && rule.anyLabels.length > 0) {
      const hasAny = rule.anyLabels.some((al) => labelSet.has(al));
      if (!hasAny) continue;
    }

    // Calculate average confidence of matching labels
    const matchedLabels = [...rule.requiredLabels];
    if (rule.anyLabels) {
      const matchedAny = rule.anyLabels.find((al) => labelSet.has(al));
      if (matchedAny) matchedLabels.push(matchedAny);
    }

    const avgConf =
      matchedLabels.reduce((sum, l) => sum + (labelConfMap.get(l) ?? 0.3), 0) /
      matchedLabels.length;

    matches.push({ rule, matchedLabels, avgConfidence: avgConf });
  }

  if (matches.length === 0) {
    // No taxonomy rules matched — try to guess from highest-confidence label
    const topLabel = labels[0];
    return {
      l1: "plated_meal",
      l2: "generic_meal",
      foodGuess: topLabel.label.toLowerCase(),
      confidence: topLabel.confidence * 0.5,
      contributingLabels: [topLabel.label],
    };
  }

  // Sort by priority (desc), then by avgConfidence (desc)
  matches.sort((a, b) => {
    if (b.rule.priority !== a.rule.priority)
      return b.rule.priority - a.rule.priority;
    return b.avgConfidence - a.avgConfidence;
  });

  const best = matches[0];

  return {
    l1: best.rule.l1,
    l2: best.rule.l2,
    foodGuess: best.rule.foodGuess,
    confidence: Math.min(
      (best.rule.priority / 100) * best.avgConfidence * 1.2,
      0.95
    ),
    contributingLabels: best.matchedLabels,
  };
}

/**
 * Generate top-N taxonomy candidates from ML Kit labels.
 * Returns multiple possible classifications ranked by confidence.
 */
export function getTaxonomyCandidates(
  labels: { label: string; confidence: number }[],
  maxCandidates = 3
): TaxonomyClassification[] {
  if (labels.length === 0) return [];

  const labelSet = new Set(labels.map((l) => l.label.toLowerCase()));
  const labelConfMap = new Map(
    labels.map((l) => [l.label.toLowerCase(), l.confidence])
  );

  const results: TaxonomyClassification[] = [];
  const seenFoodGuesses = new Set<string>();

  // Find all matching rules
  const allMatches: {
    rule: TaxonomyRule;
    matchedLabels: string[];
    avgConfidence: number;
  }[] = [];

  for (const rule of TAXONOMY_RULES) {
    const allRequired = rule.requiredLabels.every((rl) => labelSet.has(rl));
    if (!allRequired) continue;

    if (rule.anyLabels && rule.anyLabels.length > 0) {
      const hasAny = rule.anyLabels.some((al) => labelSet.has(al));
      if (!hasAny) continue;
    }

    const matchedLabels = [...rule.requiredLabels];
    if (rule.anyLabels) {
      const matchedAny = rule.anyLabels.find((al) => labelSet.has(al));
      if (matchedAny) matchedLabels.push(matchedAny);
    }

    const avgConf =
      matchedLabels.reduce((sum, l) => sum + (labelConfMap.get(l) ?? 0.3), 0) /
      matchedLabels.length;

    allMatches.push({ rule, matchedLabels, avgConfidence: avgConf });
  }

  allMatches.sort((a, b) => {
    if (b.rule.priority !== a.rule.priority)
      return b.rule.priority - a.rule.priority;
    return b.avgConfidence - a.avgConfidence;
  });

  for (const match of allMatches) {
    if (results.length >= maxCandidates) break;
    if (seenFoodGuesses.has(match.rule.foodGuess)) continue;
    seenFoodGuesses.add(match.rule.foodGuess);

    results.push({
      l1: match.rule.l1,
      l2: match.rule.l2,
      foodGuess: match.rule.foodGuess,
      confidence: Math.min(
        (match.rule.priority / 100) * match.avgConfidence * 1.2,
        0.95
      ),
      contributingLabels: match.matchedLabels,
    });
  }

  return results;
}
