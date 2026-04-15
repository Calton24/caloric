/**
 * Packaged Product Extractor
 *
 * Extracts structured product identity from text signals (user description + OCR).
 * Parses brand names, product names, flavours, and weights.
 *
 * This is the "OCR normalizer" — it takes raw text and produces
 * a clean product identity that can be searched against Open Food Facts.
 */

import type { OcrExtraction } from "../types";

// ─── Brand Database ──────────────────────────────────────────────────────────

const KNOWN_BRANDS: { pattern: RegExp; brand: string }[] = [
  // Crisps
  { pattern: /walkers?\s*sensations?/i, brand: "Walkers Sensations" },
  { pattern: /walkers/i, brand: "Walkers" },
  { pattern: /\blays\b/i, brand: "Lay's" },
  { pattern: /\bdoritos\b/i, brand: "Doritos" },
  { pattern: /\bpringles\b/i, brand: "Pringles" },
  { pattern: /\bkettle\b/i, brand: "Kettle" },
  { pattern: /\btyrrells?\b/i, brand: "Tyrrells" },
  { pattern: /\bmccoys?\b/i, brand: "McCoy's" },
  { pattern: /\bhula\s*hoops?\b/i, brand: "Hula Hoops" },
  { pattern: /\bmonster\s*munch\b/i, brand: "Monster Munch" },
  { pattern: /\bwotsits?\b/i, brand: "Wotsits" },
  { pattern: /\bquavers?\b/i, brand: "Quavers" },
  { pattern: /\bskips?\b/i, brand: "Skips" },

  // Chocolate & confectionery
  { pattern: /\bcadbury\b/i, brand: "Cadbury" },
  { pattern: /\bgalaxy\b/i, brand: "Galaxy" },
  { pattern: /\bkit\s*kat\b/i, brand: "KitKat" },
  { pattern: /\bsnickers\b/i, brand: "Snickers" },
  { pattern: /\bmars\b/i, brand: "Mars" },
  { pattern: /\btwix\b/i, brand: "Twix" },
  { pattern: /\bbounty\b/i, brand: "Bounty" },
  { pattern: /\bmaltesers?\b/i, brand: "Maltesers" },
  { pattern: /\blindt\b/i, brand: "Lindt" },
  { pattern: /\btoblerone\b/i, brand: "Toblerone" },
  { pattern: /\bferrero\b/i, brand: "Ferrero" },
  { pattern: /\bkinder\b/i, brand: "Kinder" },
  { pattern: /\bharibo\b/i, brand: "Haribo" },

  // Drinks
  { pattern: /coca[- ]?cola/i, brand: "Coca-Cola" },
  { pattern: /\bpepsi\b/i, brand: "Pepsi" },
  { pattern: /\bfanta\b/i, brand: "Fanta" },
  { pattern: /\bsprite\b/i, brand: "Sprite" },
  { pattern: /\blucozade\b/i, brand: "Lucozade" },
  { pattern: /\bribena\b/i, brand: "Ribena" },
  { pattern: /\binnocent\b/i, brand: "Innocent" },
  { pattern: /\btropicana\b/i, brand: "Tropicana" },
  { pattern: /\bred\s*bull\b/i, brand: "Red Bull" },
  { pattern: /\bmonster\s*energy\b/i, brand: "Monster Energy" },

  // Cereal & breakfast
  { pattern: /\bkellogg'?s?\b/i, brand: "Kellogg's" },
  { pattern: /\bweetabix\b/i, brand: "Weetabix" },
  { pattern: /\bcheerios\b/i, brand: "Cheerios" },
  { pattern: /\bspecial\s*k\b/i, brand: "Special K" },
  { pattern: /\bcrunchy\s*nut\b/i, brand: "Crunchy Nut" },
  { pattern: /\bshreddies\b/i, brand: "Shreddies" },
  { pattern: /\balpen\b/i, brand: "Alpen" },
  { pattern: /\bjordan'?s?\b/i, brand: "Jordans" },

  // Sauces & condiments
  { pattern: /\bheinz\b/i, brand: "Heinz" },
  { pattern: /\bhp\s*sauce\b/i, brand: "HP" },
  { pattern: /\bnandos?\b/i, brand: "Nando's" },

  // Dairy
  { pattern: /\bmuller\b/i, brand: "Müller" },
  { pattern: /\byeo\s*valley\b/i, brand: "Yeo Valley" },
  { pattern: /\bactivia\b/i, brand: "Activia" },
  { pattern: /\bdanone\b/i, brand: "Danone" },
  { pattern: /\bcathedral\s*city\b/i, brand: "Cathedral City" },

  // Biscuits
  { pattern: /\bmcvitie'?s?\b/i, brand: "McVitie's" },
  { pattern: /\boreo\b/i, brand: "Oreo" },
  { pattern: /\bhobnobs?\b/i, brand: "Hobnobs" },
  { pattern: /\bdigestives?\b/i, brand: "McVitie's Digestives" },

  // Ready meals & frozen
  { pattern: /\bbird'?s?\s*eye\b/i, brand: "Birds Eye" },
  { pattern: /\bquorn\b/i, brand: "Quorn" },
  { pattern: /\brichmond\b/i, brand: "Richmond" },

  // Bread
  { pattern: /\bwarburton'?s?\b/i, brand: "Warburtons" },
  { pattern: /\bhovis\b/i, brand: "Hovis" },
  { pattern: /\bkingsmill\b/i, brand: "Kingsmill" },

  // Protein / health
  { pattern: /\bgrenade\b/i, brand: "Grenade" },
  { pattern: /\bmy\s*protein\b/i, brand: "MyProtein" },
  { pattern: /\bhuel\b/i, brand: "Huel" },
  { pattern: /\bnaked\b/i, brand: "Naked" },
];

// ─── Flavour patterns ────────────────────────────────────────────────────────

const FLAVOUR_PATTERNS: RegExp[] = [
  // Crisp flavours
  /\b(salt\s*(?:&|and)\s*vinegar)\b/i,
  /\b(cheese\s*(?:&|and)\s*onion)\b/i,
  /\b(ready\s*salted)\b/i,
  /\b(prawn\s*cocktail)\b/i,
  /\b(smoky?\s*bacon)\b/i,
  /\b(sour\s*cream(?:\s*(?:&|and)\s*(?:onion|chive))?)\b/i,
  /\b(thai\s*sweet\s*chilli?)\b/i,
  /\b(sweet\s*chilli?)\b/i,
  /\b(bbq|barbecue)\b/i,
  /\b(paprika)\b/i,
  /\b(lime\s*(?:&|and)\s*chilli?)\b/i,
  /\b(sea\s*salt(?:\s*(?:&|and)\s*(?:balsamic|pepper|vinegar))?)\b/i,
  /\b(roast(?:ed)?\s*chicken)\b/i,

  // Chocolate flavours
  /\b(milk\s*chocolate)\b/i,
  /\b(dark\s*chocolate)\b/i,
  /\b(white\s*chocolate)\b/i,
  /\b(caramel)\b/i,
  /\b(salted\s*caramel)\b/i,
  /\b(cookies?\s*(?:&|and)\s*cream)\b/i,
  /\b(peanut\s*butter)\b/i,
  /\b(mint)\b/i,
  /\b(orange)\b/i,
  /\b(hazelnut)\b/i,

  // General
  /\b(original)\b/i,
  /\b(classic)\b/i,
  /\b(strawberry)\b/i,
  /\b(vanilla)\b/i,
  /\b(raspberry)\b/i,
  /\b(blueberry)\b/i,
  /\b(mango)\b/i,
  /\b(tropical)\b/i,
  /\b(mixed\s*berry)\b/i,
  /\b(honey)\b/i,
];

// ─── Weight extraction ──────────────────────────────────────────────────────

const WEIGHT_PATTERNS = [
  /(\d+(?:\.\d+)?)\s*kg\b/i,
  /(\d+(?:\.\d+)?)\s*g\b/i,
  /(\d+(?:\.\d+)?)\s*ml\b/i,
  /(\d+(?:\.\d+)?)\s*cl\b/i,
  /(\d+(?:\.\d+)?)\s*l\b/i,
  /(\d+(?:\.\d+)?)\s*oz\b/i,
];

function extractWeight(text: string): { text: string; grams: number } | null {
  for (const pattern of WEIGHT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[0].replace(match[1], "").trim().toLowerCase();

      let grams: number;
      switch (unit) {
        case "kg":
          grams = value * 1000;
          break;
        case "g":
          grams = value;
          break;
        case "ml":
          grams = value; // approximate
          break;
        case "cl":
          grams = value * 10;
          break;
        case "l":
          grams = value * 1000;
          break;
        case "oz":
          grams = value * 28.35;
          break;
        default:
          grams = value;
      }

      return { text: match[0], grams: Math.round(grams) };
    }
  }
  return null;
}

// ─── Nutrition label extraction ─────────────────────────────────────────────

function extractNutritionLabel(
  text: string
): Partial<
  import("../../nutrition/matching/matching.types").NutrientProfile
> | null {
  const calories =
    text.match(/(\d+)\s*k?cal(?:ories)?/i)?.[1] ??
    text.match(/calories?\s*(\d+)/i)?.[1] ??
    text.match(/energy\s*(\d+)/i)?.[1];
  const protein = text.match(/protein\s*(\d+(?:\.\d+)?)\s*g/i)?.[1];
  const carbs =
    text.match(/carbohydrate\s*(\d+(?:\.\d+)?)\s*g/i)?.[1] ??
    text.match(/carbs?\s*(\d+(?:\.\d+)?)\s*g/i)?.[1];
  const fat = text.match(/fat\s*(\d+(?:\.\d+)?)\s*g/i)?.[1];

  if (!calories && !protein && !carbs && !fat) return null;

  return {
    ...(calories ? { calories: parseInt(calories, 10) } : {}),
    ...(protein ? { protein: parseFloat(protein) } : {}),
    ...(carbs ? { carbs: parseFloat(carbs) } : {}),
    ...(fat ? { fat: parseFloat(fat) } : {}),
  };
}

// ─── Product type patterns ─────────────────────────────────[]───────────

const PRODUCT_TYPE_PATTERNS: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /\b(potato\s*)?crisps\b/i, type: "crisps" },
  { pattern: /\bchips\b/i, type: "chips" },
  { pattern: /\bchocolate\s*bar\b/i, type: "chocolate bar" },
  { pattern: /\bchocolate\b/i, type: "chocolate" },
  { pattern: /\bbiscuits?\b/i, type: "biscuits" },
  { pattern: /\bcookies?\b/i, type: "cookies" },
  { pattern: /\bcereal\b/i, type: "cereal" },
  { pattern: /\bgranola\b/i, type: "granola" },
  { pattern: /\byogh?urt\b/i, type: "yoghurt" },
  { pattern: /\bjuice\b/i, type: "juice" },
  { pattern: /\bsmoothie\b/i, type: "smoothie" },
  { pattern: /\bread[y-]\s*meal\b/i, type: "ready meal" },
  { pattern: /\bprotein\s*bar\b/i, type: "protein bar" },
  { pattern: /\benergy\s*bar\b/i, type: "energy bar" },
  { pattern: /\bflapjack\b/i, type: "flapjack" },
  { pattern: /\bbread\b/i, type: "bread" },
  { pattern: /\bsweets?\b/i, type: "sweets" },
  { pattern: /\bgummies?\b/i, type: "gummies" },
  { pattern: /\bice\s*cream\b/i, type: "ice cream" },
  { pattern: /\bpizza\b/i, type: "pizza" },
  { pattern: /\bpasta\s*sauce\b/i, type: "pasta sauce" },
  { pattern: /\bsoup\b/i, type: "soup" },
  { pattern: /\bbeans\b/i, type: "beans" },
  { pattern: /\bnoodle/i, type: "noodles" },
  { pattern: /\brice\s*cake/i, type: "rice cakes" },
  { pattern: /\boat\s*cake/i, type: "oat cakes" },
  { pattern: /\bcrackers?\b/i, type: "crackers" },
  { pattern: /\bpopcorn\b/i, type: "popcorn" },
  { pattern: /\bnuts?\b/i, type: "nuts" },
  { pattern: /\btrail\s*mix\b/i, type: "trail mix" },
  { pattern: /\bdried?\s*fruit\b/i, type: "dried fruit" },
  { pattern: /\bcake\b/i, type: "cake" },
  { pattern: /\bmuffin\b/i, type: "muffin" },
  { pattern: /\bcroissant\b/i, type: "croissant" },
  { pattern: /\bpastry\b/i, type: "pastry" },
];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Extract structured product identity from text input.
 *
 * @param text  User description, OCR text, or combined text
 * @returns     OcrExtraction with parsed brand, product, weight etc.
 */
export function extractProductInfo(text: string): OcrExtraction {
  if (!text || !text.trim()) {
    return {
      rawTokens: [],
      brand: null,
      productName: null,
      flavour: null,
      weightText: null,
      weightGrams: null,
      nutritionLabel: null,
      confidence: 0,
    };
  }

  const rawTokens = text
    .toLowerCase()
    .split(/[\s,;]+/)
    .filter((t) => t.length > 1);

  // Extract brand
  let brand: string | null = null;
  for (const entry of KNOWN_BRANDS) {
    if (entry.pattern.test(text)) {
      brand = entry.brand;
      break;
    }
  }

  // Extract flavour
  let flavour: string | null = null;
  for (const pattern of FLAVOUR_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      flavour = match[1];
      break;
    }
  }

  // Extract product type
  let productType: string | null = null;
  for (const entry of PRODUCT_TYPE_PATTERNS) {
    if (entry.pattern.test(text)) {
      productType = entry.type;
      break;
    }
  }

  // Extract weight
  const weight = extractWeight(text);

  // Extract nutrition label
  const nutritionLabel = extractNutritionLabel(text);

  // Build product name
  let productName: string | null = null;
  const parts = [brand, flavour, productType].filter(Boolean);
  if (parts.length > 0) {
    productName = parts.join(" ");
  } else {
    // Use the full text as product name if we couldn't parse structure
    productName = text.trim();
  }

  // Calculate confidence
  let confidence = 0.3; // baseline for having text
  if (brand) confidence += 0.25;
  if (flavour) confidence += 0.15;
  if (productType) confidence += 0.15;
  if (weight) confidence += 0.1;
  if (nutritionLabel) confidence += 0.15;
  confidence = Math.min(confidence, 1.0);

  return {
    rawTokens,
    brand,
    productName,
    flavour,
    weightText: weight?.text ?? null,
    weightGrams: weight?.grams ?? null,
    nutritionLabel,
    confidence,
  };
}

/**
 * Build an Open Food Facts search query from extracted product info.
 * Prioritizes brand + product name + flavour for best OFF match.
 */
export function buildSearchQuery(extraction: OcrExtraction): string {
  const parts: string[] = [];

  if (extraction.brand) parts.push(extraction.brand);
  if (extraction.flavour) parts.push(extraction.flavour);

  // Add product type from the product name if not redundant with brand
  if (extraction.productName) {
    const pn = extraction.productName.toLowerCase();
    const alreadyHas = parts.some(
      (p) => pn.includes(p.toLowerCase()) || p.toLowerCase().includes(pn)
    );
    if (!alreadyHas) parts.push(extraction.productName);
  }

  if (parts.length === 0 && extraction.rawTokens.length > 0) {
    return extraction.rawTokens.slice(0, 5).join(" ");
  }

  return parts.join(" ");
}
