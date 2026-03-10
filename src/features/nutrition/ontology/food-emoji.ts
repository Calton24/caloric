/**
 * Food Emoji Mapper
 *
 * Maps food names/categories to accurate emoji representations.
 * Used throughout the UI to show contextual food icons instead of
 * the generic 🍽️ plate emoji.
 *
 * Strategy: Try specific food match first, then category fallback.
 */

import type { FoodCategory } from "./food-ontology";

// ─── Specific Food → Emoji ──────────────────────────────────────────────────

/**
 * Maps food keywords to their most accurate emoji.
 * Order matters: checked top-to-bottom, first match wins.
 * Multi-word entries are checked before single-word ones.
 */
const FOOD_EMOJI_RULES: { keywords: string[]; emoji: string }[] = [
  // ─── Breakfast / Cereal ─────────────────────────────
  { keywords: ["pancake", "pancakes"], emoji: "🥞" },
  { keywords: ["waffle", "waffles"], emoji: "🧇" },
  { keywords: ["croissant"], emoji: "🥐" },
  { keywords: ["bagel"], emoji: "🥯" },
  {
    keywords: [
      "cereal",
      "cornflakes",
      "corn flakes",
      "granola",
      "muesli",
      "bran flakes",
      "frosted flakes",
      "cheerios",
      "oatmeal",
      "porridge",
    ],
    emoji: "🥣",
  },
  {
    keywords: [
      "toast",
      "bread",
      "sourdough",
      "rye bread",
      "white bread",
      "whole wheat",
    ],
    emoji: "🍞",
  },
  { keywords: ["pretzel"], emoji: "🥨" },
  {
    keywords: ["flatbread", "naan", "pita", "roti", "chapati", "paratha"],
    emoji: "🫓",
  },
  { keywords: ["sandwich", "sub", "blt", "club sandwich"], emoji: "🥪" },

  // ─── Eggs ───────────────────────────────────────────
  {
    keywords: [
      "egg",
      "eggs",
      "omelette",
      "omelet",
      "scrambled eggs",
      "fried egg",
      "boiled egg",
      "shakshuka",
    ],
    emoji: "🥚",
  },

  // ─── Meat / Protein ────────────────────────────────
  { keywords: ["bacon"], emoji: "🥓" },
  {
    keywords: ["steak", "beef steak", "ribeye", "sirloin", "t-bone"],
    emoji: "🥩",
  },
  {
    keywords: ["chicken drumstick", "chicken leg", "chicken wing", "wings"],
    emoji: "🍗",
  },
  {
    keywords: [
      "chicken",
      "grilled chicken",
      "chicken breast",
      "rotisserie chicken",
      "turkey",
    ],
    emoji: "🍗",
  },
  { keywords: ["burger", "hamburger", "cheeseburger"], emoji: "🍔" },
  { keywords: ["hot dog", "hotdog", "frankfurter"], emoji: "🌭" },
  { keywords: ["sausage", "bratwurst", "kielbasa", "wurst"], emoji: "🌭" },
  {
    keywords: ["beef", "ground beef", "mince", "meatball", "meatloaf"],
    emoji: "🥩",
  },
  { keywords: ["pork", "pork chop", "pulled pork", "ham"], emoji: "🥩" },
  { keywords: ["lamb", "lamb chop"], emoji: "🥩" },

  // ─── Seafood ────────────────────────────────────────
  { keywords: ["shrimp", "prawn", "prawns", "shrimps"], emoji: "🦐" },
  { keywords: ["lobster"], emoji: "🦞" },
  { keywords: ["crab"], emoji: "🦀" },
  { keywords: ["oyster", "oysters"], emoji: "🦪" },
  { keywords: ["sushi", "sashimi", "nigiri"], emoji: "🍣" },
  {
    keywords: [
      "fish",
      "salmon",
      "tuna",
      "cod",
      "tilapia",
      "trout",
      "mackerel",
      "sardine",
      "haddock",
    ],
    emoji: "🐟",
  },

  // ─── Asian / Noodles ────────────────────────────────
  { keywords: ["ramen", "pho", "noodle soup"], emoji: "🍜" },
  {
    keywords: [
      "noodles",
      "lo mein",
      "chow mein",
      "pad thai",
      "udon",
      "soba",
      "rice noodles",
    ],
    emoji: "🍝",
  },
  {
    keywords: ["fried rice", "biryani", "jollof rice", "pilaf", "risotto"],
    emoji: "🍛",
  },
  {
    keywords: ["rice", "white rice", "brown rice", "jasmine rice", "basmati"],
    emoji: "🍚",
  },
  {
    keywords: ["dumplings", "gyoza", "dim sum", "wontons", "pierogi"],
    emoji: "🥟",
  },
  { keywords: ["spring roll", "spring rolls", "egg roll"], emoji: "🥟" },
  { keywords: ["bento"], emoji: "🍱" },
  { keywords: ["teriyaki"], emoji: "🍱" },

  // ─── Indian / Curry ─────────────────────────────────
  {
    keywords: [
      "curry",
      "tikka masala",
      "butter chicken",
      "vindaloo",
      "korma",
      "madras",
      "dal",
      "dhal",
    ],
    emoji: "🍛",
  },

  // ─── Mexican / Latin ───────────────────────────────
  { keywords: ["taco", "tacos"], emoji: "🌮" },
  { keywords: ["burrito", "burrito bowl"], emoji: "🌯" },
  { keywords: ["empanada", "empanadas"], emoji: "🥟" },
  { keywords: ["tamale", "tamales"], emoji: "🫔" },

  // ─── Italian / Pasta ───────────────────────────────
  { keywords: ["pizza"], emoji: "🍕" },
  {
    keywords: [
      "pasta",
      "spaghetti",
      "penne",
      "linguine",
      "fettuccine",
      "macaroni",
      "carbonara",
      "bolognese",
      "lasagne",
      "lasagna",
      "ravioli",
    ],
    emoji: "🍝",
  },

  // ─── Soups / Stews ─────────────────────────────────
  {
    keywords: [
      "soup",
      "stew",
      "chili",
      "chilli",
      "goulash",
      "borscht",
      "chowder",
      "broth",
      "bisque",
      "hotpot",
      "casserole",
      "tagine",
    ],
    emoji: "🍲",
  },

  // ─── Salads ─────────────────────────────────────────
  {
    keywords: ["salad", "caesar salad", "greek salad", "coleslaw"],
    emoji: "🥗",
  },

  // ─── Wraps / Kebabs ─────────────────────────────────
  {
    keywords: [
      "kebab",
      "shawarma",
      "doner",
      "döner",
      "gyro",
      "gyros",
      "falafel",
      "wrap",
    ],
    emoji: "🌯",
  },
  { keywords: ["schnitzel", "escalope", "cutlet"], emoji: "🥩" },
  { keywords: ["moussaka", "paella"], emoji: "🍲" },

  // ─── Fast Food / Snacks ─────────────────────────────
  {
    keywords: ["fries", "french fries", "chips", "potato wedges"],
    emoji: "🍟",
  },
  { keywords: ["popcorn"], emoji: "🍿" },
  { keywords: ["pretzel", "soft pretzel"], emoji: "🥨" },
  { keywords: ["nachos"], emoji: "🧀" },

  // ─── Fruits ─────────────────────────────────────────
  { keywords: ["apple", "apples"], emoji: "🍎" },
  { keywords: ["banana", "bananas", "plantain"], emoji: "🍌" },
  {
    keywords: ["orange", "oranges", "tangerine", "clementine", "mandarin"],
    emoji: "🍊",
  },
  { keywords: ["lemon", "lemons"], emoji: "🍋" },
  { keywords: ["grape", "grapes"], emoji: "🍇" },
  { keywords: ["strawberry", "strawberries"], emoji: "🍓" },
  { keywords: ["blueberry", "blueberries"], emoji: "🫐" },
  { keywords: ["watermelon"], emoji: "🍉" },
  { keywords: ["melon", "cantaloupe", "honeydew"], emoji: "🍈" },
  { keywords: ["peach", "peaches", "nectarine"], emoji: "🍑" },
  { keywords: ["pear", "pears"], emoji: "🍐" },
  { keywords: ["cherry", "cherries"], emoji: "🍒" },
  { keywords: ["pineapple"], emoji: "🍍" },
  { keywords: ["mango", "mangoes"], emoji: "🥭" },
  { keywords: ["coconut"], emoji: "🥥" },
  { keywords: ["kiwi"], emoji: "🥝" },
  { keywords: ["avocado", "guacamole"], emoji: "🥑" },
  { keywords: ["tomato", "tomatoes"], emoji: "🍅" },

  // ─── Vegetables ─────────────────────────────────────
  { keywords: ["carrot", "carrots"], emoji: "🥕" },
  { keywords: ["corn", "sweetcorn", "corn on the cob"], emoji: "🌽" },
  {
    keywords: ["pepper", "bell pepper", "capsicum", "chili pepper", "jalapeño"],
    emoji: "🌶️",
  },
  { keywords: ["broccoli"], emoji: "🥦" },
  { keywords: ["cucumber"], emoji: "🥒" },
  {
    keywords: ["lettuce", "cabbage", "kale", "spinach", "greens"],
    emoji: "🥬",
  },
  {
    keywords: [
      "potato",
      "potatoes",
      "baked potato",
      "mashed potato",
      "jacket potato",
    ],
    emoji: "🥔",
  },
  { keywords: ["sweet potato", "yam"], emoji: "🍠" },
  { keywords: ["mushroom", "mushrooms"], emoji: "🍄" },
  { keywords: ["onion", "onions"], emoji: "🧅" },
  { keywords: ["garlic"], emoji: "🧄" },
  { keywords: ["eggplant", "aubergine"], emoji: "🍆" },
  { keywords: ["beans", "lentils", "chickpeas"], emoji: "🫘" },
  { keywords: ["peas", "edamame"], emoji: "🫛" },

  // ─── Dairy ──────────────────────────────────────────
  {
    keywords: [
      "cheese",
      "cheddar",
      "mozzarella",
      "parmesan",
      "brie",
      "feta",
      "gouda",
    ],
    emoji: "🧀",
  },
  { keywords: ["butter"], emoji: "🧈" },
  { keywords: ["yogurt", "yoghurt", "greek yogurt"], emoji: "🥛" },
  {
    keywords: ["milk", "whole milk", "skimmed milk", "semi-skimmed"],
    emoji: "🥛",
  },
  { keywords: ["ice cream", "gelato", "frozen yogurt"], emoji: "🍦" },

  // ─── Sweets / Desserts ──────────────────────────────
  {
    keywords: ["cake", "birthday cake", "cheesecake", "carrot cake"],
    emoji: "🎂",
  },
  { keywords: ["cupcake", "muffin"], emoji: "🧁" },
  { keywords: ["cookie", "cookies", "biscuit", "biscuits"], emoji: "🍪" },
  { keywords: ["donut", "doughnut", "donuts"], emoji: "🍩" },
  { keywords: ["chocolate", "chocolate bar"], emoji: "🍫" },
  { keywords: ["candy", "sweets", "gummy bears", "jelly beans"], emoji: "🍬" },
  { keywords: ["pie", "apple pie", "pumpkin pie", "pecan pie"], emoji: "🥧" },
  { keywords: ["pudding", "custard", "crème brûlée"], emoji: "🍮" },
  { keywords: ["honey"], emoji: "🍯" },

  // ─── Nuts / Seeds ───────────────────────────────────
  { keywords: ["peanut", "peanuts", "peanut butter"], emoji: "🥜" },
  {
    keywords: [
      "almond",
      "almonds",
      "cashew",
      "cashews",
      "walnut",
      "walnuts",
      "nuts",
      "mixed nuts",
      "pistachio",
    ],
    emoji: "🥜",
  },

  // ─── Beverages ──────────────────────────────────────
  {
    keywords: [
      "coffee",
      "espresso",
      "americano",
      "latte",
      "cappuccino",
      "mocha",
      "macchiato",
      "flat white",
    ],
    emoji: "☕",
  },
  {
    keywords: [
      "tea",
      "green tea",
      "black tea",
      "herbal tea",
      "chai",
      "matcha",
      "earl grey",
      "chamomile",
    ],
    emoji: "🍵",
  },
  { keywords: ["bubble tea", "boba"], emoji: "🧋" },
  {
    keywords: [
      "juice",
      "orange juice",
      "apple juice",
      "cranberry juice",
      "juice drink",
      "fruit drink",
      "guava",
      "rubicon",
      "ribena",
      "tropicana",
      "copella",
      "oasis",
      "fruit punch",
      "squash",
      "cordial",
    ],
    emoji: "🧃",
  },
  {
    keywords: [
      "energy drink",
      "red bull",
      "monster",
      "celsius",
      "bang energy",
      "rockstar",
      "g fuel",
      "preworkout",
      "pre workout",
    ],
    emoji: "⚡",
  },
  {
    keywords: ["capri sun", "caprisun", "juice pouch", "juice box"],
    emoji: "🧃",
  },
  {
    keywords: ["smoothie", "protein shake", "shake", "milkshake"],
    emoji: "🥤",
  },
  { keywords: ["water", "sparkling water", "mineral water"], emoji: "💧" },
  {
    keywords: [
      "soda",
      "cola",
      "coke",
      "pepsi",
      "sprite",
      "fanta",
      "lemonade",
      "fizzy drink",
    ],
    emoji: "🥤",
  },
  {
    keywords: ["beer", "ale", "lager", "stout", "ipa", "pilsner"],
    emoji: "🍺",
  },
  { keywords: ["wine", "red wine", "white wine", "rosé"], emoji: "🍷" },
  {
    keywords: ["cocktail", "margarita", "mojito", "martini", "daiquiri"],
    emoji: "🍸",
  },
  {
    keywords: [
      "whiskey",
      "whisky",
      "bourbon",
      "scotch",
      "vodka",
      "rum",
      "gin",
      "tequila",
      "brandy",
    ],
    emoji: "🥃",
  },
  { keywords: ["champagne", "prosecco", "sparkling wine"], emoji: "🥂" },

  // ─── Supplements / Bars ─────────────────────────────
  {
    keywords: [
      "protein bar",
      "energy bar",
      "granola bar",
      "cereal bar",
      "snack bar",
    ],
    emoji: "🍫",
  },
  {
    keywords: ["protein powder", "whey", "creatine", "supplement", "vitamin"],
    emoji: "💊",
  },

  // ─── Non-food ───────────────────────────────────────
  {
    keywords: [
      "cigarette",
      "cigarettes",
      "tobacco",
      "vape",
      "vaping",
      "snus",
      "nicotine",
      "spliff",
      "joint",
      "blunt",
    ],
    emoji: "🚬",
  },
  { keywords: ["gum", "chewing gum"], emoji: "🫧" },
];

// ─── Build Lookup Index ─────────────────────────────────────────────────────

/** Pre-built index: keyword → emoji for O(1) exact lookups */
const EXACT_INDEX = new Map<string, string>();

for (const rule of FOOD_EMOJI_RULES) {
  for (const kw of rule.keywords) {
    if (!EXACT_INDEX.has(kw)) {
      EXACT_INDEX.set(kw, rule.emoji);
    }
  }
}

// ─── Category Fallback ──────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<FoodCategory, string> = {
  beverage: "☕",
  protein: "🍗",
  grain: "🍞",
  fruit: "🍎",
  vegetable: "🥦",
  dairy: "🥛",
  snack: "🍿",
  meal: "🍲",
  condiment: "🧂",
  supplement: "💊",
  "non-food": "🚫",
  unknown: "🍽️",
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get the most accurate emoji for a food item.
 *
 * Strategy:
 *   1. Exact match on the full food name
 *   2. Check each keyword rule against the food name (substring match)
 *   3. Fall back to category emoji if category is known
 *   4. Default to 🍽️ (plate with cutlery)
 */
export function getFoodEmoji(
  foodName: string,
  category?: FoodCategory | null
): string {
  const lower = foodName.toLowerCase().trim();

  // 1. Exact match
  const exact = EXACT_INDEX.get(lower);
  if (exact) return exact;

  // 2. Substring match — check longest keywords first to prefer
  //    "fried rice" over "rice", "chicken breast" over "chicken"
  for (const rule of FOOD_EMOJI_RULES) {
    for (const kw of rule.keywords) {
      if (lower.includes(kw) || kw.includes(lower)) {
        return rule.emoji;
      }
    }
  }

  // 3. Category fallback
  if (category) {
    return CATEGORY_EMOJI[category] ?? "🍽️";
  }

  // 4. Default
  return "🍽️";
}

/**
 * Pick the best emoji for a meal based on its items.
 * If there's one dominant item, use its emoji.
 * If multiple items, use the highest-calorie item's emoji.
 */
export function getMealEmoji(
  items: {
    name: string;
    calories: number;
    category?: FoodCategory | null;
  }[]
): string {
  if (items.length === 0) return "🍽️";
  if (items.length === 1) return getFoodEmoji(items[0].name, items[0].category);

  // Use the highest-calorie item's emoji as the "dominant" food
  const dominant = items.reduce((max, item) =>
    item.calories > max.calories ? item : max
  );
  return getFoodEmoji(dominant.name, dominant.category);
}
