/**
 * Branded Foods Database
 *
 * Curated nutrition data for popular branded products and restaurant items.
 * These bypass API calls entirely — instant, deterministic, and accurate.
 *
 * Source: "branded" (higher confidence than local-fallback).
 * Match score: 0.92 (above ontology 0.85, below USDA exact 0.95+).
 *
 * Coverage:
 *   - Fast-food chains (McDonald's, Subway, Chipotle, etc.)
 *   - Packaged snacks (Oreo, Clif Bar, Kind Bar, etc.)
 *   - Beverages (Coca-Cola, Red Bull, Starbucks drinks)
 *   - Grocery brands (Chobani, Fairlife, etc.)
 */

import type { FoodMatch, MatchSource } from "./matching.types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface BrandedEntry {
  /** Display name including brand */
  name: string;
  /** Brand or chain */
  brand: string;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
}

// ─── Database ────────────────────────────────────────────────────────────────

/**
 * Keys are normalized lookup strings (lowercase).
 * Multiple keys can map to the same product (aliases).
 */
const BRANDED_FOODS: Record<string, BrandedEntry> = {
  // ── McDonald's ──
  "mcdonald's big mac": {
    name: "Big Mac",
    brand: "McDonald's",
    cal: 550,
    protein: 25,
    carbs: 45,
    fat: 30,
    serving: "1 burger (200g)",
  },
  "mcdonalds big mac": {
    name: "Big Mac",
    brand: "McDonald's",
    cal: 550,
    protein: 25,
    carbs: 45,
    fat: 30,
    serving: "1 burger (200g)",
  },
  "big mac": {
    name: "Big Mac",
    brand: "McDonald's",
    cal: 550,
    protein: 25,
    carbs: 45,
    fat: 30,
    serving: "1 burger (200g)",
  },
  "mcdonald's quarter pounder": {
    name: "Quarter Pounder with Cheese",
    brand: "McDonald's",
    cal: 520,
    protein: 30,
    carbs: 42,
    fat: 27,
    serving: "1 burger (199g)",
  },
  "mcdonalds quarter pounder": {
    name: "Quarter Pounder with Cheese",
    brand: "McDonald's",
    cal: 520,
    protein: 30,
    carbs: 42,
    fat: 27,
    serving: "1 burger (199g)",
  },
  "quarter pounder": {
    name: "Quarter Pounder with Cheese",
    brand: "McDonald's",
    cal: 520,
    protein: 30,
    carbs: 42,
    fat: 27,
    serving: "1 burger (199g)",
  },
  "mcdonald's mcnuggets": {
    name: "Chicken McNuggets (10pc)",
    brand: "McDonald's",
    cal: 410,
    protein: 24,
    carbs: 24,
    fat: 25,
    serving: "10 pieces (162g)",
  },
  mcnuggets: {
    name: "Chicken McNuggets (10pc)",
    brand: "McDonald's",
    cal: 410,
    protein: 24,
    carbs: 24,
    fat: 25,
    serving: "10 pieces (162g)",
  },
  "chicken mcnuggets": {
    name: "Chicken McNuggets (10pc)",
    brand: "McDonald's",
    cal: 410,
    protein: 24,
    carbs: 24,
    fat: 25,
    serving: "10 pieces (162g)",
  },
  "mcdonald's mcchicken": {
    name: "McChicken",
    brand: "McDonald's",
    cal: 400,
    protein: 14,
    carbs: 39,
    fat: 21,
    serving: "1 sandwich (143g)",
  },
  mcchicken: {
    name: "McChicken",
    brand: "McDonald's",
    cal: 400,
    protein: 14,
    carbs: 39,
    fat: 21,
    serving: "1 sandwich (143g)",
  },
  "mcdonald's fries": {
    name: "French Fries (Medium)",
    brand: "McDonald's",
    cal: 320,
    protein: 5,
    carbs: 43,
    fat: 15,
    serving: "1 medium (117g)",
  },
  "mcdonalds fries": {
    name: "French Fries (Medium)",
    brand: "McDonald's",
    cal: 320,
    protein: 5,
    carbs: 43,
    fat: 15,
    serving: "1 medium (117g)",
  },
  "mcdonald's egg mcmuffin": {
    name: "Egg McMuffin",
    brand: "McDonald's",
    cal: 300,
    protein: 17,
    carbs: 26,
    fat: 13,
    serving: "1 sandwich (136g)",
  },
  "egg mcmuffin": {
    name: "Egg McMuffin",
    brand: "McDonald's",
    cal: 300,
    protein: 17,
    carbs: 26,
    fat: 13,
    serving: "1 sandwich (136g)",
  },
  "mcdonald's filet o fish": {
    name: "Filet-O-Fish",
    brand: "McDonald's",
    cal: 390,
    protein: 16,
    carbs: 39,
    fat: 19,
    serving: "1 sandwich (142g)",
  },
  "filet o fish": {
    name: "Filet-O-Fish",
    brand: "McDonald's",
    cal: 390,
    protein: 16,
    carbs: 39,
    fat: 19,
    serving: "1 sandwich (142g)",
  },

  // ── Subway ──
  "subway turkey": {
    name: 'Turkey Breast Sub (6")',
    brand: "Subway",
    cal: 280,
    protein: 18,
    carbs: 46,
    fat: 3.5,
    serving: '1 sub 6" (213g)',
  },
  "subway italian bmt": {
    name: 'Italian B.M.T. Sub (6")',
    brand: "Subway",
    cal: 360,
    protein: 17,
    carbs: 44,
    fat: 14,
    serving: '1 sub 6" (232g)',
  },
  "subway meatball": {
    name: 'Meatball Marinara Sub (6")',
    brand: "Subway",
    cal: 440,
    protein: 22,
    carbs: 51,
    fat: 17,
    serving: '1 sub 6" (273g)',
  },

  // ── Chipotle ──
  "chipotle burrito bowl": {
    name: "Burrito Bowl (Chicken)",
    brand: "Chipotle",
    cal: 665,
    protein: 42,
    carbs: 57,
    fat: 24,
    serving: "1 bowl (510g)",
  },
  "chipotle burrito": {
    name: "Burrito (Chicken)",
    brand: "Chipotle",
    cal: 955,
    protein: 50,
    carbs: 105,
    fat: 35,
    serving: "1 burrito (567g)",
  },
  "chipotle bowl": {
    name: "Burrito Bowl (Chicken)",
    brand: "Chipotle",
    cal: 665,
    protein: 42,
    carbs: 57,
    fat: 24,
    serving: "1 bowl (510g)",
  },

  // ── Chick-fil-A ──
  "chick-fil-a sandwich": {
    name: "Original Chicken Sandwich",
    brand: "Chick-fil-A",
    cal: 440,
    protein: 28,
    carbs: 40,
    fat: 19,
    serving: "1 sandwich (170g)",
  },
  "chick fil a sandwich": {
    name: "Original Chicken Sandwich",
    brand: "Chick-fil-A",
    cal: 440,
    protein: 28,
    carbs: 40,
    fat: 19,
    serving: "1 sandwich (170g)",
  },
  "chick-fil-a nuggets": {
    name: "Chicken Nuggets (12ct)",
    brand: "Chick-fil-A",
    cal: 380,
    protein: 40,
    carbs: 14,
    fat: 17,
    serving: "12 count (170g)",
  },
  "chick fil a nuggets": {
    name: "Chicken Nuggets (12ct)",
    brand: "Chick-fil-A",
    cal: 380,
    protein: 40,
    carbs: 14,
    fat: 17,
    serving: "12 count (170g)",
  },

  // ── Taco Bell ──
  "taco bell crunchy taco": {
    name: "Crunchy Taco",
    brand: "Taco Bell",
    cal: 170,
    protein: 8,
    carbs: 13,
    fat: 10,
    serving: "1 taco (78g)",
  },
  "taco bell burrito": {
    name: "Bean Burrito",
    brand: "Taco Bell",
    cal: 380,
    protein: 13,
    carbs: 55,
    fat: 11,
    serving: "1 burrito (198g)",
  },
  "taco bell quesadilla": {
    name: "Chicken Quesadilla",
    brand: "Taco Bell",
    cal: 520,
    protein: 28,
    carbs: 37,
    fat: 28,
    serving: "1 quesadilla (184g)",
  },
  "crunchwrap supreme": {
    name: "Crunchwrap Supreme",
    brand: "Taco Bell",
    cal: 530,
    protein: 16,
    carbs: 71,
    fat: 21,
    serving: "1 wrap (254g)",
  },

  // ── Burger King ──
  whopper: {
    name: "Whopper",
    brand: "Burger King",
    cal: 660,
    protein: 28,
    carbs: 49,
    fat: 40,
    serving: "1 burger (291g)",
  },
  "burger king whopper": {
    name: "Whopper",
    brand: "Burger King",
    cal: 660,
    protein: 28,
    carbs: 49,
    fat: 40,
    serving: "1 burger (291g)",
  },

  // ── Wendy's ──
  "wendy's baconator": {
    name: "Baconator",
    brand: "Wendy's",
    cal: 960,
    protein: 57,
    carbs: 38,
    fat: 65,
    serving: "1 burger (302g)",
  },
  baconator: {
    name: "Baconator",
    brand: "Wendy's",
    cal: 960,
    protein: 57,
    carbs: 38,
    fat: 65,
    serving: "1 burger (302g)",
  },
  "wendy's frosty": {
    name: "Chocolate Frosty (Medium)",
    brand: "Wendy's",
    cal: 460,
    protein: 11,
    carbs: 76,
    fat: 12,
    serving: "1 medium (357g)",
  },
  frosty: {
    name: "Chocolate Frosty (Medium)",
    brand: "Wendy's",
    cal: 460,
    protein: 11,
    carbs: 76,
    fat: 12,
    serving: "1 medium (357g)",
  },

  // ── Starbucks ──
  "starbucks latte": {
    name: "Caffe Latte (Grande)",
    brand: "Starbucks",
    cal: 190,
    protein: 13,
    carbs: 19,
    fat: 7,
    serving: "1 grande (470ml)",
  },
  "starbucks caffe latte": {
    name: "Caffe Latte (Grande)",
    brand: "Starbucks",
    cal: 190,
    protein: 13,
    carbs: 19,
    fat: 7,
    serving: "1 grande (470ml)",
  },
  "starbucks cappuccino": {
    name: "Cappuccino (Grande)",
    brand: "Starbucks",
    cal: 140,
    protein: 10,
    carbs: 14,
    fat: 5,
    serving: "1 grande (470ml)",
  },
  "starbucks mocha": {
    name: "Caffe Mocha (Grande)",
    brand: "Starbucks",
    cal: 360,
    protein: 13,
    carbs: 44,
    fat: 15,
    serving: "1 grande (470ml)",
  },
  "starbucks frappuccino": {
    name: "Mocha Frappuccino (Grande)",
    brand: "Starbucks",
    cal: 370,
    protein: 5,
    carbs: 52,
    fat: 15,
    serving: "1 grande (470ml)",
  },
  "starbucks caramel macchiato": {
    name: "Caramel Macchiato (Grande)",
    brand: "Starbucks",
    cal: 250,
    protein: 10,
    carbs: 35,
    fat: 7,
    serving: "1 grande (470ml)",
  },
  "starbucks hot chocolate": {
    name: "Hot Chocolate (Grande)",
    brand: "Starbucks",
    cal: 370,
    protein: 14,
    carbs: 45,
    fat: 16,
    serving: "1 grande (470ml)",
  },

  // ── Dunkin' ──
  "dunkin donut": {
    name: "Glazed Donut",
    brand: "Dunkin'",
    cal: 240,
    protein: 3,
    carbs: 31,
    fat: 11,
    serving: "1 donut (53g)",
  },
  "dunkin glazed donut": {
    name: "Glazed Donut",
    brand: "Dunkin'",
    cal: 240,
    protein: 3,
    carbs: 31,
    fat: 11,
    serving: "1 donut (53g)",
  },
  "dunkin latte": {
    name: "Iced Latte (Medium)",
    brand: "Dunkin'",
    cal: 120,
    protein: 8,
    carbs: 12,
    fat: 4.5,
    serving: "1 medium (600ml)",
  },

  // ── Panda Express ──
  "panda express orange chicken": {
    name: "Orange Chicken",
    brand: "Panda Express",
    cal: 490,
    protein: 25,
    carbs: 51,
    fat: 23,
    serving: "1 entree (163g)",
  },
  "orange chicken": {
    name: "Orange Chicken",
    brand: "Panda Express",
    cal: 490,
    protein: 25,
    carbs: 51,
    fat: 23,
    serving: "1 entree (163g)",
  },

  // ── Beverages ──
  "coca-cola": {
    name: "Coca-Cola",
    brand: "Coca-Cola",
    cal: 140,
    protein: 0,
    carbs: 39,
    fat: 0,
    serving: "1 can (355ml)",
  },
  "coca cola": {
    name: "Coca-Cola",
    brand: "Coca-Cola",
    cal: 140,
    protein: 0,
    carbs: 39,
    fat: 0,
    serving: "1 can (355ml)",
  },
  coke: {
    name: "Coca-Cola",
    brand: "Coca-Cola",
    cal: 140,
    protein: 0,
    carbs: 39,
    fat: 0,
    serving: "1 can (355ml)",
  },
  "diet coke": {
    name: "Diet Coke",
    brand: "Coca-Cola",
    cal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving: "1 can (355ml)",
  },
  "coke zero": {
    name: "Coca-Cola Zero Sugar",
    brand: "Coca-Cola",
    cal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving: "1 can (355ml)",
  },
  pepsi: {
    name: "Pepsi",
    brand: "PepsiCo",
    cal: 150,
    protein: 0,
    carbs: 41,
    fat: 0,
    serving: "1 can (355ml)",
  },
  "diet pepsi": {
    name: "Diet Pepsi",
    brand: "PepsiCo",
    cal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving: "1 can (355ml)",
  },
  sprite: {
    name: "Sprite",
    brand: "Coca-Cola",
    cal: 140,
    protein: 0,
    carbs: 38,
    fat: 0,
    serving: "1 can (355ml)",
  },
  fanta: {
    name: "Fanta Orange",
    brand: "Coca-Cola",
    cal: 160,
    protein: 0,
    carbs: 44,
    fat: 0,
    serving: "1 can (355ml)",
  },
  "dr pepper": {
    name: "Dr Pepper",
    brand: "Keurig Dr Pepper",
    cal: 150,
    protein: 0,
    carbs: 40,
    fat: 0,
    serving: "1 can (355ml)",
  },
  "mountain dew": {
    name: "Mountain Dew",
    brand: "PepsiCo",
    cal: 170,
    protein: 0,
    carbs: 46,
    fat: 0,
    serving: "1 can (355ml)",
  },
  "red bull": {
    name: "Red Bull",
    brand: "Red Bull",
    cal: 110,
    protein: 0,
    carbs: 28,
    fat: 0,
    serving: "1 can (250ml)",
  },
  "monster energy": {
    name: "Monster Energy",
    brand: "Monster",
    cal: 210,
    protein: 0,
    carbs: 54,
    fat: 0,
    serving: "1 can (473ml)",
  },
  monster: {
    name: "Monster Energy",
    brand: "Monster",
    cal: 210,
    protein: 0,
    carbs: 54,
    fat: 0,
    serving: "1 can (473ml)",
  },
  celsius: {
    name: "Celsius Energy Drink",
    brand: "Celsius",
    cal: 10,
    protein: 0,
    carbs: 2,
    fat: 0,
    serving: "1 can (355ml)",
  },
  gatorade: {
    name: "Gatorade Thirst Quencher",
    brand: "Gatorade",
    cal: 140,
    protein: 0,
    carbs: 36,
    fat: 0,
    serving: "1 bottle (591ml)",
  },

  // ── Packaged Snacks & Bars ──
  oreo: {
    name: "Oreo Cookies",
    brand: "Nabisco",
    cal: 160,
    protein: 1,
    carbs: 25,
    fat: 7,
    serving: "3 cookies (34g)",
  },
  oreos: {
    name: "Oreo Cookies",
    brand: "Nabisco",
    cal: 160,
    protein: 1,
    carbs: 25,
    fat: 7,
    serving: "3 cookies (34g)",
  },
  nutella: {
    name: "Nutella",
    brand: "Ferrero",
    cal: 200,
    protein: 2,
    carbs: 23,
    fat: 11,
    serving: "2 tbsp (37g)",
  },
  "clif bar": {
    name: "Clif Bar (Chocolate Chip)",
    brand: "Clif",
    cal: 250,
    protein: 10,
    carbs: 44,
    fat: 5,
    serving: "1 bar (68g)",
  },
  "kind bar": {
    name: "Kind Bar (Dark Chocolate Nuts)",
    brand: "Kind",
    cal: 200,
    protein: 6,
    carbs: 17,
    fat: 13,
    serving: "1 bar (40g)",
  },
  rxbar: {
    name: "RXBar (Chocolate Sea Salt)",
    brand: "RXBAR",
    cal: 210,
    protein: 12,
    carbs: 24,
    fat: 9,
    serving: "1 bar (52g)",
  },
  "quest bar": {
    name: "Quest Bar (Chocolate Chip Cookie Dough)",
    brand: "Quest",
    cal: 190,
    protein: 21,
    carbs: 21,
    fat: 7,
    serving: "1 bar (60g)",
  },
  "nature valley": {
    name: "Nature Valley Crunchy Bar",
    brand: "General Mills",
    cal: 190,
    protein: 4,
    carbs: 29,
    fat: 7,
    serving: "2 bars (42g)",
  },
  "pop-tarts": {
    name: "Pop-Tarts (Strawberry)",
    brand: "Kellogg's",
    cal: 370,
    protein: 4,
    carbs: 70,
    fat: 9,
    serving: "2 pastries (96g)",
  },
  "pop tarts": {
    name: "Pop-Tarts (Strawberry)",
    brand: "Kellogg's",
    cal: 370,
    protein: 4,
    carbs: 70,
    fat: 9,
    serving: "2 pastries (96g)",
  },
  goldfish: {
    name: "Goldfish Crackers",
    brand: "Pepperidge Farm",
    cal: 140,
    protein: 4,
    carbs: 20,
    fat: 5,
    serving: "55 pieces (30g)",
  },
  "cheez-it": {
    name: "Cheez-It Crackers",
    brand: "Kellanova",
    cal: 150,
    protein: 4,
    carbs: 17,
    fat: 8,
    serving: "27 crackers (30g)",
  },
  "cheez it": {
    name: "Cheez-It Crackers",
    brand: "Kellanova",
    cal: 150,
    protein: 4,
    carbs: 17,
    fat: 8,
    serving: "27 crackers (30g)",
  },
  doritos: {
    name: "Doritos Nacho Cheese",
    brand: "Frito-Lay",
    cal: 140,
    protein: 2,
    carbs: 18,
    fat: 7,
    serving: "12 chips (28g)",
  },
  "lays chips": {
    name: "Lay's Classic Potato Chips",
    brand: "Frito-Lay",
    cal: 160,
    protein: 2,
    carbs: 15,
    fat: 10,
    serving: "15 chips (28g)",
  },
  pringles: {
    name: "Pringles Original",
    brand: "Kellanova",
    cal: 150,
    protein: 1,
    carbs: 15,
    fat: 9,
    serving: "16 crisps (28g)",
  },
  takis: {
    name: "Takis Fuego",
    brand: "Barcel",
    cal: 140,
    protein: 2,
    carbs: 17,
    fat: 8,
    serving: "12 pieces (28g)",
  },

  // ── Dairy & Yogurt Brands ──
  chobani: {
    name: "Chobani Greek Yogurt (Plain)",
    brand: "Chobani",
    cal: 90,
    protein: 15,
    carbs: 6,
    fat: 0,
    serving: "1 container (150g)",
  },
  "chobani yogurt": {
    name: "Chobani Greek Yogurt (Plain)",
    brand: "Chobani",
    cal: 90,
    protein: 15,
    carbs: 6,
    fat: 0,
    serving: "1 container (150g)",
  },
  fage: {
    name: "Fage Total 0% Greek Yogurt",
    brand: "Fage",
    cal: 90,
    protein: 18,
    carbs: 5,
    fat: 0,
    serving: "1 container (170g)",
  },
  "fage yogurt": {
    name: "Fage Total 0% Greek Yogurt",
    brand: "Fage",
    cal: 90,
    protein: 18,
    carbs: 5,
    fat: 0,
    serving: "1 container (170g)",
  },
  oikos: {
    name: "Oikos Triple Zero Greek Yogurt",
    brand: "Danone",
    cal: 100,
    protein: 15,
    carbs: 7,
    fat: 0,
    serving: "1 container (150g)",
  },
  "siggi's": {
    name: "Siggi's Icelandic Yogurt (Plain)",
    brand: "Siggi's",
    cal: 100,
    protein: 17,
    carbs: 6,
    fat: 0,
    serving: "1 container (150g)",
  },
  siggis: {
    name: "Siggi's Icelandic Yogurt (Plain)",
    brand: "Siggi's",
    cal: 100,
    protein: 17,
    carbs: 6,
    fat: 0,
    serving: "1 container (150g)",
  },
  fairlife: {
    name: "Fairlife Milk (2%)",
    brand: "Fairlife",
    cal: 130,
    protein: 13,
    carbs: 6,
    fat: 5,
    serving: "1 cup (240ml)",
  },
  "fairlife milk": {
    name: "Fairlife Milk (2%)",
    brand: "Fairlife",
    cal: 130,
    protein: 13,
    carbs: 6,
    fat: 5,
    serving: "1 cup (240ml)",
  },

  // ── Cereal Brands ──
  cheerios: {
    name: "Cheerios",
    brand: "General Mills",
    cal: 100,
    protein: 3,
    carbs: 20,
    fat: 2,
    serving: "1 cup (28g)",
  },
  "frosted flakes": {
    name: "Frosted Flakes",
    brand: "Kellogg's",
    cal: 140,
    protein: 1,
    carbs: 34,
    fat: 0,
    serving: "1 cup (39g)",
  },
  "lucky charms": {
    name: "Lucky Charms",
    brand: "General Mills",
    cal: 140,
    protein: 2,
    carbs: 29,
    fat: 2,
    serving: "1 cup (36g)",
  },
  "cinnamon toast crunch": {
    name: "Cinnamon Toast Crunch",
    brand: "General Mills",
    cal: 170,
    protein: 2,
    carbs: 33,
    fat: 4.5,
    serving: "1 cup (41g)",
  },
  "honey nut cheerios": {
    name: "Honey Nut Cheerios",
    brand: "General Mills",
    cal: 140,
    protein: 3,
    carbs: 29,
    fat: 2,
    serving: "1 cup (37g)",
  },

  // ── Spreads & Condiments ──
  "skippy peanut butter": {
    name: "Skippy Peanut Butter",
    brand: "Skippy",
    cal: 190,
    protein: 7,
    carbs: 7,
    fat: 16,
    serving: "2 tbsp (33g)",
  },
  "jif peanut butter": {
    name: "Jif Peanut Butter",
    brand: "Jif",
    cal: 190,
    protein: 7,
    carbs: 8,
    fat: 16,
    serving: "2 tbsp (33g)",
  },

  // ── Frozen / Prepared ──
  "hot pocket": {
    name: "Hot Pocket (Pepperoni Pizza)",
    brand: "Nestlé",
    cal: 300,
    protein: 11,
    carbs: 34,
    fat: 13,
    serving: "1 pocket (127g)",
  },
  "hot pockets": {
    name: "Hot Pocket (Pepperoni Pizza)",
    brand: "Nestlé",
    cal: 300,
    protein: 11,
    carbs: 34,
    fat: 13,
    serving: "1 pocket (127g)",
  },
  "lean cuisine": {
    name: "Lean Cuisine (Chicken Alfredo)",
    brand: "Nestlé",
    cal: 270,
    protein: 18,
    carbs: 34,
    fat: 6,
    serving: "1 meal (255g)",
  },
  "totino's pizza": {
    name: "Totino's Party Pizza",
    brand: "General Mills",
    cal: 350,
    protein: 10,
    carbs: 34,
    fat: 19,
    serving: "1/2 pizza (149g)",
  },
};

// ─── Lookup ──────────────────────────────────────────────────────────────────

/**
 * Find a branded food match from the curated database.
 * Uses exact and substring matching on normalized input.
 *
 * Returns a high-confidence FoodMatch (0.92) or null.
 */
export function matchBrandedFood(foodName: string): FoodMatch | null {
  const normalized = foodName.toLowerCase().replace(/['']/g, "'").trim();

  // 1. Exact key match
  const exact = BRANDED_FOODS[normalized];
  if (exact) return buildBrandedMatch(exact, normalized);

  // 2. Input contains a branded key (e.g. "a mcdonald's big mac meal" contains "mcdonald's big mac")
  //    Prefer longer keys (more specific match)
  let bestKey: string | null = null;
  let bestLen = 0;
  for (const key of Object.keys(BRANDED_FOODS)) {
    if (normalized.includes(key) && key.length > bestLen) {
      bestKey = key;
      bestLen = key.length;
    }
  }

  if (bestKey) return buildBrandedMatch(BRANDED_FOODS[bestKey], bestKey);

  // 3. Key contains input (e.g. user says "big mac" and key is "mcdonald's big mac")
  //    Guard: require the input to be a whole-word match within the key AND
  //    cover a meaningful portion of it. Without this, single generic words
  //    like "egg", "rice", "chicken" match branded products they shouldn't.
  bestKey = null;
  bestLen = 0;
  const inputWordCount = normalized.split(/\s+/).length;
  for (const key of Object.keys(BRANDED_FOODS)) {
    if (!key.includes(normalized)) continue;
    // Single-word inputs must cover at least 60% of the key to avoid
    // "egg" → "egg mcmuffin", "rice" → "rice krispies" etc.
    // Multi-word inputs (≥2 words) use a looser 35% threshold since they're
    // more specific ("big mac" → "mcdonald's big mac" is fine).
    const minRatio = inputWordCount >= 2 ? 0.35 : 0.6;
    if (normalized.length / key.length < minRatio) continue;
    if (key.length > bestLen) {
      bestKey = key;
      bestLen = key.length;
    }
  }

  if (bestKey) return buildBrandedMatch(BRANDED_FOODS[bestKey], bestKey);

  return null;
}

function buildBrandedMatch(entry: BrandedEntry, _key: string): FoodMatch {
  // Parse actual serving size from description
  // e.g. "1 burger (200g)" → 200, "1 can (355ml)" → 355
  const servingMatch = entry.serving.match(/\((\d+(?:\.\d+)?)\s*(g|ml)\)/i);
  const servingSize = servingMatch ? parseFloat(servingMatch[1]) : 100;
  const servingUnit = servingMatch ? (servingMatch[2] as "g" | "ml") : "g";

  return {
    source: "branded" as MatchSource,
    sourceId: `branded_${entry.brand.toLowerCase().replace(/[\s']/g, "_")}_${entry.name.toLowerCase().replace(/[\s']/g, "_")}`,
    name: `${entry.name} (${entry.brand})`,
    brand: entry.brand,
    nutrients: {
      calories: entry.cal,
      protein: entry.protein,
      carbs: entry.carbs,
      fat: entry.fat,
    },
    servingSize,
    servingUnit,
    servingDescription: entry.serving,
    matchScore: 0.92,
  };
}
