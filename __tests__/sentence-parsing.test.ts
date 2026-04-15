/**
 * Conversational Sentence Parsing — Comprehensive Test Suite
 *
 * Tests the full parsing pipeline (transcript cleaner → phrase grouper → regex parser)
 * against a wide range of natural speech patterns people use when logging food.
 *
 * Architecture:
 *   - Data-driven: each test case is a { input, expected } object
 *   - Grouped by PATTERN TYPE, not by specific sentence
 *   - Expected output specifies { name, qty?, unit?, prep? } per item
 *   - Pipeline helper runs all three stages and returns parsed items
 *
 * To add a new test case, just append to the appropriate category array.
 */

import type { ParsedFoodItem } from "../src/features/nutrition/parsing/food-candidate.schema";
import { groupFoodPhrases } from "../src/features/nutrition/parsing/phrase-grouper";
import { parseWithRegex } from "../src/features/nutrition/parsing/regex-parser";
import { cleanTranscript } from "../src/features/nutrition/parsing/transcript-cleaner";

// ─── Pipeline Helper ────────────────────────────────────────────────────────

interface ExpectedItem {
  name: string;
  qty?: number;
  unit?: string;
  prep?: string | null;
}

interface SentenceTestCase {
  input: string;
  expected: ExpectedItem[];
  /** Optional: "voice" | "text" — defaults to "voice" */
  source?: "voice" | "text";
}

/**
 * Run a raw sentence through the full pipeline:
 *   cleanTranscript → groupFoodPhrases → parseWithRegex
 */
function parseSentence(
  input: string,
  source: "voice" | "text" = "voice"
): ParsedFoodItem[] {
  const cleaned = cleanTranscript(input, source);
  const groups = groupFoodPhrases(cleaned.cleaned);
  const toParse = groups.map((g) => g.text).join(", ");
  return parseWithRegex(toParse);
}

/**
 * Assert that parsed output contains the expected items by name,
 * plus optional qty/unit/prep checks.
 */
function expectItems(parsed: ParsedFoodItem[], expected: ExpectedItem[]) {
  expect(parsed).toHaveLength(expected.length);

  for (const exp of expected) {
    const match = parsed.find(
      (p) => p.name.toLowerCase() === exp.name.toLowerCase()
    );
    expect(match).toBeDefined();
    if (!match) continue;

    if (exp.qty !== undefined) {
      expect(match.quantity).toBe(exp.qty);
    }
    if (exp.unit !== undefined) {
      expect(match.unit).toBe(exp.unit);
    }
    if (exp.prep !== undefined) {
      expect(match.preparation).toBe(exp.prep);
    }
  }
}

// ─── Test Categories ────────────────────────────────────────────────────────

// Category 1: Simple "I had X" leading verbs
const LEADING_VERB_CASES: SentenceTestCase[] = [
  {
    input: "I had two eggs",
    expected: [{ name: "eggs", qty: 2 }],
  },
  {
    input: "ate a banana",
    expected: [{ name: "banana", qty: 1 }],
  },
  {
    input: "I ate some chicken",
    expected: [{ name: "chicken" }],
  },
  {
    input: "had a bowl of oatmeal",
    expected: [{ name: "oatmeal", unit: "bowl" }],
  },
  {
    input: "just had some toast",
    expected: [{ name: "toast" }],
  },
  {
    input: "I just ate a bagel",
    expected: [{ name: "bagel" }],
  },
  {
    input: "grabbed a protein bar",
    expected: [{ name: "protein bar" }],
  },
  {
    input: "I drank a glass of milk",
    expected: [{ name: "milk", unit: "glass" }],
  },
  {
    input: "made some scrambled eggs",
    expected: [{ name: "scrambled eggs" }],
  },
  {
    input: "got a cup of coffee",
    expected: [{ name: "coffee", unit: "cup" }],
  },
  // New production-grade leading verbs
  {
    input: "finished a plate of pasta",
    expected: [{ name: "pasta", unit: "plate" }],
  },
  {
    input: "ordered a chicken sandwich",
    expected: [{ name: "chicken sandwich" }],
  },
  {
    input: "tried the greek salad",
    expected: [{ name: "greek salad" }],
  },
  {
    input: "I cooked some fried rice",
    expected: [{ name: "fried rice" }],
  },
  {
    input: "picked up a burrito",
    expected: [{ name: "burrito" }],
  },
  {
    input: "prepared some overnight oats",
    expected: [{ name: "overnight oats" }],
  },
  {
    input: "sipped a latte",
    expected: [{ name: "latte" }],
  },
];

// Category 2: "and" conjunctions — multiple items
const AND_CONJUNCTION_CASES: SentenceTestCase[] = [
  {
    input: "eggs and toast",
    expected: [{ name: "eggs" }, { name: "toast" }],
  },
  {
    input: "I had eggs and bacon",
    expected: [{ name: "eggs" }, { name: "bacon" }],
  },
  {
    input: "two eggs and toast and coffee",
    expected: [{ name: "eggs", qty: 2 }, { name: "toast" }, { name: "coffee" }],
  },
  {
    input: "chicken and rice and beans",
    expected: [{ name: "chicken" }, { name: "rice" }, { name: "beans" }],
  },
  {
    input: "had a sandwich and a banana",
    expected: [{ name: "sandwich" }, { name: "banana" }],
  },
  {
    input: "yogurt and granola",
    expected: [{ name: "yogurt" }, { name: "granola" }],
  },
  {
    input: "I had pasta and salad",
    expected: [{ name: "pasta" }, { name: "salad" }],
  },
  {
    input: "ate rice and chicken and broccoli",
    expected: [{ name: "rice" }, { name: "chicken" }, { name: "broccoli" }],
  },
  // New production-grade conjunction cases
  {
    input: "steak and potatoes",
    expected: [{ name: "steak" }, { name: "potatoes" }],
  },
  {
    input: "pizza and a soda",
    expected: [{ name: "pizza" }, { name: "soda" }],
  },
  {
    input: "oatmeal and coffee and a banana",
    expected: [{ name: "oatmeal" }, { name: "coffee" }, { name: "banana" }],
  },
  {
    input: "salmon and asparagus and brown rice",
    expected: [
      { name: "salmon" },
      { name: "asparagus" },
      { name: "brown rice" },
    ],
  },
];

// Category 3: "with" clauses — prep (stays attached) vs separate items
const WITH_CLAUSE_CASES: SentenceTestCase[] = [
  {
    input: "toast with butter",
    expected: [{ name: "toast", prep: "with butter" }],
  },
  {
    input: "oatmeal with honey",
    expected: [{ name: "oatmeal", prep: "with honey" }],
  },
  {
    input: "pancakes with syrup",
    expected: [{ name: "pancakes", prep: "with syrup" }],
  },
  {
    input: "rice with soy sauce",
    expected: [{ name: "rice", prep: "with soy sauce" }],
  },
  {
    input: "pasta with cheese",
    expected: [{ name: "pasta" }, { name: "cheese" }],
  },
  {
    input: "salad with chicken",
    expected: [{ name: "salad" }, { name: "chicken" }],
  },
  {
    input: "oatmeal with banana",
    expected: [{ name: "oatmeal" }, { name: "banana" }],
  },
  {
    input: "yogurt with strawberries",
    expected: [{ name: "yogurt" }, { name: "strawberries" }],
  },
  {
    input: "toast with avocado",
    expected: [{ name: "toast" }, { name: "avocado" }],
  },
  // New production-grade with-clause cases
  {
    input: "rice with lemon",
    expected: [{ name: "rice", prep: "with lemon" }],
  },
  {
    input: "chicken with garlic",
    expected: [{ name: "chicken", prep: "with garlic" }],
  },
  {
    input: "salad with ranch dressing",
    expected: [{ name: "salad" }, { name: "ranch dressing" }],
  },
  {
    input: "yogurt with granola",
    expected: [{ name: "yogurt" }, { name: "granola" }],
  },
  {
    input: "oatmeal with blueberries",
    expected: [{ name: "oatmeal" }, { name: "blueberries" }],
  },
  {
    input: "steak with mushrooms",
    expected: [{ name: "steak" }, { name: "mushrooms" }],
  },
  {
    input: "pancakes with butter",
    expected: [{ name: "pancakes", prep: "with butter" }],
  },
  {
    input: "pasta with pesto",
    expected: [{ name: "pasta", prep: "with pesto" }],
  },
];

// Category 4: Compound foods that must NOT split
const COMPOUND_FOOD_CASES: SentenceTestCase[] = [
  {
    input: "peanut butter",
    expected: [{ name: "peanut butter" }],
  },
  {
    input: "I had some fried rice",
    expected: [{ name: "fried rice" }],
  },
  {
    input: "ate a protein shake",
    expected: [{ name: "protein shake" }],
  },
  {
    input: "chicken salad",
    expected: [{ name: "chicken salad" }],
  },
  {
    input: "had ice cream",
    expected: [{ name: "ice cream" }],
  },
  {
    input: "scrambled eggs and toast",
    expected: [{ name: "scrambled eggs" }, { name: "toast" }],
  },
  {
    input: "french toast and bacon",
    expected: [{ name: "french toast" }, { name: "bacon" }],
  },
  {
    input: "sweet potato and chicken",
    expected: [{ name: "sweet potato" }, { name: "chicken" }],
  },
  {
    input: "had baked beans on toast",
    expected: [{ name: "baked beans" }, { name: "toast" }],
  },
  {
    input: "olive oil dressing",
    expected: [{ name: "olive oil dressing" }],
  },
  // New production-grade compound food cases
  {
    input: "had some brown rice",
    expected: [{ name: "brown rice" }],
  },
  {
    input: "greek yogurt",
    expected: [{ name: "greek yogurt" }],
  },
  {
    input: "almond milk",
    expected: [{ name: "almond milk" }],
  },
  {
    input: "overnight oats",
    expected: [{ name: "overnight oats" }],
  },
  {
    input: "ate a granola bar",
    expected: [{ name: "granola bar" }],
  },
  {
    input: "chicken noodle soup",
    expected: [{ name: "chicken noodle soup" }],
  },
  {
    input: "had some black beans and brown rice",
    expected: [{ name: "black beans" }, { name: "brown rice" }],
  },
  {
    input: "orange juice and toast",
    expected: [{ name: "orange juice" }, { name: "toast" }],
  },
  {
    input: "cream cheese and a bagel",
    expected: [{ name: "cream cheese" }, { name: "bagel" }],
  },
  {
    input: "avocado toast and an iced coffee",
    expected: [{ name: "avocado toast" }, { name: "iced coffee" }],
  },
  {
    input: "had a breakfast burrito",
    expected: [{ name: "breakfast burrito" }],
  },
  {
    input: "mac and cheese",
    expected: [{ name: "mac and cheese" }],
  },
  {
    input: "grilled cheese and tomato soup",
    expected: [{ name: "grilled cheese" }, { name: "tomato soup" }],
  },
  {
    input: "pad thai",
    expected: [{ name: "pad thai" }],
  },
];

// Category 5: Quantities and units
const QUANTITY_CASES: SentenceTestCase[] = [
  {
    input: "three eggs",
    expected: [{ name: "eggs", qty: 3 }],
  },
  {
    input: "2 slices of toast",
    expected: [{ name: "toast", qty: 2, unit: "slice" }],
  },
  {
    input: "a cup of coffee",
    expected: [{ name: "coffee", qty: 1, unit: "cup" }],
  },
  {
    input: "two bananas and an apple",
    expected: [
      { name: "bananas", qty: 2 },
      { name: "apple", qty: 1 },
    ],
  },
  {
    input: "half a cup of rice",
    expected: [{ name: "rice", qty: 0.5, unit: "cup" }],
  },
  {
    input: "5 chicken wings",
    expected: [{ name: "chicken wings", qty: 5 }],
  },
  {
    input: "a bowl of soup",
    expected: [{ name: "soup", qty: 1, unit: "bowl" }],
  },
  // New production-grade quantity cases
  {
    input: "a dozen eggs",
    expected: [{ name: "eggs", qty: 12 }],
  },
  {
    input: "couple eggs and toast",
    expected: [{ name: "eggs", qty: 2 }, { name: "toast" }],
  },
  {
    input: "few slices of pizza",
    expected: [{ name: "pizza", qty: 3, unit: "slice" }],
  },
  {
    input: "a tablespoon of peanut butter",
    expected: [{ name: "peanut butter", qty: 1, unit: "tablespoon" }],
  },
  {
    input: "2 scoops of protein powder",
    expected: [{ name: "protein powder", qty: 2, unit: "scoop" }],
  },
  {
    input: "3 pieces of chicken",
    expected: [{ name: "chicken", qty: 3, unit: "piece" }],
  },
  {
    input: "a can of tuna",
    expected: [{ name: "tuna", qty: 1, unit: "can" }],
  },
  {
    input: "a bottle of water",
    expected: [{ name: "water", qty: 1, unit: "bottle" }],
  },
  {
    input: "1.5 cups of oatmeal",
    expected: [{ name: "oatmeal", qty: 1.5, unit: "cup" }],
  },
  {
    input: "a handful of almonds",
    expected: [{ name: "almonds", qty: 1, unit: "handful" }],
  },
];

// Category 6: Conversational "filler" sentences (ASR noise)
const FILLER_NOISE_CASES: SentenceTestCase[] = [
  {
    input: "uh I had like two eggs and um toast",
    expected: [{ name: "eggs", qty: 2 }, { name: "toast" }],
  },
  {
    input: "so yeah I ate a banana",
    expected: [{ name: "banana" }],
  },
  {
    input: "basically I just had some yogurt",
    expected: [{ name: "yogurt" }],
  },
  {
    input: "um um like a chicken sandwich",
    expected: [{ name: "chicken sandwich" }],
  },
  {
    input: "I I had eggs",
    expected: [{ name: "eggs" }],
  },
  // New production-grade filler cases
  {
    input: "okay so I had like a salad and um some chicken",
    expected: [{ name: "salad" }, { name: "chicken" }],
  },
  {
    input: "I think I had a bowl of oatmeal",
    expected: [{ name: "oatmeal", unit: "bowl" }],
  },
  {
    input: "honestly I just ate like three tacos",
    expected: [{ name: "tacos", qty: 3 }],
  },
  {
    input: "well I kind of had a burger and fries",
    expected: [{ name: "burger" }, { name: "fries" }],
  },
  {
    input: "uh let me think um I had eggs and toast",
    expected: [{ name: "eggs" }, { name: "toast" }],
  },
];

// Category 7: "then" / "also" / re-verbing mid-sentence
const MID_SENTENCE_VERB_CASES: SentenceTestCase[] = [
  {
    input: "I had eggs and then toast",
    expected: [{ name: "eggs" }, { name: "toast" }],
  },
  {
    input: "eggs and also a banana",
    expected: [{ name: "eggs" }, { name: "banana" }],
  },
  {
    input: "I had eggs I had a coffee",
    expected: [{ name: "eggs" }, { name: "coffee" }],
  },
  {
    input: "ate chicken then I had rice",
    expected: [{ name: "chicken" }, { name: "rice" }],
  },
  {
    input: "had a bagel also had coffee",
    expected: [{ name: "bagel" }, { name: "coffee" }],
  },
  // New production-grade mid-sentence verb cases
  {
    input: "had a salad along with some bread",
    expected: [{ name: "salad" }, { name: "bread" }],
  },
  {
    input: "ate some pasta as well as a salad",
    expected: [{ name: "pasta" }, { name: "salad" }],
  },
  {
    input: "had eggs followed by toast and coffee",
    expected: [{ name: "eggs" }, { name: "toast" }, { name: "coffee" }],
  },
  {
    input: "oatmeal plus a banana",
    expected: [{ name: "oatmeal" }, { name: "banana" }],
  },
  {
    input: "I also had a protein shake",
    expected: [{ name: "protein shake" }],
  },
];

// Category 8: Full conversational sentences (multi-item, natural speech)
const FULL_SENTENCE_CASES: SentenceTestCase[] = [
  {
    input: "i had two eggs and toast with butter",
    expected: [
      { name: "eggs", qty: 2 },
      { name: "toast", prep: "with butter" },
    ],
  },
  {
    input: "Just ate a chicken salad with avocado with olive oil dressing",
    expected: [
      { name: "chicken salad" },
      { name: "avocado" },
      { name: "olive oil dressing" },
    ],
  },
  {
    input: "had a protein shake with a banana and peanut butter",
    expected: [
      { name: "protein shake" },
      { name: "banana" },
      { name: "peanut butter" },
    ],
  },
  {
    input: "for breakfast I had oatmeal with honey and a banana",
    expected: [{ name: "oatmeal", prep: "with honey" }, { name: "banana" }],
  },
  {
    input: "I ate a bowl of rice and chicken with soy sauce",
    expected: [
      { name: "rice", unit: "bowl" },
      { name: "chicken", prep: "with soy sauce" },
    ],
  },
  {
    input: "had scrambled eggs bacon and toast",
    expected: [
      { name: "scrambled eggs" },
      { name: "bacon" },
      { name: "toast" },
    ],
  },
  {
    input: "I grabbed a coffee and a sandwich",
    expected: [{ name: "coffee" }, { name: "sandwich" }],
  },
  {
    input:
      "just ate two pieces of toast with butter and a glass of orange juice",
    expected: [
      { name: "toast", qty: 2, unit: "piece", prep: "with butter" },
      { name: "orange juice", unit: "glass" },
    ],
  },
  {
    input: "rice and beans and a banana",
    expected: [{ name: "rice" }, { name: "beans" }, { name: "banana" }],
  },
  {
    input: "I had a steak with a salad and bread",
    expected: [{ name: "steak" }, { name: "salad" }, { name: "bread" }],
  },
  // New production-grade full sentence cases
  {
    input: "I had greek yogurt with granola and blueberries",
    expected: [
      { name: "greek yogurt" },
      { name: "granola" },
      { name: "blueberries" },
    ],
  },
  {
    input: "grabbed a turkey sandwich and a cup of coffee",
    expected: [{ name: "turkey sandwich" }, { name: "coffee", unit: "cup" }],
  },
  {
    input: "for dinner I had grilled salmon and asparagus and brown rice",
    expected: [
      { name: "grilled salmon" },
      { name: "asparagus" },
      { name: "brown rice" },
    ],
  },
  {
    input: "made a smoothie with banana and peanut butter and almond milk",
    expected: [
      { name: "smoothie" },
      { name: "banana" },
      { name: "peanut butter" },
      { name: "almond milk" },
    ],
  },
  {
    input: "had two tacos and a side of black beans",
    expected: [{ name: "tacos", qty: 2 }, { name: "black beans" }],
  },
  {
    input: "I ate a bowl of chicken noodle soup and crackers",
    expected: [
      { name: "chicken noodle soup", unit: "bowl" },
      { name: "crackers" },
    ],
  },
  {
    input:
      "for brunch I had avocado toast and two scrambled eggs and orange juice",
    expected: [
      { name: "avocado toast" },
      { name: "scrambled eggs", qty: 2 },
      { name: "orange juice" },
    ],
  },
];

// Category 9: Text input (manual — no ASR cleanup)
const TEXT_INPUT_CASES: SentenceTestCase[] = [
  {
    input: "2 eggs, toast, coffee",
    source: "text",
    expected: [{ name: "eggs", qty: 2 }, { name: "toast" }, { name: "coffee" }],
  },
  {
    input: "chicken salad, avocado, olive oil dressing",
    source: "text",
    expected: [
      { name: "chicken salad" },
      { name: "avocado" },
      { name: "olive oil dressing" },
    ],
  },
  {
    input: "protein shake & banana & peanut butter",
    source: "text",
    expected: [
      { name: "protein shake" },
      { name: "banana" },
      { name: "peanut butter" },
    ],
  },
  {
    input: "bowl of oatmeal, 2 eggs, toast with butter",
    source: "text",
    expected: [
      { name: "oatmeal", unit: "bowl" },
      { name: "eggs", qty: 2 },
      { name: "toast", prep: "with butter" },
    ],
  },
  // New production-grade text input cases
  {
    input: "grilled chicken breast, brown rice, broccoli",
    source: "text",
    expected: [
      { name: "grilled chicken breast" },
      { name: "brown rice" },
      { name: "broccoli" },
    ],
  },
  {
    input: "1 banana, 2 tbsp peanut butter, 1 cup almond milk",
    source: "text",
    expected: [
      { name: "banana", qty: 1 },
      { name: "peanut butter", qty: 2, unit: "tablespoon" },
      { name: "almond milk", qty: 1, unit: "cup" },
    ],
  },
  {
    input: "greek yogurt, granola, strawberries, honey",
    source: "text",
    expected: [
      { name: "greek yogurt" },
      { name: "granola" },
      { name: "strawberries" },
      { name: "honey" },
    ],
  },
  {
    input: "salmon, sweet potato, asparagus",
    source: "text",
    expected: [
      { name: "salmon" },
      { name: "sweet potato" },
      { name: "asparagus" },
    ],
  },
];

// Category 10: "for meal" prefixes
const MEAL_PREFIX_CASES: SentenceTestCase[] = [
  {
    input: "for lunch I had chicken and rice",
    expected: [{ name: "chicken" }, { name: "rice" }],
  },
  {
    input: "for breakfast I ate two eggs and toast",
    expected: [{ name: "eggs", qty: 2 }, { name: "toast" }],
  },
  {
    input: "for dinner I had pasta and salad",
    expected: [{ name: "pasta" }, { name: "salad" }],
  },
  {
    input: "for snack I had a banana",
    expected: [{ name: "banana" }],
  },
  // New production-grade meal prefix cases
  {
    input: "for brunch I had french toast and bacon",
    expected: [{ name: "french toast" }, { name: "bacon" }],
  },
  {
    input: "for my morning snack I had a granola bar",
    expected: [{ name: "granola bar" }],
  },
];

// Category 11: Single items (no splitting needed)
const SINGLE_ITEM_CASES: SentenceTestCase[] = [
  {
    input: "banana",
    expected: [{ name: "banana" }],
  },
  {
    input: "coffee",
    expected: [{ name: "coffee" }],
  },
  {
    input: "a burger",
    expected: [{ name: "burger" }],
  },
  {
    input: "protein shake",
    expected: [{ name: "protein shake" }],
  },
  {
    input: "3 eggs",
    expected: [{ name: "eggs", qty: 3 }],
  },
  // New production-grade single items
  {
    input: "greek yogurt",
    expected: [{ name: "greek yogurt" }],
  },
  {
    input: "a croissant",
    expected: [{ name: "croissant" }],
  },
  {
    input: "overnight oats",
    expected: [{ name: "overnight oats" }],
  },
  {
    input: "iced coffee",
    expected: [{ name: "iced coffee" }],
  },
  {
    input: "a handful of almonds",
    expected: [{ name: "almonds", unit: "handful" }],
  },
];

// Category 12: Edge cases
const EDGE_CASES: SentenceTestCase[] = [
  {
    input: "",
    source: "voice",
    expected: [],
  },
  {
    input: "and",
    expected: [],
  },
  {
    input: "   eggs   ",
    expected: [{ name: "eggs" }],
  },
  {
    input: "EGGS AND TOAST",
    expected: [{ name: "eggs" }, { name: "toast" }],
  },
  // New production-grade edge cases
  {
    input: ",,, eggs ,,, toast ,,,",
    source: "text",
    expected: [{ name: "eggs" }, { name: "toast" }],
  },
  {
    input: "um uh er",
    expected: [],
  },
  {
    input: "I had",
    expected: [],
  },
  {
    input: "the",
    expected: [],
  },
];

// ─── NEW CATEGORY 13: Contractions and informal speech ──────────────────────

const CONTRACTION_CASES: SentenceTestCase[] = [
  {
    input: "I've had two eggs and toast",
    expected: [{ name: "eggs", qty: 2 }, { name: "toast" }],
  },
  {
    input: "I've had a banana",
    expected: [{ name: "banana" }],
  },
  {
    input: "I've eaten some chicken and rice",
    expected: [{ name: "chicken" }, { name: "rice" }],
  },
];

// ─── NEW CATEGORY 14: International / ethnic foods ──────────────────────────

const INTERNATIONAL_FOOD_CASES: SentenceTestCase[] = [
  {
    input: "had some pad thai",
    expected: [{ name: "pad thai" }],
  },
  {
    input: "I ate sushi and miso soup",
    expected: [{ name: "sushi" }, { name: "miso soup" }],
  },
  {
    input: "had a burrito bowl with rice and chicken",
    expected: [{ name: "burrito bowl" }, { name: "rice" }, { name: "chicken" }],
  },
  {
    input: "chicken tikka masala and rice",
    expected: [{ name: "chicken tikka masala" }, { name: "rice" }],
  },
  {
    input: "two fish tacos and black beans",
    expected: [{ name: "fish tacos", qty: 2 }, { name: "black beans" }],
  },
  {
    input: "had ramen and an egg roll",
    expected: [{ name: "ramen" }, { name: "egg roll" }],
  },
];

// ─── NEW CATEGORY 15: Drinks (various) ─────────────────────────────────────

const DRINK_CASES: SentenceTestCase[] = [
  {
    input: "had a glass of orange juice",
    expected: [{ name: "orange juice", unit: "glass" }],
  },
  {
    input: "drank a protein shake and a bottle of water",
    expected: [{ name: "protein shake" }, { name: "water", unit: "bottle" }],
  },
  {
    input: "a cup of green tea",
    expected: [{ name: "green tea", unit: "cup" }],
  },
  {
    input: "had an iced coffee and a croissant",
    expected: [{ name: "iced coffee" }, { name: "croissant" }],
  },
  {
    input: "a glass of almond milk",
    expected: [{ name: "almond milk", unit: "glass" }],
  },
  {
    input: "drank some cold brew",
    expected: [{ name: "cold brew" }],
  },
];

// ─── NEW CATEGORY 16: Temporal context (time-of-day stripping) ──────────────

const TEMPORAL_CASES: SentenceTestCase[] = [
  {
    input: "this morning I had oatmeal and a banana",
    expected: [{ name: "oatmeal" }, { name: "banana" }],
  },
  {
    input: "yesterday I ate a burger and fries",
    expected: [{ name: "burger" }, { name: "fries" }],
  },
  {
    input: "earlier today I had a salad",
    expected: [{ name: "salad" }],
  },
  {
    input: "after the gym I had a protein shake",
    expected: [{ name: "protein shake" }],
  },
];

// ─── NEW CATEGORY 17: ASR corrections (misspellings/mishearings) ────────────

const ASR_CORRECTION_CASES: SentenceTestCase[] = [
  {
    input: "I had some brockoli and chicken",
    expected: [{ name: "broccoli" }, { name: "chicken" }],
  },
  {
    input: "had an avacado and toast",
    expected: [{ name: "avocado" }, { name: "toast" }],
  },
  {
    input: "ate a protien bar",
    expected: [{ name: "protein bar" }],
  },
  {
    input: "had some straw berries and yogurt",
    expected: [{ name: "strawberries" }, { name: "yogurt" }],
  },
  {
    input: "ate blue berries and oatmeal",
    expected: [{ name: "blueberries" }, { name: "oatmeal" }],
  },
];

// ─── NEW CATEGORY 18: Multi-person / complex sentences ──────────────────────

const COMPLEX_SENTENCE_CASES: SentenceTestCase[] = [
  {
    input: "I had a steak and she had salmon but I also had a salad",
    expected: [{ name: "steak" }, { name: "salmon" }, { name: "salad" }],
  },
  {
    input: "had eggs and toast for breakfast and chicken and rice for lunch",
    expected: [
      { name: "eggs" },
      { name: "toast" },
      { name: "chicken" },
      { name: "rice" },
    ],
  },
  {
    input: "two scrambled eggs three slices of bacon and a cup of coffee",
    expected: [
      { name: "scrambled eggs", qty: 2 },
      { name: "bacon", qty: 3, unit: "slice" },
      { name: "coffee", unit: "cup" },
    ],
  },
];

// ─── Test Runner ────────────────────────────────────────────────────────────

function runCategory(categoryName: string, cases: SentenceTestCase[]) {
  describe(categoryName, () => {
    for (const tc of cases) {
      if (!tc.input.trim() && tc.expected.length === 0) {
        it(`handles empty input`, () => {
          const parsed = parseSentence(tc.input, tc.source ?? "voice");
          expect(parsed).toHaveLength(0);
        });
        continue;
      }
      if (tc.input === "and") {
        it(`handles bare conjunction "${tc.input}"`, () => {
          const parsed = parseSentence(tc.input, tc.source ?? "voice");
          expect(parsed).toHaveLength(0);
        });
        continue;
      }

      const expectedNames = tc.expected.map((e) => e.name).join(", ");
      it(`"${tc.input}" → [${expectedNames}]`, () => {
        const parsed = parseSentence(tc.input, tc.source ?? "voice");
        expectItems(parsed, tc.expected);
      });
    }
  });
}

// ─── Execute All Categories ─────────────────────────────────────────────────

describe("Conversational Sentence Parsing", () => {
  runCategory("Leading verbs (I had/ate/drank/grabbed)", LEADING_VERB_CASES);
  runCategory("And conjunctions (X and Y and Z)", AND_CONJUNCTION_CASES);
  runCategory("With clauses (prep vs separate food)", WITH_CLAUSE_CASES);
  runCategory("Compound foods (don't split)", COMPOUND_FOOD_CASES);
  runCategory("Quantities and units", QUANTITY_CASES);
  runCategory("Filler/noise removal", FILLER_NOISE_CASES);
  runCategory("Mid-sentence re-verbing", MID_SENTENCE_VERB_CASES);
  runCategory("Full conversational sentences", FULL_SENTENCE_CASES);
  runCategory("Text input (manual)", TEXT_INPUT_CASES);
  runCategory("Meal prefix removal", MEAL_PREFIX_CASES);
  runCategory("Single items", SINGLE_ITEM_CASES);
  runCategory("Edge cases", EDGE_CASES);
  runCategory("Contractions and informal speech", CONTRACTION_CASES);
  runCategory("International / ethnic foods", INTERNATIONAL_FOOD_CASES);
  runCategory("Drinks", DRINK_CASES);
  runCategory("Temporal context", TEMPORAL_CASES);
  runCategory("ASR corrections", ASR_CORRECTION_CASES);
  runCategory("Complex sentences", COMPLEX_SENTENCE_CASES);
});
