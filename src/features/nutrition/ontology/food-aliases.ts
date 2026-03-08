/**
 * Food Aliases — Multilingual Food Translation Layer
 *
 * Maps food names from various languages to canonical English names
 * that the ontology and APIs understand. This runs BEFORE ontology lookup
 * and API search, translating inputs like "Käse" → "cheese" or
 * "pollo" → "chicken".
 *
 * This is NOT a full translation engine — it's a lookup table for
 * common food terms across the languages most likely used by our users.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FoodAlias {
  /** The foreign-language term */
  alias: string;
  /** The canonical English food name (must match ontology/API terms) */
  canonical: string;
  /** ISO locale code */
  locale: string;
}

// ─── Alias Database ─────────────────────────────────────────────────────────

const FOOD_ALIASES: FoodAlias[] = [
  // ─── Spanish (es) ────────────────────────────────────
  { alias: "pollo", canonical: "chicken", locale: "es" },
  { alias: "arroz", canonical: "rice", locale: "es" },
  { alias: "carne", canonical: "beef", locale: "es" },
  { alias: "cerdo", canonical: "pork", locale: "es" },
  { alias: "pescado", canonical: "fish", locale: "es" },
  { alias: "huevo", canonical: "egg", locale: "es" },
  { alias: "huevos", canonical: "eggs", locale: "es" },
  { alias: "pan", canonical: "bread", locale: "es" },
  { alias: "leche", canonical: "milk", locale: "es" },
  { alias: "queso", canonical: "cheese", locale: "es" },
  { alias: "ensalada", canonical: "salad", locale: "es" },
  { alias: "sopa", canonical: "soup", locale: "es" },
  { alias: "agua", canonical: "water", locale: "es" },
  { alias: "café", canonical: "coffee", locale: "es" },
  { alias: "café con leche", canonical: "latte", locale: "es" },
  { alias: "cerveza", canonical: "beer", locale: "es" },
  { alias: "vino", canonical: "wine", locale: "es" },
  { alias: "manzana", canonical: "apple", locale: "es" },
  { alias: "plátano", canonical: "banana", locale: "es" },
  { alias: "naranja", canonical: "orange", locale: "es" },
  { alias: "fresa", canonical: "strawberry", locale: "es" },
  { alias: "tomate", canonical: "tomato", locale: "es" },
  { alias: "patata", canonical: "potato", locale: "es" },
  { alias: "patatas fritas", canonical: "fries", locale: "es" },
  { alias: "mantequilla", canonical: "butter", locale: "es" },
  { alias: "aceite", canonical: "olive oil", locale: "es" },
  { alias: "azúcar", canonical: "sugar", locale: "es" },
  { alias: "sal", canonical: "salt", locale: "es" },
  { alias: "tortilla española", canonical: "omelette", locale: "es" },

  // ─── French (fr) ────────────────────────────────────
  { alias: "poulet", canonical: "chicken", locale: "fr" },
  { alias: "boeuf", canonical: "beef", locale: "fr" },
  { alias: "bœuf", canonical: "beef", locale: "fr" },
  { alias: "porc", canonical: "pork", locale: "fr" },
  { alias: "poisson", canonical: "fish", locale: "fr" },
  { alias: "oeuf", canonical: "egg", locale: "fr" },
  { alias: "œuf", canonical: "egg", locale: "fr" },
  { alias: "oeufs", canonical: "eggs", locale: "fr" },
  { alias: "riz", canonical: "rice", locale: "fr" },
  { alias: "pain", canonical: "bread", locale: "fr" },
  { alias: "lait", canonical: "milk", locale: "fr" },
  { alias: "fromage", canonical: "cheese", locale: "fr" },
  { alias: "salade", canonical: "salad", locale: "fr" },
  { alias: "soupe", canonical: "soup", locale: "fr" },
  { alias: "eau", canonical: "water", locale: "fr" },
  { alias: "café", canonical: "coffee", locale: "fr" },
  { alias: "thé", canonical: "tea", locale: "fr" },
  { alias: "bière", canonical: "beer", locale: "fr" },
  { alias: "vin", canonical: "wine", locale: "fr" },
  { alias: "pomme", canonical: "apple", locale: "fr" },
  { alias: "banane", canonical: "banana", locale: "fr" },
  { alias: "fraise", canonical: "strawberry", locale: "fr" },
  { alias: "beurre", canonical: "butter", locale: "fr" },
  { alias: "crème", canonical: "cream", locale: "fr" },
  { alias: "sucre", canonical: "sugar", locale: "fr" },
  { alias: "croissant", canonical: "croissant", locale: "fr" },
  { alias: "crêpe", canonical: "pancake", locale: "fr" },
  { alias: "frites", canonical: "fries", locale: "fr" },

  // ─── German (de) ────────────────────────────────────
  { alias: "hähnchen", canonical: "chicken", locale: "de" },
  { alias: "hühnchen", canonical: "chicken", locale: "de" },
  { alias: "rindfleisch", canonical: "beef", locale: "de" },
  { alias: "schweinefleisch", canonical: "pork", locale: "de" },
  { alias: "fisch", canonical: "fish", locale: "de" },
  { alias: "ei", canonical: "egg", locale: "de" },
  { alias: "eier", canonical: "eggs", locale: "de" },
  { alias: "reis", canonical: "rice", locale: "de" },
  { alias: "brot", canonical: "bread", locale: "de" },
  { alias: "milch", canonical: "milk", locale: "de" },
  { alias: "käse", canonical: "cheese", locale: "de" },
  { alias: "wasser", canonical: "water", locale: "de" },
  { alias: "kaffee", canonical: "coffee", locale: "de" },
  { alias: "tee", canonical: "tea", locale: "de" },
  { alias: "bier", canonical: "beer", locale: "de" },
  { alias: "wein", canonical: "wine", locale: "de" },
  { alias: "apfel", canonical: "apple", locale: "de" },
  { alias: "kartoffel", canonical: "potato", locale: "de" },
  { alias: "kartoffeln", canonical: "potato", locale: "de" },
  { alias: "pommes", canonical: "fries", locale: "de" },
  { alias: "butter", canonical: "butter", locale: "de" },
  { alias: "zucker", canonical: "sugar", locale: "de" },
  { alias: "salat", canonical: "salad", locale: "de" },
  { alias: "suppe", canonical: "soup", locale: "de" },
  { alias: "brötchen", canonical: "bread roll", locale: "de" },
  { alias: "wurst", canonical: "sausage", locale: "de" },
  { alias: "bratwurst", canonical: "sausage", locale: "de" },
  { alias: "gulasch", canonical: "goulash", locale: "de" },
  { alias: "maïsflakes", canonical: "cornflakes", locale: "de" },

  // ─── Italian (it) ───────────────────────────────────
  { alias: "pollo", canonical: "chicken", locale: "it" },
  { alias: "manzo", canonical: "beef", locale: "it" },
  { alias: "maiale", canonical: "pork", locale: "it" },
  { alias: "pesce", canonical: "fish", locale: "it" },
  { alias: "uovo", canonical: "egg", locale: "it" },
  { alias: "uova", canonical: "eggs", locale: "it" },
  { alias: "riso", canonical: "rice", locale: "it" },
  { alias: "pane", canonical: "bread", locale: "it" },
  { alias: "latte", canonical: "milk", locale: "it" },
  { alias: "formaggio", canonical: "cheese", locale: "it" },
  { alias: "acqua", canonical: "water", locale: "it" },
  { alias: "caffè", canonical: "coffee", locale: "it" },
  { alias: "birra", canonical: "beer", locale: "it" },
  { alias: "mela", canonical: "apple", locale: "it" },
  { alias: "insalata", canonical: "salad", locale: "it" },
  { alias: "zuppa", canonical: "soup", locale: "it" },
  { alias: "burro", canonical: "butter", locale: "it" },
  { alias: "zucchero", canonical: "sugar", locale: "it" },
  { alias: "gelato", canonical: "ice cream", locale: "it" },

  // ─── Portuguese (pt) ────────────────────────────────
  { alias: "frango", canonical: "chicken", locale: "pt" },
  { alias: "carne de vaca", canonical: "beef", locale: "pt" },
  { alias: "porco", canonical: "pork", locale: "pt" },
  { alias: "peixe", canonical: "fish", locale: "pt" },
  { alias: "ovo", canonical: "egg", locale: "pt" },
  { alias: "ovos", canonical: "eggs", locale: "pt" },
  { alias: "arroz", canonical: "rice", locale: "pt" },
  { alias: "pão", canonical: "bread", locale: "pt" },
  { alias: "queijo", canonical: "cheese", locale: "pt" },
  { alias: "água", canonical: "water", locale: "pt" },
  { alias: "cerveja", canonical: "beer", locale: "pt" },

  // ─── Dutch (nl) ─────────────────────────────────────
  { alias: "kip", canonical: "chicken", locale: "nl" },
  { alias: "rundvlees", canonical: "beef", locale: "nl" },
  { alias: "varkensvlees", canonical: "pork", locale: "nl" },
  { alias: "vis", canonical: "fish", locale: "nl" },
  { alias: "rijst", canonical: "rice", locale: "nl" },
  { alias: "brood", canonical: "bread", locale: "nl" },
  { alias: "melk", canonical: "milk", locale: "nl" },
  { alias: "kaas", canonical: "cheese", locale: "nl" },
  { alias: "water", canonical: "water", locale: "nl" },
  { alias: "koffie", canonical: "coffee", locale: "nl" },
  { alias: "thee", canonical: "tea", locale: "nl" },

  // ─── Hindi / Urdu (hi) ──────────────────────────────
  { alias: "chawal", canonical: "rice", locale: "hi" },
  { alias: "roti", canonical: "bread", locale: "hi" },
  { alias: "chapati", canonical: "bread", locale: "hi" },
  { alias: "doodh", canonical: "milk", locale: "hi" },
  { alias: "paneer", canonical: "cottage cheese", locale: "hi" },
  { alias: "anda", canonical: "egg", locale: "hi" },
  { alias: "murgh", canonical: "chicken", locale: "hi" },
  { alias: "gosht", canonical: "meat", locale: "hi" },
  { alias: "aloo", canonical: "potato", locale: "hi" },
  { alias: "chai", canonical: "tea", locale: "hi" },
  { alias: "lassi", canonical: "yogurt drink", locale: "hi" },
  { alias: "paratha", canonical: "bread", locale: "hi" },
  { alias: "samosa", canonical: "samosa", locale: "hi" },

  // ─── Polish (pl) ────────────────────────────────────
  { alias: "kurczak", canonical: "chicken", locale: "pl" },
  { alias: "wołowina", canonical: "beef", locale: "pl" },
  { alias: "wieprzowina", canonical: "pork", locale: "pl" },
  { alias: "ryba", canonical: "fish", locale: "pl" },
  { alias: "jajko", canonical: "egg", locale: "pl" },
  { alias: "ryż", canonical: "rice", locale: "pl" },
  { alias: "chleb", canonical: "bread", locale: "pl" },
  { alias: "mleko", canonical: "milk", locale: "pl" },
  { alias: "ser", canonical: "cheese", locale: "pl" },
  { alias: "kawa", canonical: "coffee", locale: "pl" },
  { alias: "herbata", canonical: "tea", locale: "pl" },
  { alias: "pierogi", canonical: "pierogi", locale: "pl" },
  { alias: "kiełbasa", canonical: "sausage", locale: "pl" },
  { alias: "gulasz", canonical: "goulash", locale: "pl" },

  // ─── Turkish (tr) ───────────────────────────────────
  { alias: "tavuk", canonical: "chicken", locale: "tr" },
  { alias: "et", canonical: "meat", locale: "tr" },
  { alias: "balık", canonical: "fish", locale: "tr" },
  { alias: "yumurta", canonical: "egg", locale: "tr" },
  { alias: "pirinç", canonical: "rice", locale: "tr" },
  { alias: "ekmek", canonical: "bread", locale: "tr" },
  { alias: "süt", canonical: "milk", locale: "tr" },
  { alias: "peynir", canonical: "cheese", locale: "tr" },
  { alias: "çay", canonical: "tea", locale: "tr" },
  { alias: "kahve", canonical: "coffee", locale: "tr" },
  { alias: "döner", canonical: "shawarma", locale: "tr" },
];

// ─── Lookup Index ───────────────────────────────────────────────────────────

const ALIAS_INDEX = new Map<string, string>();

for (const entry of FOOD_ALIASES) {
  ALIAS_INDEX.set(entry.alias.toLowerCase(), entry.canonical);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Translate a food name from any supported language to canonical English.
 * Returns the original input if no alias is found.
 *
 * Handles both single words and multi-word phrases.
 * Multi-word aliases are checked first (longest match wins).
 */
export function translateFoodAlias(input: string): {
  translated: string;
  wasTranslated: boolean;
} {
  const normalized = input.toLowerCase().trim();

  // 1. Try exact match
  const exact = ALIAS_INDEX.get(normalized);
  if (exact) {
    return { translated: exact, wasTranslated: true };
  }

  // 2. Try translating individual words in a multi-word input
  //    "pollo con arroz" → "chicken con rice"
  const words = normalized.split(/\s+/);
  let anyTranslated = false;
  const translatedWords = words.map((word) => {
    const alias = ALIAS_INDEX.get(word);
    if (alias) {
      anyTranslated = true;
      return alias;
    }
    return word;
  });

  if (anyTranslated) {
    return {
      translated: translatedWords.join(" "),
      wasTranslated: true,
    };
  }

  return { translated: input, wasTranslated: false };
}
