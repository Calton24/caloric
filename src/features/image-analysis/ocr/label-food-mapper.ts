/**
 * Label → Food Mapper
 *
 * Translates generic ML Kit image labels (e.g. "baked goods", "dairy product")
 * into specific food names the nutrition pipeline can look up.
 *
 * ML Kit returns broad visual categories — this layer converts them into
 * concrete food entries that exist in the ontology or USDA/OFF databases.
 *
 * Strategy:
 *   1. Map known labels to specific food names
 *   2. Combine multiple labels for better specificity (e.g. "chocolate" + "frozen" → "chocolate ice cream")
 *   3. Filter out non-food labels
 *   4. Return the best food description for the pipeline
 */

// ─── Label → Food Mapping ───────────────────────────────────────────────────

/**
 * Maps individual ML Kit labels to specific food names.
 * When ML Kit returns "baked goods", we want "pastry" not the raw label.
 */
const LABEL_TO_FOOD: Record<string, string> = {
  // Desserts & Sweets
  "ice cream": "ice cream",
  "ice cream cone": "ice cream",
  "frozen dessert": "ice cream",
  gelato: "gelato",
  sorbet: "sorbet",
  cake: "cake",
  cupcake: "cupcake",
  pastry: "pastry",
  "baked goods": "pastry",
  cookie: "cookie",
  cookies: "cookie",
  biscuit: "cookie",
  donut: "donut",
  doughnut: "donut",
  muffin: "muffin",
  pie: "pie",
  tart: "pie",
  chocolate: "chocolate",
  candy: "candy",
  confectionery: "candy",
  dessert: "dessert",
  waffle: "waffle",
  pancake: "pancake",
  crepe: "pancake",

  // Bread & Grain
  bread: "bread",
  toast: "toast",
  sandwich: "sandwich",
  bagel: "bagel",
  croissant: "croissant",
  pretzel: "pretzel",
  tortilla: "tortilla",
  noodle: "noodle",
  noodles: "noodle",
  pasta: "pasta",
  rice: "rice",
  cereal: "cereal",
  granola: "granola",

  // Protein
  meat: "meat",
  steak: "steak",
  beef: "beef",
  chicken: "chicken",
  pork: "pork",
  lamb: "lamb",
  turkey: "turkey",
  fish: "fish",
  salmon: "salmon",
  sushi: "sushi",
  seafood: "seafood",
  shrimp: "shrimp",
  egg: "egg",
  eggs: "egg",
  bacon: "bacon",
  sausage: "sausage",
  "hot dog": "hot dog",

  // Dairy
  cheese: "cheese",
  yogurt: "yogurt",
  butter: "butter",
  cream: "cream",
  "dairy product": "yogurt",
  milk: "milk",

  // Fruits
  fruit: "fruit",
  apple: "apple",
  banana: "banana",
  orange: "orange",
  strawberry: "strawberry",
  blueberry: "blueberry",
  grape: "grape",
  watermelon: "watermelon",
  mango: "mango",
  pineapple: "pineapple",
  peach: "peach",
  pear: "pear",
  berry: "berries",
  berries: "berries",
  "citrus fruit": "orange",

  // Vegetables
  vegetable: "vegetable",
  salad: "salad",
  broccoli: "broccoli",
  carrot: "carrot",
  tomato: "tomato",
  potato: "potato",
  corn: "corn",
  mushroom: "mushroom",
  pepper: "bell pepper",
  onion: "onion",
  cucumber: "cucumber",
  lettuce: "salad",
  "leafy green": "salad",

  // Meals
  pizza: "pizza",
  burger: "burger",
  hamburger: "burger",
  taco: "taco",
  burrito: "burrito",
  soup: "soup",
  stew: "stew",
  curry: "curry",
  "fried food": "fried chicken",
  "fast food": "fast food",
  "comfort food": "mac and cheese",
  ramen: "ramen",
  sushi_roll: "sushi",
  dim_sum: "dumplings",

  // Snacks
  chips: "chips",
  popcorn: "popcorn",
  nuts: "nuts",
  "trail mix": "trail mix",
  "protein bar": "protein bar",
  nachos: "nachos",
  fries: "fries",
  "french fries": "fries",

  // Beverages
  coffee: "coffee",
  "coffee cup": "coffee",
  latte: "latte",
  cappuccino: "cappuccino",
  tea: "tea",
  juice: "juice",
  smoothie: "smoothie",
  beer: "beer",
  wine: "wine",
  cocktail: "cocktail",
  soda: "soda",
  "soft drink": "soda",
  "energy drink": "energy drink",
  "bottled water": "water",

  // Condiments
  sauce: "ketchup",
  ketchup: "ketchup",
  mustard: "mustard",
  mayonnaise: "mayonnaise",
  dressing: "salad dressing",
  dip: "hummus",
  guacamole: "guacamole",
  salsa: "salsa",
  pesto: "pesto",
  hummus: "hummus",

  // Cooked styles
  grilled: "grilled chicken",
  fried: "fried chicken",
  roasted: "roast chicken",
  steamed: "steamed vegetables",
  "stir fry": "stir fry",
  "stir fried": "stir fry",
  barbecue: "bbq ribs",
  bbq: "bbq ribs",

  // Bowls & composed meals
  "grain bowl": "grain bowl",
  "poke bowl": "poke bowl",
  "buddha bowl": "buddha bowl",
  "acai bowl": "acai bowl",
  "smoothie bowl": "smoothie bowl",
  "rice bowl": "rice bowl",
  "noodle bowl": "ramen",
  bowl: "rice bowl",
  wrap: "wrap",
  "spring roll": "spring roll",
  dumpling: "dumplings",
  gyoza: "gyoza",
  wonton: "wonton",
  tempura: "tempura",
  kebab: "kebab",

  // Pastries & bakery
  brownie: "brownie",
  "cinnamon roll": "cinnamon roll",
  scone: "scone",
  "danish pastry": "danish pastry",
  flapjack: "flapjack",
  macaron: "macaron",

  // Soups
  chili: "chili",
  chowder: "clam chowder",
  broth: "soup",

  // Generic food labels (fallbacks)
  food: "food",
  meal: "meal",
  dish: "meal",
  snack: "snack",
  "finger food": "snack",
  appetizer: "snack",
  "side dish": "vegetable",
  "main course": "meal",
  "street food": "meal",
  "junk food": "fast food",
  produce: "fruit",
  "natural food": "fruit",
  "whole food": "vegetable",
  "organic food": "salad",
  "prepared food": "meal",
  "cooked food": "meal",
};

// ─── Label Combination Rules ────────────────────────────────────────────────

/**
 * When two labels appear together, produce a more specific food name.
 * Maps "label1 + label2" → "specific food".
 * Checked after individual label mapping.
 */
const LABEL_COMBINATIONS: {
  labels: string[];
  food: string;
}[] = [
  // Frozen + sweet
  { labels: ["chocolate", "frozen"], food: "chocolate ice cream" },
  { labels: ["chocolate", "ice cream"], food: "chocolate ice cream" },
  { labels: ["vanilla", "ice cream"], food: "vanilla ice cream" },
  { labels: ["strawberry", "ice cream"], food: "strawberry ice cream" },
  { labels: ["frozen", "dessert"], food: "ice cream" },
  { labels: ["frozen", "dairy"], food: "frozen yogurt" },

  // Chocolate combinations
  { labels: ["chocolate", "cake"], food: "chocolate cake" },
  { labels: ["chocolate", "cookie"], food: "chocolate cookie" },
  { labels: ["chocolate", "candy"], food: "chocolate bar" },
  { labels: ["chocolate", "baked goods"], food: "chocolate brownie" },

  // Meat combinations
  { labels: ["chicken", "fried"], food: "fried chicken" },
  { labels: ["chicken", "grilled"], food: "grilled chicken" },
  { labels: ["chicken", "rice"], food: "chicken and rice" },
  { labels: ["meat", "bread"], food: "sandwich" },
  { labels: ["meat", "rice"], food: "rice bowl" },
  { labels: ["fish", "fried"], food: "fish and chips" },
  { labels: ["fish", "rice"], food: "sushi" },

  // Breakfast combinations
  { labels: ["egg", "bread"], food: "eggs on toast" },
  { labels: ["egg", "bacon"], food: "bacon and eggs" },
  { labels: ["pancake", "syrup"], food: "pancakes with syrup" },

  // Pizza & pasta
  { labels: ["cheese", "bread"], food: "cheese bread" },
  { labels: ["cheese", "pasta"], food: "mac and cheese" },
  { labels: ["tomato", "pasta"], food: "pasta with tomato sauce" },
  { labels: ["tomato", "cheese"], food: "pizza" },

  // Fruit combinations
  { labels: ["fruit", "yogurt"], food: "fruit yogurt" },
  { labels: ["fruit", "cream"], food: "fruit and cream" },
  { labels: ["berries", "cream"], food: "berries and cream" },
  { labels: ["banana", "chocolate"], food: "chocolate banana" },

  // Asian food combinations
  { labels: ["rice", "fried"], food: "fried rice" },
  { labels: ["rice", "chicken"], food: "chicken and rice" },
  { labels: ["rice", "shrimp"], food: "shrimp fried rice" },
  { labels: ["noodle", "soup"], food: "ramen" },
  { labels: ["noodle", "fried"], food: "stir fry noodles" },
  { labels: ["noodle", "chicken"], food: "chicken noodle soup" },
  { labels: ["dumpling", "steamed"], food: "steamed dumplings" },
  { labels: ["dumpling", "fried"], food: "fried dumplings" },
  { labels: ["sushi", "salmon"], food: "salmon sushi" },
  { labels: ["sushi", "tuna"], food: "tuna sushi" },

  // Salad combinations
  { labels: ["salad", "chicken"], food: "chicken caesar salad" },
  { labels: ["salad", "cheese"], food: "greek salad" },
  { labels: ["salad", "egg"], food: "cobb salad" },
  { labels: ["salad", "fruit"], food: "fruit salad" },
  { labels: ["salad", "tuna"], food: "tuna salad" },

  // Soup combinations
  { labels: ["soup", "tomato"], food: "tomato soup" },
  { labels: ["soup", "chicken"], food: "chicken soup" },
  { labels: ["soup", "noodle"], food: "chicken noodle soup" },
  { labels: ["soup", "cream"], food: "cream soup" },

  // Burger/sandwich variants
  { labels: ["bread", "cheese"], food: "grilled cheese" },
  { labels: ["bread", "ham"], food: "ham sandwich" },
  { labels: ["bread", "turkey"], food: "turkey sandwich" },
  { labels: ["burger", "cheese"], food: "cheeseburger" },
  { labels: ["burger", "bacon"], food: "bacon burger" },

  // Bowl combinations
  { labels: ["rice", "fish"], food: "poke bowl" },
  { labels: ["rice", "avocado"], food: "poke bowl" },
  { labels: ["grain", "vegetable"], food: "grain bowl" },
  { labels: ["acai", "fruit"], food: "acai bowl" },

  // Dessert enhanced
  { labels: ["cake", "cream"], food: "cream cake" },
  { labels: ["cake", "fruit"], food: "fruit cake" },
  { labels: ["pastry", "cream"], food: "cream puff" },
  { labels: ["pastry", "chocolate"], food: "pain au chocolat" },
  { labels: ["bread", "cinnamon"], food: "cinnamon roll" },
  { labels: ["cookie", "cream"], food: "oreo cookie" },

  // Meat + cooking style
  { labels: ["chicken", "salad"], food: "chicken salad" },
  { labels: ["chicken", "rice"], food: "chicken and rice" },
  { labels: ["chicken", "bread"], food: "chicken sandwich" },
  { labels: ["chicken", "curry"], food: "chicken curry" },
  { labels: ["chicken", "wings"], food: "chicken wings" },
  { labels: ["beef", "rice"], food: "beef and rice" },
  { labels: ["beef", "bread"], food: "beef sandwich" },
  { labels: ["pork", "rice"], food: "pork fried rice" },
  { labels: ["pork", "bread"], food: "pulled pork sandwich" },
  { labels: ["lamb", "rice"], food: "lamb biryani" },
  { labels: ["lamb", "bread"], food: "lamb kebab" },

  // Breakfast enhanced
  { labels: ["avocado", "toast"], food: "avocado toast" },
  { labels: ["avocado", "bread"], food: "avocado toast" },
  { labels: ["egg", "avocado"], food: "avocado toast with egg" },
  { labels: ["egg", "cheese"], food: "omelette" },
  { labels: ["egg", "toast"], food: "eggs on toast" },
  { labels: ["egg", "sausage"], food: "full english breakfast" },
];

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Convert raw ML Kit labels into a meaningful food description
 * that the nutrition pipeline can look up.
 *
 * Strategy:
 *   1. Check for label combinations (most specific)
 *   2. Fall back to individual label mapping
 *   3. Return best description or null
 *
 * @param labels  Array of label strings from ML Kit (already filtered)
 * @returns       Food description string, or null if no food detected
 */
export function mapLabelsToFood(labels: string[]): string | null {
  if (!labels || labels.length === 0) return null;

  const normalized = labels.map((l) => l.toLowerCase().trim());

  // 1. Check combination rules first (most specific)
  for (const combo of LABEL_COMBINATIONS) {
    const allPresent = combo.labels.every((cl) =>
      normalized.some((nl) => nl.includes(cl) || cl.includes(nl))
    );
    if (allPresent) {
      return combo.food;
    }
  }

  // 2. Map individual labels, prioritizing more specific ones
  const mappedFoods: string[] = [];
  for (const label of normalized) {
    const mapped = LABEL_TO_FOOD[label];
    if (mapped) {
      mappedFoods.push(mapped);
    }
  }

  if (mappedFoods.length === 0) return null;

  // 3. Deduplicate and prefer more specific foods over generic ones
  const genericFoods = new Set([
    "food",
    "meal",
    "snack",
    "dessert",
    "meat",
    "fruit",
    "vegetable",
    "seafood",
  ]);
  const specific = mappedFoods.filter((f) => !genericFoods.has(f));

  if (specific.length > 0) {
    // Return unique specific foods joined
    return [...new Set(specific)].slice(0, 3).join(" ");
  }

  // Only generic labels — return the first one
  return mappedFoods[0];
}
