/**
 * Food Normalizer Service
 *
 * Intermediate layer between gpt-4o-mini's raw labels and the nutrition DB.
 * Maps common synonyms, regional names, and model quirks to canonical
 * food names that are more likely to get strong nutrition matches.
 *
 * Architecture:
 *   model label → normalizeFood() → canonical label → nutrition DB lookup
 *
 * This is NOT a nutrition database — it's a string normalization layer.
 * Keep entries short and focused on real model misidentifications.
 */

// ─── Synonym Map ────────────────────────────────────────────────────────────
// Key = canonical name used for DB lookup
// Value = known synonyms the model might output

const FOOD_SYNONYMS: Record<string, string[]> = {
  // ── Sauces & condiments ──
  "tomato sauce": [
    "marinara",
    "pasta sauce",
    "spaghetti sauce",
    "red sauce",
    "bolognese sauce",
    "ragu",
    "sugo",
    "pomodoro",
    "napolitana",
    "arrabbiata",
  ],
  ketchup: ["catsup", "tomato ketchup"],
  mayonnaise: ["mayo"],
  "soy sauce": ["shoyu", "soya sauce"],
  "hot sauce": ["chili sauce", "sriracha sauce", "tabasco"],
  ranch: ["ranch dressing", "ranch sauce"],
  "bbq sauce": ["barbecue sauce", "barbeque sauce"],
  salsa: ["pico de gallo", "salsa fresca"],
  guacamole: ["guac"],
  hummus: ["houmous", "humous"],
  pesto: ["basil pesto", "pesto sauce"],

  // ── Pasta & grains ──
  spaghetti: ["pasta", "noodles", "angel hair"],
  penne: ["penne pasta", "tube pasta"],
  fettuccine: ["fettuccini", "fettucini"],
  macaroni: ["mac", "elbow pasta"],
  rice: ["white rice", "steamed rice", "basmati", "jasmine rice"],
  "brown rice": ["whole grain rice"],
  "fried rice": ["stir fried rice", "stir-fried rice"],
  naan: ["naan bread", "nan bread", "nan"],
  tortilla: ["flour tortilla", "wrap"],

  // ── Proteins ──
  "chicken breast": [
    "grilled chicken",
    "chicken fillet",
    "chicken cutlet",
    "boneless chicken",
  ],
  "chicken thigh": ["dark meat chicken"],
  "chicken wing": ["buffalo wing", "hot wing"],
  "chicken nugget": ["chicken nuggets", "chicken tender", "chicken strip"],
  "ground beef": ["minced beef", "beef mince", "hamburger meat"],
  steak: ["beef steak", "sirloin", "ribeye", "filet"],
  meatball: ["meatballs", "meat ball", "meat balls"],
  sausage: ["sausage link", "bratwurst", "brat"],
  bacon: ["bacon strip", "bacon rashers"],
  salmon: ["salmon fillet", "salmon filet"],
  tuna: ["tuna fish", "tuna steak"],
  shrimp: ["prawns", "shrimps"],
  egg: ["fried egg", "scrambled egg", "boiled egg"],
  tofu: ["bean curd"],
  chickpeas: ["garbanzo beans", "garbanzo", "chick peas", "ceci beans"],
  lentils: ["red lentils", "green lentils", "brown lentils"],

  // ── Dairy ──
  cheese: ["cheddar", "mozzarella", "jack cheese", "american cheese"],
  parmesan: ["parmigiano", "parmesan cheese", "grated cheese"],
  "cream cheese": ["philly", "philadelphia"],
  yogurt: ["yoghurt", "greek yogurt"],
  butter: ["margarine", "spread"],
  "sour cream": ["crema"],

  // ── Vegetables ──
  lettuce: ["salad greens", "mixed greens", "green leaf"],
  tomato: ["tomatoes", "cherry tomato", "grape tomato"],
  onion: ["onions", "diced onion"],
  "bell pepper": ["capsicum", "sweet pepper", "peppers"],
  broccoli: ["broccoli florets"],
  corn: ["sweet corn", "corn kernels"],
  avocado: ["avo"],
  potato: ["potatoes", "baked potato"],
  "french fries": ["fries", "chips", "steak fries", "french fry"],
  "sweet potato": ["yam", "sweet potatoes"],
  mushroom: ["mushrooms", "button mushroom"],
  spinach: ["baby spinach"],
  cucumber: ["cucumbers"],
  carrot: ["carrots"],
  jalapeño: ["jalapeno", "jalapeños"],

  // ── Fruits ──
  banana: ["bananas"],
  apple: ["apples"],
  strawberry: ["strawberries"],
  blueberry: ["blueberries"],
  grape: ["grapes"],
  orange: ["oranges", "mandarin", "tangerine", "clementine"],

  // ── Bread & baked ──
  bread: ["white bread", "toast", "sliced bread"],
  "whole wheat bread": ["brown bread", "wheat bread", "wholemeal bread"],
  bun: ["hamburger bun", "burger bun", "roll"],
  croissant: ["croissants"],
  pancake: ["pancakes", "flapjack", "flapjacks", "hotcake"],
  waffle: ["waffles"],

  // ── Common dishes ──
  pizza: ["pizza slice", "pizza pie"],
  burger: ["hamburger", "cheeseburger"],
  taco: ["tacos", "street taco"],
  burrito: ["burritos"],
  sandwich: ["sub", "hoagie", "hero"],
  soup: ["broth", "stew"],
  salad: ["green salad", "side salad"],
  oatmeal: ["porridge", "oats"],

  // ── Drinks ──
  coffee: ["espresso", "americano", "drip coffee"],
  latte: ["café latte", "cafe latte"],
  "orange juice": ["oj", "fresh orange juice"],
  milk: ["whole milk", "2% milk", "skim milk"],
  smoothie: ["protein shake", "shake"],
  water: ["sparkling water", "mineral water"],

  // ── Snacks ──
  chips: ["potato chips", "crisps"],
  popcorn: ["pop corn"],
  "granola bar": ["energy bar", "protein bar"],
};

// Build a reverse lookup for O(1) matching
const _reverseLookup = new Map<string, string>();

for (const [canonical, synonyms] of Object.entries(FOOD_SYNONYMS)) {
  // Map the canonical name to itself
  _reverseLookup.set(canonical.toLowerCase(), canonical);
  // Map each synonym to the canonical
  for (const synonym of synonyms) {
    _reverseLookup.set(synonym.toLowerCase(), canonical);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Normalize a food label from the vision model to a canonical name
 * that improves nutrition DB match rates.
 *
 * Returns the canonical name if a synonym match is found,
 * otherwise returns the original label (lowercased, trimmed).
 */
export function normalizeFood(label: string): string {
  const cleaned = label.toLowerCase().trim();

  // Direct lookup (exact match or known synonym)
  const directMatch = _reverseLookup.get(cleaned);
  if (directMatch) return directMatch;

  // Substring match: check if any synonym is contained in the label
  // e.g. "grilled herb chicken breast" → contains "chicken breast"
  // Sort by length descending so longer matches win
  for (const [synonym, canonical] of Array.from(_reverseLookup.entries()).sort(
    (a, b) => b[0].length - a[0].length
  )) {
    if (cleaned.includes(synonym) && synonym.length >= 4) {
      return canonical;
    }
  }

  return cleaned;
}

/**
 * Check if two food labels refer to the same canonical food.
 * Useful for deduplication.
 */
export function isSameFood(label1: string, label2: string): boolean {
  return normalizeFood(label1) === normalizeFood(label2);
}
