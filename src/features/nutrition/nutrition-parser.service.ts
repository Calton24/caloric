import { MealDraft } from "./nutrition.draft.types";
import { MealSource } from "./nutrition.types";

/** Common food items with approximate per-serving nutrition */
const FOOD_DB: {
  pattern: RegExp;
  cal: number;
  protein: number;
  carbs: number;
  fat: number;
}[] = [
  // Proteins
  { pattern: /egg/, cal: 140, protein: 12, carbs: 1, fat: 10 },
  { pattern: /chicken/, cal: 230, protein: 31, carbs: 0, fat: 10 },
  { pattern: /steak|beef/, cal: 300, protein: 26, carbs: 0, fat: 20 },
  { pattern: /salmon|fish/, cal: 250, protein: 25, carbs: 0, fat: 14 },
  { pattern: /turkey/, cal: 190, protein: 29, carbs: 0, fat: 7 },
  { pattern: /shrimp|prawn/, cal: 120, protein: 24, carbs: 0, fat: 2 },
  { pattern: /tofu/, cal: 130, protein: 14, carbs: 3, fat: 8 },
  { pattern: /bacon/, cal: 180, protein: 12, carbs: 0, fat: 14 },
  { pattern: /sausage/, cal: 250, protein: 14, carbs: 2, fat: 20 },

  // Grains & carbs
  { pattern: /rice/, cal: 210, protein: 4, carbs: 45, fat: 1 },
  {
    pattern: /pasta|spaghetti|noodle/,
    cal: 220,
    protein: 8,
    carbs: 43,
    fat: 1,
  },
  { pattern: /toast|bread/, cal: 120, protein: 4, carbs: 22, fat: 2 },
  { pattern: /wrap|tortilla/, cal: 200, protein: 5, carbs: 30, fat: 6 },
  { pattern: /croissant/, cal: 230, protein: 5, carbs: 26, fat: 12 },
  { pattern: /waffle/, cal: 290, protein: 7, carbs: 38, fat: 12 },
  { pattern: /pancake/, cal: 250, protein: 6, carbs: 34, fat: 10 },
  { pattern: /oat|oatmeal|porridge/, cal: 160, protein: 6, carbs: 27, fat: 3 },
  { pattern: /bagel/, cal: 270, protein: 10, carbs: 50, fat: 2 },
  { pattern: /cereal/, cal: 180, protein: 4, carbs: 38, fat: 2 },

  // Fruits & vegetables
  { pattern: /banana/, cal: 105, protein: 1, carbs: 27, fat: 0 },
  { pattern: /apple/, cal: 95, protein: 0, carbs: 25, fat: 0 },
  { pattern: /salad/, cal: 120, protein: 3, carbs: 10, fat: 7 },
  { pattern: /avocado/, cal: 240, protein: 3, carbs: 12, fat: 22 },
  { pattern: /orange/, cal: 60, protein: 1, carbs: 15, fat: 0 },
  {
    pattern: /berry|berries|strawberr|blueberr/,
    cal: 60,
    protein: 1,
    carbs: 14,
    fat: 0,
  },

  // Dairy
  { pattern: /yogurt|yoghurt/, cal: 130, protein: 10, carbs: 15, fat: 4 },
  { pattern: /cheese/, cal: 110, protein: 7, carbs: 1, fat: 9 },
  { pattern: /milk/, cal: 120, protein: 8, carbs: 12, fat: 5 },

  // Common meals
  { pattern: /pizza/, cal: 300, protein: 12, carbs: 36, fat: 12 },
  { pattern: /burger|hamburger/, cal: 450, protein: 25, carbs: 40, fat: 22 },
  { pattern: /sandwich/, cal: 350, protein: 18, carbs: 35, fat: 14 },
  { pattern: /taco/, cal: 210, protein: 10, carbs: 20, fat: 10 },
  { pattern: /burrito/, cal: 450, protein: 20, carbs: 50, fat: 18 },
  { pattern: /soup/, cal: 180, protein: 8, carbs: 20, fat: 6 },
  { pattern: /sushi/, cal: 200, protein: 9, carbs: 28, fat: 5 },
  { pattern: /ramen/, cal: 420, protein: 16, carbs: 55, fat: 15 },

  // Snacks & desserts
  { pattern: /cookie/, cal: 160, protein: 2, carbs: 22, fat: 8 },
  { pattern: /donut|doughnut/, cal: 270, protein: 4, carbs: 33, fat: 14 },
  { pattern: /ice cream/, cal: 270, protein: 5, carbs: 32, fat: 14 },
  { pattern: /chocolate/, cal: 210, protein: 3, carbs: 24, fat: 12 },
  { pattern: /protein bar/, cal: 210, protein: 20, carbs: 22, fat: 7 },
  { pattern: /chips|crisps/, cal: 150, protein: 2, carbs: 15, fat: 10 },
  { pattern: /fries|french fries/, cal: 320, protein: 4, carbs: 40, fat: 16 },

  // Drinks
  { pattern: /coke|soda|cola/, cal: 140, protein: 0, carbs: 39, fat: 0 },
  { pattern: /milkshake/, cal: 350, protein: 8, carbs: 45, fat: 12 },
  { pattern: /smoothie/, cal: 220, protein: 5, carbs: 40, fat: 4 },
  {
    pattern: /coffee|latte|cappuccino/,
    cal: 100,
    protein: 4,
    carbs: 12,
    fat: 4,
  },
  { pattern: /juice/, cal: 110, protein: 1, carbs: 26, fat: 0 },
  { pattern: /beer/, cal: 150, protein: 1, carbs: 13, fat: 0 },
  { pattern: /wine/, cal: 125, protein: 0, carbs: 4, fat: 0 },

  // Nuts & extras
  { pattern: /peanut butter/, cal: 190, protein: 7, carbs: 7, fat: 16 },
  { pattern: /almond|nuts/, cal: 170, protein: 6, carbs: 6, fat: 15 },
  { pattern: /hummus/, cal: 120, protein: 5, carbs: 10, fat: 8 },
  { pattern: /protein shake/, cal: 200, protein: 30, carbs: 10, fat: 4 },
];

function estimateNutritionFromText(input: string) {
  const normalized = input.toLowerCase();

  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  let matchCount = 0;

  for (const food of FOOD_DB) {
    if (food.pattern.test(normalized)) {
      calories += food.cal;
      protein += food.protein;
      carbs += food.carbs;
      fat += food.fat;
      matchCount++;
    }
  }

  // If no known food was detected, use a generic estimate
  if (matchCount === 0) {
    calories = 250;
    protein = 12;
    carbs = 30;
    fat = 10;
  }

  return {
    calories,
    protein,
    carbs,
    fat,
  };
}

export function parseMealInput(input: string, source: MealSource): MealDraft {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Meal input cannot be empty");
  }

  const estimated = estimateNutritionFromText(trimmed);

  return {
    title: trimmed,
    source,
    rawInput: trimmed,
    calories: estimated.calories,
    protein: estimated.protein,
    carbs: estimated.carbs,
    fat: estimated.fat,
  };
}
