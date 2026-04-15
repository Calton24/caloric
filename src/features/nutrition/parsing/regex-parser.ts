/**
 * Regex Parser
 *
 * Deterministic food parser that uses pattern matching to extract
 * structured food candidates from raw text input.
 *
 * This is the FALLBACK parser — always available, no model required.
 * Produces the same `ParsedFoodItem[]` shape as the LLM parser so both
 * paths feed into the same matching pipeline.
 *
 * Handles:
 *   - "2 eggs and toast"      → [{eggs, 2, piece}, {toast, 1, piece}]
 *   - "bowl of pasta"         → [{pasta, 1, bowl}]
 *   - "chicken with rice"     → [{chicken, 1, serving}, {rice, 1, serving}]
 *   - "a large coffee"        → [{coffee, 1, cup}]
 */

import type { FoodUnit, ParsedFoodItem } from "./food-candidate.schema";

// ─── Quantity Detection ──────────────────────────────────────────────────────

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  half: 0.5,
  couple: 2,
  few: 3,
  dozen: 12,
};

/**
 * Extract quantity from the beginning of a fragment.
 * Returns [quantity, remainingText].
 */
function extractQuantity(text: string): [number, string] {
  // Numeric: "2 eggs", "1.5 cups"
  const numMatch = text.match(/^(\d+(?:\.\d+)?)\s*/);
  if (numMatch) {
    return [parseFloat(numMatch[1]), text.slice(numMatch[0].length)];
  }

  // Handle "half a cup" — extract "half" as 0.5, consume "a" so unit extraction works
  const halfA = text.match(/^half\s+(?:a\s+|an\s+)?/i);
  if (halfA) {
    return [0.5, text.slice(halfA[0].length)];
  }

  // Handle "a dozen X" — must come before the generic "a" → 1 match
  const dozenA = text.match(/^a\s+dozen\s+/i);
  if (dozenA) {
    return [12, text.slice(dozenA[0].length)];
  }

  // Handle "a couple X" / "a few X" — must come before the generic "a" → 1 match
  const coupleA = text.match(/^a\s+(couple|couple\s+of|few)\s+/i);
  if (coupleA) {
    const qty = coupleA[1].startsWith("couple") ? 2 : 3;
    return [qty, text.slice(coupleA[0].length)];
  }

  // Word number: "two eggs", "a bagel"
  for (const [word, num] of Object.entries(WORD_NUMBERS)) {
    const re = new RegExp(`^${word}\\s+`, "i");
    if (re.test(text)) {
      return [num, text.replace(re, "")];
    }
  }

  return [1, text];
}

// ─── Unit Detection ──────────────────────────────────────────────────────────

const UNIT_PATTERNS: { pattern: RegExp; unit: FoodUnit }[] = [
  { pattern: /^cups?\s+of\s+/i, unit: "cup" },
  { pattern: /^cups?\s+/i, unit: "cup" },
  { pattern: /^bowls?\s+of\s+/i, unit: "bowl" },
  { pattern: /^bowls?\s+/i, unit: "bowl" },
  { pattern: /^glass(?:es)?\s+of\s+/i, unit: "glass" },
  { pattern: /^glass(?:es)?\s+/i, unit: "glass" },
  { pattern: /^plates?\s+of\s+/i, unit: "plate" },
  { pattern: /^plates?\s+/i, unit: "plate" },
  { pattern: /^slices?\s+of\s+/i, unit: "slice" },
  { pattern: /^slices?\s+/i, unit: "slice" },
  { pattern: /^scoops?\s+of\s+/i, unit: "scoop" },
  { pattern: /^scoops?\s+/i, unit: "scoop" },
  { pattern: /^handfuls?\s+of\s+/i, unit: "handful" },
  { pattern: /^tablespoons?\s+of\s+/i, unit: "tablespoon" },
  { pattern: /^tbsp\s+of\s+/i, unit: "tablespoon" },
  { pattern: /^tbsp\s+/i, unit: "tablespoon" },
  { pattern: /^teaspoons?\s+of\s+/i, unit: "teaspoon" },
  { pattern: /^tsp\s+of\s+/i, unit: "teaspoon" },
  { pattern: /^tsp\s+/i, unit: "teaspoon" },
  { pattern: /^cans?\s+of\s+/i, unit: "can" },
  { pattern: /^bottles?\s+of\s+/i, unit: "bottle" },
  { pattern: /^bars?\s+of\s+/i, unit: "bar" },
  { pattern: /^pieces?\s+of\s+/i, unit: "piece" },
  { pattern: /^servings?\s+of\s+/i, unit: "serving" },
  { pattern: /^portions?\s+of\s+/i, unit: "serving" },
  { pattern: /^packets?\s+of\s+/i, unit: "piece" },
  { pattern: /^bags?\s+of\s+/i, unit: "piece" },
  { pattern: /^boxes?\s+of\s+/i, unit: "piece" },
  { pattern: /^cartons?\s+of\s+/i, unit: "piece" },
  { pattern: /^containers?\s+of\s+/i, unit: "piece" },
  { pattern: /^sticks?\s+of\s+/i, unit: "piece" },
  { pattern: /^strips?\s+of\s+/i, unit: "piece" },
  { pattern: /^fillets?\s+of\s+/i, unit: "piece" },
  { pattern: /^(\d+)\s*g\b/i, unit: "g" },
  { pattern: /^(\d+)\s*oz\b/i, unit: "oz" },
  { pattern: /^(\d+)\s*ml\b/i, unit: "ml" },
];

/**
 * Extract unit from the beginning of text.
 * Returns [unit, remainingText].
 */
function extractUnit(text: string): [FoodUnit, string] {
  for (const { pattern, unit } of UNIT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return [unit, text.slice(match[0].length)];
    }
  }
  return ["serving", text];
}

// ─── Preparation Detection ───────────────────────────────────────────────────

const PREPARATION_PATTERNS = [
  /\b(grilled|fried|baked|roasted|steamed|boiled|raw|fresh|frozen|canned)\b/i,
  /\b(sautéed|sauteed|pan[- ]?fried|deep[- ]?fried|stir[- ]?fried|air[- ]?fried)\b/i,
  /\b(blanched|braised|broiled|charred|blackened|seared|poached)\b/i,
  /\b(slow[- ]?cooked|pressure[- ]?cooked|sous[- ]?vide)\b/i,
  /\b(chopped|diced|minced|sliced|shredded|grated|mashed|pureed|blended)\b/i,
  /\b(with [\w\s]+)$/i,
  /\b(whole milk|skim milk|almond milk|oat milk|soy milk|coconut milk|2%\s*milk|1%\s*milk)\b/i,
  /\b(scrambled|poached|hard.?boiled|soft.?boiled|sunny.?side|over easy|over medium|over hard)\b/i,
  /\b(smoked|dried|pickled|marinated|cured|fermented|candied|glazed)\b/i,
  /\b(unsweetened|sweetened|salted|unsalted|plain|flavored|seasoned)\b/i,
  /\b(organic|whole grain|whole wheat|multigrain|gluten free|sugar free|low fat|fat free|reduced fat)\b/i,
  /\b(boneless|skinless|bone[- ]?in|skin[- ]?on)\b/i,
  /\b(extra virgin|virgin|cold[- ]?pressed|unfiltered)\b/i,
];

function extractPreparation(text: string): [string | null, string] {
  // Don't strip cooking methods that are part of a known compound food
  // e.g. "scrambled eggs", "fried rice", "baked beans"
  const lower = text.toLowerCase().trim();
  if (COMPOUND_FOODS.has(lower)) return [null, text];
  // Also check if text starts with a compound food
  for (const compound of COMPOUND_FOODS) {
    if (lower.startsWith(compound)) return [null, text];
  }

  for (const pattern of PREPARATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const prep = match[1].trim();
      const cleaned = text.replace(match[0], "").trim();
      return [prep, cleaned || text];
    }
  }
  return [null, text];
}

// ─── Splitting ───────────────────────────────────────────────────────────────

/** Word numbers that can start a new food item boundary */
const BOUNDARY_NUMBERS =
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i;

/**
 * Common standalone food words that indicate a separate food item
 * when they appear adjacent to other food words without a separator.
 */
const STANDALONE_FOODS = new Set([
  // Proteins
  "chicken",
  "beef",
  "pork",
  "fish",
  "shrimp",
  "prawns",
  "salmon",
  "tuna",
  "turkey",
  "lamb",
  "bacon",
  "ham",
  "steak",
  "sausage",
  "sausages",
  "eggs",
  "egg",
  "tofu",
  "meatballs",
  "jerky",
  "tempeh",
  // Grains & bread
  "toast",
  "bread",
  "rice",
  "pasta",
  "noodles",
  "oats",
  "cereal",
  "pancakes",
  "pancake",
  "waffles",
  "waffle",
  "bagel",
  "muffin",
  "croissant",
  "tortilla",
  "pita",
  "naan",
  "biscuit",
  "roll",
  "crackers",
  "quinoa",
  "couscous",
  "granola",
  // Vegetables & legumes
  "beans",
  "lentils",
  "chickpeas",
  "salad",
  "broccoli",
  "spinach",
  "corn",
  "peas",
  "potato",
  "potatoes",
  "chips",
  "fries",
  "asparagus",
  "cauliflower",
  "zucchini",
  "mushrooms",
  "peppers",
  "carrots",
  "kale",
  "cabbage",
  "edamame",
  "hummus",
  // Fruits
  "apple",
  "banana",
  "orange",
  "grapes",
  "strawberries",
  "blueberries",
  "raspberries",
  "mango",
  "pineapple",
  "watermelon",
  "peach",
  "pear",
  "kiwi",
  "cherries",
  "avocado",
  // Dairy
  "cheese",
  "yogurt",
  "milk",
  "cottage cheese",
  // Common dishes
  "soup",
  "curry",
  "pizza",
  "burger",
  "sandwich",
  "wrap",
  "tacos",
  "burrito",
  "sushi",
  "ramen",
  "oatmeal",
  "porridge",
  // Drinks
  "coffee",
  "tea",
  "juice",
  "smoothie",
  "shake",
  "latte",
  "water",
  "soda",
  "kombucha",
  // Snacks / desserts
  "cookies",
  "brownie",
  "cake",
  "pie",
  "ice cream",
  "chocolate",
  "popcorn",
  "pretzels",
  "trail mix",
  "nuts",
  "almonds",
]);

/**
 * Known multi-word food compounds that should NOT be split.
 * (Checked as consecutive word pairs in order.)
 */
const COMPOUND_FOODS = new Set([
  // Toast / bread combos
  "shrimp toast",
  "prawn toast",
  "french toast",
  "garlic bread",
  "garlic toast",
  "avocado toast",
  "cinnamon toast",
  "banana bread",
  "corn bread",
  "sourdough bread",
  "whole wheat bread",
  "multigrain bread",
  "rye bread",
  "pumpkin bread",
  "zucchini bread",
  // Egg dishes
  "scrambled eggs",
  "poached eggs",
  "boiled eggs",
  "hard boiled eggs",
  "soft boiled eggs",
  "deviled eggs",
  "eggs benedict",
  "egg whites",
  "egg salad",
  "egg sandwich",
  "egg wrap",
  "egg muffin",
  "egg toast",
  "eggs on toast",
  // Rice dishes
  "fried rice",
  "brown rice",
  "white rice",
  "wild rice",
  "jasmine rice",
  "basmati rice",
  "sticky rice",
  "rice pudding",
  "rice bowl",
  "rice cake",
  "rice cakes",
  // Chicken dishes
  "fried chicken",
  "grilled chicken",
  "roast chicken",
  "rotisserie chicken",
  "chicken breast",
  "chicken thigh",
  "chicken thighs",
  "chicken wings",
  "chicken drumstick",
  "chicken drumsticks",
  "chicken leg",
  "chicken tenders",
  "chicken nuggets",
  "chicken strips",
  "chicken fingers",
  "chicken curry",
  "chicken salad",
  "chicken soup",
  "chicken wrap",
  "chicken sandwich",
  "chicken burger",
  "chicken pasta",
  "chicken stir fry",
  "chicken tikka",
  "chicken tikka masala",
  "chicken parmesan",
  "chicken alfredo",
  "chicken quesadilla",
  "chicken fajita",
  "chicken fajitas",
  "chicken teriyaki",
  "chicken fried rice",
  "chicken noodle soup",
  "chicken caesar salad",
  "chicken caesar",
  // Beef / steak dishes
  "beef steak",
  "beef mince",
  "beef stew",
  "beef curry",
  "beef burger",
  "beef jerky",
  "beef tacos",
  "beef brisket",
  "ground beef",
  "ground turkey",
  // Pork dishes
  "pork chop",
  "pork chops",
  "pork belly",
  "pork tenderloin",
  "pork loin",
  "pulled pork",
  // Lamb dishes
  "lamb chop",
  "lamb chops",
  "lamb shank",
  "lamb curry",
  // Fish / seafood
  "fish fingers",
  "fish sticks",
  "fish tacos",
  "fish and chips",
  "fried fish",
  "grilled salmon",
  "smoked salmon",
  "tuna salad",
  "tuna sandwich",
  "tuna steak",
  "shrimp scampi",
  "coconut shrimp",
  // Turkey dishes
  "turkey breast",
  "turkey sandwich",
  "turkey burger",
  "turkey bacon",
  "turkey meatballs",
  // Beans / legumes
  "black beans",
  "kidney beans",
  "butter beans",
  "lima beans",
  "green beans",
  "baked beans",
  "refried beans",
  "pinto beans",
  "navy beans",
  "cannellini beans",
  "beans on toast",
  "bean soup",
  "bean salad",
  "bean burrito",
  "black bean soup",
  // Potato dishes
  "sweet potato",
  "sweet potatoes",
  "baked potato",
  "baked potatoes",
  "mashed potato",
  "mashed potatoes",
  "roast potatoes",
  "hash browns",
  "tater tots",
  "potato salad",
  "potato soup",
  "sweet potato fries",
  "french fries",
  // Salads
  "caesar salad",
  "greek salad",
  "cobb salad",
  "garden salad",
  "fruit salad",
  "pasta salad",
  "quinoa salad",
  "spinach salad",
  "kale salad",
  "side salad",
  "house salad",
  "mixed salad",
  "chopped salad",
  "waldorf salad",
  "caprese salad",
  "taco salad",
  // Dairy / cheese
  "cream cheese",
  "cottage cheese",
  "sour cream",
  "whipped cream",
  "ice cream",
  "frozen yogurt",
  "greek yogurt",
  "plain yogurt",
  "string cheese",
  "mac and cheese",
  "grilled cheese",
  "cheese pizza",
  // Nut butters / oils
  "peanut butter",
  "almond butter",
  "cashew butter",
  "sunflower butter",
  "coconut butter",
  "olive oil",
  "olive oil dressing",
  "coconut oil",
  "sesame oil",
  "avocado oil",
  // Milk alternatives
  "coconut milk",
  "almond milk",
  "oat milk",
  "soy milk",
  "cashew milk",
  "rice milk",
  "whole milk",
  "skim milk",
  "chocolate milk",
  // Protein / fitness
  "protein bar",
  "protein shake",
  "protein smoothie",
  "protein bowl",
  "protein pancakes",
  "protein oats",
  "protein powder",
  "energy bar",
  "granola bar",
  "cereal bar",
  "power bar",
  "snack bar",
  // Soups
  "chicken noodle soup",
  "tomato soup",
  "minestrone soup",
  "clam chowder",
  "french onion soup",
  "miso soup",
  "lentil soup",
  "vegetable soup",
  "bean soup",
  "black bean soup",
  "split pea soup",
  "corn chowder",
  "mushroom soup",
  "broccoli soup",
  // Sandwiches
  "club sandwich",
  "blt sandwich",
  // Pasta dishes
  "spaghetti bolognese",
  "pasta bake",
  "baked ziti",
  "shrimp pasta",
  // Mexican food
  "cheese quesadilla",
  "burrito bowl",
  // Asian food
  "pad thai",
  "lo mein",
  "chow mein",
  "egg roll",
  "egg rolls",
  "spring roll",
  "spring rolls",
  "orange chicken",
  "kung pao chicken",
  "general tso",
  "sweet and sour",
  "sweet and sour chicken",
  "teriyaki chicken",
  // Breakfast items
  "breakfast burrito",
  "breakfast sandwich",
  "overnight oats",
  "chia pudding",
  "acai bowl",
  "poke bowl",
  "buddha bowl",
  "power bowl",
  "grain bowl",
  "smoothie bowl",
  // Corn items
  "sweet corn",
  "corn on the cob",
  "corn tortilla",
  "corn chips",
  // Sauces / condiments
  "hot sauce",
  "soy sauce",
  "teriyaki sauce",
  "bbq sauce",
  "ranch dressing",
  "caesar dressing",
  "italian dressing",
  "balsamic dressing",
  "honey mustard",
  "maple syrup",
  // Drinks
  "orange juice",
  "apple juice",
  "cranberry juice",
  "grape juice",
  "tomato juice",
  "green tea",
  "black tea",
  "herbal tea",
  "iced tea",
  "iced coffee",
  "black coffee",
  "cold brew",
  "hot chocolate",
  "coconut water",
  "sparkling water",
  // Snacks / desserts
  "trail mix",
  "mixed nuts",
  "dark chocolate",
  "milk chocolate",
  "white chocolate",
  "chocolate chips",
  "chocolate cake",
  "cheese cake",
  "carrot cake",
  "apple pie",
  "pumpkin pie",
  "key lime pie",
  "rice crispy",
  "rice crispy treat",
]);

/**
 * Compound foods that contain "and" — must be protected before
 * splitting on "and" delimiter. These get placeholder-replaced,
 * split happens, then they get restored.
 */
const AND_COMPOUNDS: string[] = [
  "mac and cheese",
  "fish and chips",
  "sweet and sour",
  "sweet and sour chicken",
  "peanut butter and jelly",
  "bread and butter",
  "salt and pepper",
  "franks and beans",
  "surf and turf",
  "chips and salsa",
  "chips and guacamole",
  "biscuits and gravy",
];

/** Split a compound input into individual food fragments */
function splitIntoFragments(input: string): string[] {
  // 0th pass: Protect compound foods containing "and" from being split
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

  // 1st pass: split on "and", "&", commas, "with a", "plus"
  let fragments = processed
    .split(/\s*(?:,\s*|\s+and\s+|\s*&\s*|\s+plus\s+|\s+with\s+a\s+)/i)
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  // Restore placeholders
  fragments = fragments.map((f) => {
    for (const [placeholder, original] of placeholders) {
      f = f.replace(placeholder, original);
    }
    return f;
  });

  // 2nd pass: split fragments that contain implicit item boundaries.
  // E.g. "three corn two sweet corn" → ["three corn", "two sweet corn"]
  // Detects a number-word appearing mid-fragment after a food word.
  const afterNumbers: string[] = [];
  for (const frag of fragments) {
    const words = frag.split(/\s+/);
    if (words.length <= 2) {
      afterNumbers.push(frag);
      continue;
    }

    let current: string[] = [];
    let hasFood = false;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const isNumber = BOUNDARY_NUMBERS.test(w);

      if (isNumber && hasFood && current.length > 0) {
        afterNumbers.push(current.join(" "));
        current = [w];
        hasFood = false;
      } else {
        current.push(w);
        if (!isNumber) hasFood = true;
      }
    }
    if (current.length > 0) {
      afterNumbers.push(current.join(" "));
    }
  }

  // 3rd pass: split fragments with adjacent standalone food words.
  // E.g. "shrimp toast beans" → ["shrimp toast", "beans"]
  // Respects known compound foods ("shrimp toast" stays together).
  const result: string[] = [];
  for (const frag of afterNumbers) {
    const words = frag.split(/\s+/);
    // Skip short fragments or those without standalone food words
    const foodIndices = words
      .map((w, i) => (STANDALONE_FOODS.has(w.toLowerCase()) ? i : -1))
      .filter((i) => i >= 0);
    if (foodIndices.length <= 1) {
      result.push(frag);
      continue;
    }

    // Walk through and split on food word boundaries,
    // but keep known compounds together.
    let current: string[] = [];
    let lastFoodEnd = -1; // index of last food word added

    for (let i = 0; i < words.length; i++) {
      const w = words[i].toLowerCase();
      const isFood = STANDALONE_FOODS.has(w);

      if (isFood && lastFoodEnd >= 0 && current.length > 0) {
        // Check if this word + previous word form a known compound
        const prev = words[lastFoodEnd].toLowerCase();
        const pair = `${prev} ${w}`;
        if (COMPOUND_FOODS.has(pair)) {
          // Keep together — part of a compound
          current.push(words[i]);
          lastFoodEnd = i;
          continue;
        }
        // Check if any word from current fragment to this word forms
        // a compound (handles "sweet corn", "fried rice", etc.)
        const prevWord = i > 0 ? words[i - 1].toLowerCase() : "";
        const immediatePair = `${prevWord} ${w}`;
        if (prevWord && COMPOUND_FOODS.has(immediatePair)) {
          current.push(words[i]);
          lastFoodEnd = i;
          continue;
        }
        // Not a compound — split here
        result.push(current.join(" "));
        current = [words[i]];
        lastFoodEnd = i;
      } else {
        current.push(words[i]);
        if (isFood) lastFoodEnd = i;
      }
    }
    if (current.length > 0) {
      result.push(current.join(" "));
    }
  }

  return result;
}

// ─── Size Qualifier Detection ────────────────────────────────────────────────

/**
 * Foods where "small/medium/large" refers to the individual item size
 * (e.g., "2 large eggs") rather than a menu/drink size (e.g., "large coffee").
 * Only extract sizeQualifier for these foods.
 */
const SIZED_FOODS = new Set([
  "egg",
  "eggs",
  "banana",
  "bananas",
  "apple",
  "apples",
  "orange",
  "oranges",
  "meatball",
  "meatballs",
  "pancake",
  "pancakes",
  "waffle",
  "waffles",
  "croissant",
  "croissants",
  "tortilla",
  "tortillas",
  "bun",
  "buns",
  "sausage",
  "sausages",
  "shrimp",
  "prawns",
  "cookie",
  "cookies",
  "taco",
  "tacos",
  "dumpling",
  "dumplings",
  "donut",
  "donuts",
  "doughnut",
  "doughnuts",
  "strawberry",
  "strawberries",
  "chicken wing",
  "chicken wings",
  "chicken nugget",
  "chicken nuggets",
  "potato",
  "potatoes",
  "tomato",
  "tomatoes",
  "onion",
  "onions",
  "avocado",
  "avocados",
  "pepper",
  "peppers",
  "carrot",
  "carrots",
  "peach",
  "peaches",
  "pear",
  "pears",
  "plum",
  "plums",
  "mango",
  "mangoes",
  "mangos",
  "kiwi",
  "kiwis",
]);

/**
 * Foods that are inherently countable — when a user says "a burger" or
 * "2 spring rolls", they mean individual items (pieces), not an abstract
 * "serving". Without this, the parser defaults to unit="serving" which
 * feeds into a different (and often wrong) portion estimation path.
 *
 * This is a superset of SIZED_FOODS — every sized food is also countable,
 * but not every countable food supports small/medium/large sizing.
 */
const COUNTABLE_FOODS = new Set([
  // Already in SIZED_FOODS (included for completeness in matching)
  "egg",
  "eggs",
  "banana",
  "bananas",
  "apple",
  "apples",
  "orange",
  "oranges",
  "meatball",
  "meatballs",
  "pancake",
  "pancakes",
  "waffle",
  "waffles",
  "croissant",
  "croissants",
  "tortilla",
  "tortillas",
  "bun",
  "buns",
  "sausage",
  "sausages",
  "shrimp",
  "prawns",
  "cookie",
  "cookies",
  "taco",
  "tacos",
  "dumpling",
  "dumplings",
  "donut",
  "donuts",
  "doughnut",
  "doughnuts",
  "strawberry",
  "strawberries",
  "chicken wing",
  "chicken wings",
  "wing",
  "wings",
  "chicken nugget",
  "chicken nuggets",
  "nugget",
  "nuggets",
  "potato",
  "potatoes",
  "tomato",
  "tomatoes",
  "onion",
  "onions",
  "avocado",
  "avocados",
  "pepper",
  "peppers",
  "carrot",
  "carrots",
  "peach",
  "peaches",
  "pear",
  "pears",
  "plum",
  "plums",
  "mango",
  "mangoes",
  "mangos",
  "kiwi",
  "kiwis",
  // Meal-type countable foods
  "burger",
  "burgers",
  "hamburger",
  "hamburgers",
  "sandwich",
  "sandwiches",
  "wrap",
  "wraps",
  "burrito",
  "burritos",
  "kebab",
  "kebabs",
  "doner kebab",
  "döner kebab",
  "shawarma",
  "shawarmas",
  "gyro",
  "gyros",
  "pizza",
  "pizzas",
  "quesadilla",
  "quesadillas",
  "calzone",
  "calzones",
  "hot dog",
  "hot dogs",
  "hotdog",
  "hotdogs",
  "sub",
  "subs",
  "panini",
  "paninis",
  "spring roll",
  "spring rolls",
  "egg roll",
  "egg rolls",
  "samosa",
  "samosas",
  "empanada",
  "empanadas",
  "falafel",
  "falafels",
  // Baked goods
  "bagel",
  "bagels",
  "muffin",
  "muffins",
  "cupcake",
  "cupcakes",
  "brownie",
  "brownies",
  "scone",
  "scones",
  "biscuit",
  "biscuits",
  "pretzel",
  "pretzels",
  "naan",
  "naans",
  "pita",
  "pitas",
  "roll",
  "rolls",
  "pie",
  "pies",
  "pasty",
  "pasties",
  "sausage roll",
  "sausage rolls",
]);

const SIZE_PATTERN = /^(?:extra\s+)?(small|medium|large)\s+(?:sized?\s+)?/i;

/**
 * Extract size qualifier from text if the remaining food name is a sized food.
 * Returns [sizeQualifier | undefined, remainingText].
 */
function extractSize(
  text: string
): ["small" | "medium" | "large" | undefined, string] {
  const match = text.match(SIZE_PATTERN);
  if (!match) return [undefined, text];

  const size = match[1].toLowerCase() as "small" | "medium" | "large";
  const afterSize = text.slice(match[0].length).trim();

  // Only extract if the remaining text starts with a known sized food
  const firstWord = afterSize.split(/\s/)[0].toLowerCase();
  const twoWords = afterSize.split(/\s/).slice(0, 2).join(" ").toLowerCase();

  if (SIZED_FOODS.has(firstWord) || SIZED_FOODS.has(twoWords)) {
    return [size, afterSize];
  }

  // Not a sized food — leave "medium" etc. in the text (e.g., "medium coffee")
  return [undefined, text];
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

/**
 * Parse raw text input into structured food candidates.
 *
 * This does NOT estimate calories — it only extracts structure.
 * The matching + estimation layers handle nutrient data.
 */
export function parseWithRegex(rawInput: string): ParsedFoodItem[] {
  const normalized = rawInput.trim().toLowerCase();

  if (!normalized) return [];

  const fragments = splitIntoFragments(normalized);
  const items: ParsedFoodItem[] = [];

  for (const fragment of fragments) {
    let remaining = fragment.trim();
    if (!remaining) continue;

    // 1. Extract quantity
    const [quantity, afterQty] = extractQuantity(remaining);
    remaining = afterQty;

    // 2. Extract size qualifier (must be before unit extraction)
    const [sizeQualifier, afterSize] = extractSize(remaining);
    remaining = afterSize;

    // 3. Extract unit
    const [unit, afterUnit] = extractUnit(remaining);
    remaining = afterUnit;

    // 4. Extract preparation
    const [preparation, afterPrep] = extractPreparation(remaining);
    remaining = afterPrep;

    // 5. Clean up the food name
    const name = remaining
      .replace(/\b(of|some|the|my|i had|i ate|i drank)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!name) continue;

    // 6. Confidence — regex is deterministic but not always right
    //    High for simple items, lower for compound/ambiguous ones
    const hasExplicitQuantity = quantity !== 1 || /^\d/.test(fragment);
    const hasExplicitUnit = unit !== "serving";
    let confidence = 0.6;
    if (hasExplicitQuantity) confidence += 0.15;
    if (hasExplicitUnit) confidence += 0.1;
    if (sizeQualifier) confidence += 0.05;
    if (name.split(" ").length <= 2) confidence += 0.05;
    confidence = Math.min(confidence, 0.95);

    // If a size qualifier was detected on a countable food, default unit to "piece"
    // Also default to "piece" for countable foods even without a size qualifier
    let effectiveUnit = unit;
    if (unit === "serving") {
      const nameLower = name.toLowerCase();
      const nameWords = nameLower.split(" ");
      if (
        sizeQualifier ||
        COUNTABLE_FOODS.has(nameLower) ||
        COUNTABLE_FOODS.has(nameWords[nameWords.length - 1]) || // "doner kebab" → check "kebab"
        (nameWords.length >= 2 &&
          COUNTABLE_FOODS.has(nameWords.slice(-2).join(" "))) // "chicken spring roll" → check "spring roll"
      ) {
        effectiveUnit = "piece";
      }
    }

    items.push({
      name,
      quantity,
      unit: effectiveUnit,
      sizeQualifier,
      preparation,
      confidence: Math.round(confidence * 100) / 100,
      rawFragment: fragment,
    });
  }

  return items;
}
