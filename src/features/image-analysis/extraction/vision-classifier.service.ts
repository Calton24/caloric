/**
 * Visual Classifier
 *
 * Classifies food images into categories using text-based heuristics.
 * When llama.rn vision model is available, this can be extended to use
 * actual visual features.
 *
 * For now, this operates purely on the user's description text.
 */

import type { VisualClassification } from "../types";

// ─── Category Rules ──────────────────────────────────────────────────────────

const CATEGORY_RULES: {
  category: string;
  patterns: RegExp[];
  isPackaged: boolean;
}[] = [
  {
    category: "crisps",
    patterns: [
      /crisps|chips|tortilla\s*chips|nachos|doritos|pringles|walkers|sensations/i,
    ],
    isPackaged: true,
  },
  {
    category: "chocolate",
    patterns: [
      /chocolate|cadbury|galaxy|kitkat|snickers|mars|twix|bounty|maltesers|lindt/i,
    ],
    isPackaged: true,
  },
  {
    category: "biscuits",
    patterns: [/biscuit|cookie|hobnob|digestive|oreo|jaffa\s*cake|mcvitie/i],
    isPackaged: true,
  },
  {
    category: "cereal",
    patterns: [
      /cereal|granola|muesli|porridge\s*oats|weetabix|cheerios|cornflakes/i,
    ],
    isPackaged: true,
  },
  {
    category: "yoghurt",
    patterns: [/yogh?urt|muller|activia|fromage\s*frais/i],
    isPackaged: true,
  },
  {
    category: "soft drink",
    patterns: [
      /coca[- ]?cola|pepsi|fanta|sprite|lucozade|ribena|7[- ]?up|energy\s*drink|red\s*bull|monster/i,
    ],
    isPackaged: true,
  },
  {
    category: "juice",
    patterns: [/juice|smoothie|tropicana|innocent/i],
    isPackaged: true,
  },
  {
    category: "protein bar",
    patterns: [/protein\s*bar|grenade|barebells|fulfil|kind\s*bar/i],
    isPackaged: true,
  },
  {
    category: "bread",
    patterns: [/\bbread\b|warburton|hovis|kingsmill/i],
    isPackaged: true,
  },
  {
    category: "ready meal",
    patterns: [/ready\s*meal|microwave|frozen\s*meal/i],
    isPackaged: true,
  },
  {
    category: "sweets",
    patterns: [/sweets|gummies|haribo|jelly\s*beans|wine\s*gums/i],
    isPackaged: true,
  },
  {
    category: "ice cream",
    patterns: [/ice\s*cream|magnum|cornetto|ben\s*&?\s*jerry|häagen/i],
    isPackaged: true,
  },
  // Plated meals
  {
    category: "chicken dish",
    patterns: [/chicken\b(?!.*\b(?:crisps|chips|flavour))/i],
    isPackaged: false,
  },
  {
    category: "pasta dish",
    patterns: [
      /pasta|spaghetti|penne|fusilli|lasagne|carbonara|bolognese|alfredo/i,
    ],
    isPackaged: false,
  },
  {
    category: "rice dish",
    patterns: [/\brice\b(?!.*cake)/i],
    isPackaged: false,
  },
  {
    category: "salad",
    patterns: [/\bsalad\b/i],
    isPackaged: false,
  },
  {
    category: "sandwich",
    patterns: [/sandwich|wrap|panini|baguette|sub\b/i],
    isPackaged: false,
  },
  {
    category: "burger",
    patterns: [/burger|cheeseburger/i],
    isPackaged: false,
  },
  {
    category: "pizza",
    patterns: [/pizza/i],
    isPackaged: false, // can be both but default to fresh
  },
  {
    category: "curry",
    patterns: [/curry|tikka|masala|korma|madras|jalfrezi|bhuna/i],
    isPackaged: false,
  },
  {
    category: "soup",
    patterns: [/\bsoup\b/i],
    isPackaged: false,
  },
  {
    category: "steak",
    patterns: [/\bsteak\b|sirloin|ribeye|fillet\b/i],
    isPackaged: false,
  },
  {
    category: "breakfast",
    patterns: [/\bfry[- ]?up\b|full\s*english|bacon\s*and\s*eggs|fry up/i],
    isPackaged: false,
  },
  {
    category: "sushi",
    patterns: [/sushi|sashimi|maki|nigiri/i],
    isPackaged: false,
  },
];

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Classify the food in the image based on text signals.
 */
export function classifyFood(text: string): VisualClassification {
  if (!text || !text.trim()) {
    return {
      category: "unknown",
      alternates: [],
      isPackaged: false,
      confidence: 0.1,
    };
  }

  const matches: {
    category: string;
    isPackaged: boolean;
    score: number;
  }[] = [];

  for (const rule of CATEGORY_RULES) {
    const matchCount = rule.patterns.filter((p) => p.test(text)).length;
    if (matchCount > 0) {
      matches.push({
        category: rule.category,
        isPackaged: rule.isPackaged,
        score: 0.3 + matchCount * 0.3,
      });
    }
  }

  if (matches.length === 0) {
    return {
      category: "food",
      alternates: [],
      isPackaged: false,
      confidence: 0.2,
    };
  }

  matches.sort((a, b) => b.score - a.score);

  return {
    category: matches[0].category,
    alternates: matches.slice(1, 4).map((m) => m.category),
    isPackaged: matches[0].isPackaged,
    confidence: Math.min(matches[0].score, 0.9),
  };
}
