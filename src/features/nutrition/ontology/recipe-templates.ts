/**
 * Recipe Templates
 *
 * Deterministic fallback data for prepared/regional dishes that
 * USDA and Open Food Facts consistently fail to match correctly.
 *
 * When the matcher can't find a good DB match for a query like
 * "goulash" or "biryani", this provides plausible average nutritional
 * data instead of returning 0 calories or a random product.
 *
 * Values are averages based on standard home-cooked servings.
 * They're approximations — but "~450 kcal goulash" beats
 * "0 kcal plain sparkling water" every time.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RecipeTemplate {
  /** Canonical name in English */
  canonical: string;
  /** Food category for routing/ranking */
  category: "meal" | "stew" | "curry" | "soup" | "salad" | "dessert" | "side";
  /** Typical serving size in grams */
  typicalServingGrams: number;
  /** Average calories per 100g */
  caloriesPer100g: number;
  /** Macros per 100g */
  macroPer100g: { protein: number; carbs: number; fat: number };
  /** Regional aliases (various languages/spellings) */
  aliases: string[];
  /** Human-readable serving description */
  servingDescription: string;
}

// ─── Recipe Template Database ───────────────────────────────────────────────

const RECIPE_TEMPLATES: RecipeTemplate[] = [
  // ─── European Dishes ──────────────────────────────────
  {
    canonical: "goulash",
    category: "stew",
    typicalServingGrams: 350,
    caloriesPer100g: 120,
    macroPer100g: { protein: 10, carbs: 6, fat: 6 },
    aliases: [
      "gulasch",
      "guláš",
      "gulasz",
      "gulyas",
      "gulyás",
      "pörkölt",
      "beef goulash",
      "hungarian goulash",
    ],
    servingDescription: "1 bowl (350g)",
  },
  {
    canonical: "moussaka",
    category: "meal",
    typicalServingGrams: 300,
    caloriesPer100g: 140,
    macroPer100g: { protein: 8, carbs: 8, fat: 9 },
    aliases: ["mousaka", "musaka", "musakka", "greek moussaka"],
    servingDescription: "1 portion (300g)",
  },
  {
    canonical: "borscht",
    category: "soup",
    typicalServingGrams: 350,
    caloriesPer100g: 40,
    macroPer100g: { protein: 2, carbs: 5, fat: 1 },
    aliases: [
      "borsch",
      "borsht",
      "borshch",
      "борщ",
      "beetroot soup",
      "beet soup",
    ],
    servingDescription: "1 bowl (350g)",
  },
  {
    canonical: "pierogi",
    category: "meal",
    typicalServingGrams: 200,
    caloriesPer100g: 210,
    macroPer100g: { protein: 7, carbs: 30, fat: 7 },
    aliases: [
      "pierog",
      "perogi",
      "pyrogy",
      "varenyky",
      "вареники",
      "polish dumplings",
    ],
    servingDescription: "6 pieces (200g)",
  },
  {
    canonical: "schnitzel",
    category: "meal",
    typicalServingGrams: 200,
    caloriesPer100g: 220,
    macroPer100g: { protein: 18, carbs: 10, fat: 13 },
    aliases: [
      "wiener schnitzel",
      "chicken schnitzel",
      "pork schnitzel",
      "escalope",
    ],
    servingDescription: "1 schnitzel (200g)",
  },
  {
    canonical: "paella",
    category: "meal",
    typicalServingGrams: 350,
    caloriesPer100g: 150,
    macroPer100g: { protein: 10, carbs: 18, fat: 5 },
    aliases: [
      "seafood paella",
      "chicken paella",
      "mixed paella",
      "valencian paella",
    ],
    servingDescription: "1 plate (350g)",
  },
  {
    canonical: "ratatouille",
    category: "side",
    typicalServingGrams: 250,
    caloriesPer100g: 55,
    macroPer100g: { protein: 1, carbs: 5, fat: 3 },
    aliases: ["ratatouie"],
    servingDescription: "1 serving (250g)",
  },
  {
    canonical: "carbonara",
    category: "meal",
    typicalServingGrams: 300,
    caloriesPer100g: 160,
    macroPer100g: { protein: 8, carbs: 18, fat: 7 },
    aliases: ["spaghetti carbonara", "pasta carbonara", "pasta alla carbonara"],
    servingDescription: "1 plate (300g)",
  },
  {
    canonical: "bolognese",
    category: "meal",
    typicalServingGrams: 350,
    caloriesPer100g: 130,
    macroPer100g: { protein: 8, carbs: 12, fat: 5 },
    aliases: [
      "spag bol",
      "spaghetti bolognese",
      "pasta bolognese",
      "ragu",
      "ragù",
      "meat sauce pasta",
    ],
    servingDescription: "1 plate (350g)",
  },

  // ─── South Asian Dishes ───────────────────────────────
  {
    canonical: "biryani",
    category: "meal",
    typicalServingGrams: 350,
    caloriesPer100g: 150,
    macroPer100g: { protein: 8, carbs: 20, fat: 5 },
    aliases: [
      "biriyani",
      "beriani",
      "chicken biryani",
      "lamb biryani",
      "veg biryani",
      "hyderabadi biryani",
    ],
    servingDescription: "1 plate (350g)",
  },
  {
    canonical: "butter chicken",
    category: "curry",
    typicalServingGrams: 300,
    caloriesPer100g: 140,
    macroPer100g: { protein: 12, carbs: 5, fat: 9 },
    aliases: ["murgh makhani", "makhani chicken", "butter chicken curry"],
    servingDescription: "1 serving (300g)",
  },
  {
    canonical: "chicken tikka masala",
    category: "curry",
    typicalServingGrams: 300,
    caloriesPer100g: 130,
    macroPer100g: { protein: 12, carbs: 6, fat: 7 },
    aliases: ["tikka masala", "ctm", "chicken tikka"],
    servingDescription: "1 serving (300g)",
  },
  {
    canonical: "dal",
    category: "curry",
    typicalServingGrams: 250,
    caloriesPer100g: 95,
    macroPer100g: { protein: 5, carbs: 12, fat: 2 },
    aliases: [
      "dhal",
      "daal",
      "dal fry",
      "tarka dal",
      "tarka daal",
      "lentil curry",
      "lentil dal",
    ],
    servingDescription: "1 bowl (250g)",
  },
  {
    canonical: "samosa",
    category: "side",
    typicalServingGrams: 100,
    caloriesPer100g: 260,
    macroPer100g: { protein: 5, carbs: 30, fat: 13 },
    aliases: ["samosa", "veg samosa", "meat samosa", "sambusa", "sambosa"],
    servingDescription: "2 pieces (100g)",
  },
  {
    canonical: "naan bread",
    category: "side",
    typicalServingGrams: 90,
    caloriesPer100g: 260,
    macroPer100g: { protein: 8, carbs: 45, fat: 5 },
    aliases: ["naan", "nan", "garlic naan", "peshwari naan", "keema naan"],
    servingDescription: "1 piece (90g)",
  },

  // ─── East Asian Dishes ────────────────────────────────
  {
    canonical: "ramen",
    category: "soup",
    typicalServingGrams: 500,
    caloriesPer100g: 80,
    macroPer100g: { protein: 5, carbs: 10, fat: 2 },
    aliases: ["tonkotsu ramen", "shoyu ramen", "miso ramen", "ラーメン"],
    servingDescription: "1 bowl (500g)",
  },
  {
    canonical: "pho",
    category: "soup",
    typicalServingGrams: 500,
    caloriesPer100g: 45,
    macroPer100g: { protein: 4, carbs: 5, fat: 1 },
    aliases: ["phở", "pho bo", "pho ga", "vietnamese pho"],
    servingDescription: "1 bowl (500g)",
  },
  {
    canonical: "fried rice",
    category: "meal",
    typicalServingGrams: 300,
    caloriesPer100g: 160,
    macroPer100g: { protein: 5, carbs: 22, fat: 6 },
    aliases: [
      "egg fried rice",
      "chicken fried rice",
      "yang chow fried rice",
      "炒饭",
      "チャーハン",
    ],
    servingDescription: "1 plate (300g)",
  },
  {
    canonical: "dumplings",
    category: "meal",
    typicalServingGrams: 200,
    caloriesPer100g: 200,
    macroPer100g: { protein: 8, carbs: 25, fat: 7 },
    aliases: [
      "gyoza",
      "jiaozi",
      "potstickers",
      "pot stickers",
      "dim sum",
      "饺子",
      "餃子",
    ],
    servingDescription: "8 pieces (200g)",
  },
  {
    canonical: "pad thai",
    category: "meal",
    typicalServingGrams: 300,
    caloriesPer100g: 150,
    macroPer100g: { protein: 8, carbs: 18, fat: 5 },
    aliases: ["phad thai", "pad tai", "ผัดไทย"],
    servingDescription: "1 plate (300g)",
  },
  {
    canonical: "teriyaki",
    category: "meal",
    typicalServingGrams: 250,
    caloriesPer100g: 140,
    macroPer100g: { protein: 14, carbs: 12, fat: 4 },
    aliases: [
      "teriyaki chicken",
      "chicken teriyaki",
      "teriyaki salmon",
      "照り焼き",
    ],
    servingDescription: "1 serving (250g)",
  },
  {
    canonical: "sweet and sour",
    category: "meal",
    typicalServingGrams: 300,
    caloriesPer100g: 130,
    macroPer100g: { protein: 8, carbs: 16, fat: 4 },
    aliases: ["sweet and sour chicken", "sweet and sour pork", "sweet sour"],
    servingDescription: "1 serving (300g)",
  },
  {
    canonical: "spring rolls",
    category: "side",
    typicalServingGrams: 120,
    caloriesPer100g: 220,
    macroPer100g: { protein: 5, carbs: 25, fat: 11 },
    aliases: [
      "spring roll",
      "egg roll",
      "egg rolls",
      "vietnamese spring roll",
      "fresh spring roll",
    ],
    servingDescription: "3 pieces (120g)",
  },

  // ─── African Dishes ───────────────────────────────────
  {
    canonical: "jollof rice",
    category: "meal",
    typicalServingGrams: 350,
    caloriesPer100g: 145,
    macroPer100g: { protein: 4, carbs: 22, fat: 5 },
    aliases: ["jollof", "jolof rice", "djolof", "west african rice"],
    servingDescription: "1 plate (350g)",
  },
  {
    canonical: "tagine",
    category: "stew",
    typicalServingGrams: 350,
    caloriesPer100g: 100,
    macroPer100g: { protein: 8, carbs: 8, fat: 4 },
    aliases: ["tajine", "moroccan tagine", "chicken tagine", "lamb tagine"],
    servingDescription: "1 bowl (350g)",
  },
  {
    canonical: "injera with wat",
    category: "meal",
    typicalServingGrams: 400,
    caloriesPer100g: 110,
    macroPer100g: { protein: 6, carbs: 15, fat: 3 },
    aliases: [
      "injera",
      "beyaynetu",
      "ethiopian platter",
      "doro wat",
      "doro wot",
    ],
    servingDescription: "1 plate (400g)",
  },

  // ─── Latin American Dishes ────────────────────────────
  {
    canonical: "empanada",
    category: "meal",
    typicalServingGrams: 150,
    caloriesPer100g: 260,
    macroPer100g: { protein: 8, carbs: 24, fat: 14 },
    aliases: ["empanadas", "empanada de carne", "empanada de pollo", "pastel"],
    servingDescription: "2 pieces (150g)",
  },
  {
    canonical: "ceviche",
    category: "meal",
    typicalServingGrams: 200,
    caloriesPer100g: 75,
    macroPer100g: { protein: 12, carbs: 4, fat: 1 },
    aliases: ["cebiche", "seviche"],
    servingDescription: "1 serving (200g)",
  },
  {
    canonical: "arepas",
    category: "meal",
    typicalServingGrams: 150,
    caloriesPer100g: 190,
    macroPer100g: { protein: 4, carbs: 28, fat: 7 },
    aliases: ["arepa", "arepas rellenas"],
    servingDescription: "2 arepas (150g)",
  },

  // ─── Middle Eastern Dishes ────────────────────────────
  {
    canonical: "shawarma",
    category: "meal",
    typicalServingGrams: 300,
    caloriesPer100g: 160,
    macroPer100g: { protein: 12, carbs: 12, fat: 8 },
    aliases: [
      "chicken shawarma",
      "lamb shawarma",
      "beef shawarma",
      "döner",
      "doner",
      "döner kebab",
      "shwarma",
    ],
    servingDescription: "1 wrap (300g)",
  },
  {
    canonical: "falafel wrap",
    category: "meal",
    typicalServingGrams: 250,
    caloriesPer100g: 200,
    macroPer100g: { protein: 7, carbs: 25, fat: 8 },
    aliases: ["falafel sandwich", "falafel pita"],
    servingDescription: "1 wrap (250g)",
  },
  {
    canonical: "shakshuka",
    category: "meal",
    typicalServingGrams: 300,
    caloriesPer100g: 80,
    macroPer100g: { protein: 5, carbs: 6, fat: 5 },
    aliases: ["shakshouka", "eggs in tomato sauce", "huevos rancheros style"],
    servingDescription: "1 serving (300g)",
  },
  {
    canonical: "tabbouleh",
    category: "salad",
    typicalServingGrams: 200,
    caloriesPer100g: 90,
    macroPer100g: { protein: 2, carbs: 10, fat: 5 },
    aliases: ["tabouleh", "tabouli", "tabbouli"],
    servingDescription: "1 serving (200g)",
  },

  // ─── Comfort / Prepared Meals ─────────────────────────
  {
    canonical: "chili con carne",
    category: "stew",
    typicalServingGrams: 300,
    caloriesPer100g: 110,
    macroPer100g: { protein: 8, carbs: 8, fat: 5 },
    aliases: [
      "chili",
      "chilli",
      "chilli con carne",
      "con carne",
      "beef chili",
      "turkey chili",
    ],
    servingDescription: "1 bowl (300g)",
  },
  {
    canonical: "beef stew",
    category: "stew",
    typicalServingGrams: 350,
    caloriesPer100g: 100,
    macroPer100g: { protein: 8, carbs: 6, fat: 5 },
    aliases: ["beef casserole", "stew", "irish stew", "lamb stew", "meat stew"],
    servingDescription: "1 bowl (350g)",
  },
  {
    canonical: "chicken pot pie",
    category: "meal",
    typicalServingGrams: 250,
    caloriesPer100g: 170,
    macroPer100g: { protein: 9, carbs: 16, fat: 8 },
    aliases: ["pot pie", "chicken pie"],
    servingDescription: "1 portion (250g)",
  },
  {
    canonical: "meatloaf",
    category: "meal",
    typicalServingGrams: 200,
    caloriesPer100g: 170,
    macroPer100g: { protein: 12, carbs: 8, fat: 10 },
    aliases: ["meat loaf"],
    servingDescription: "1 slice (200g)",
  },
  {
    canonical: "casserole",
    category: "meal",
    typicalServingGrams: 300,
    caloriesPer100g: 120,
    macroPer100g: { protein: 8, carbs: 10, fat: 5 },
    aliases: ["hot dish", "hotdish", "bake"],
    servingDescription: "1 serving (300g)",
  },

  // ─── Accuracy Expansion: More Regional Dishes ─────

  // ─── Asian ────────────────────────────────────────
  {
    canonical: "pad krapow",
    category: "meal",
    typicalServingGrams: 350,
    caloriesPer100g: 140,
    macroPer100g: { protein: 10, carbs: 15, fat: 5 },
    aliases: [
      "pad gra pao",
      "pad kra pao",
      "holy basil stir fry",
      "basil chicken",
      "thai basil chicken",
    ],
    servingDescription: "1 plate (350g)",
  },
  {
    canonical: "green curry",
    category: "curry",
    typicalServingGrams: 300,
    caloriesPer100g: 120,
    macroPer100g: { protein: 8, carbs: 6, fat: 8 },
    aliases: ["thai green curry", "green chicken curry", "แกงเขียวหวาน"],
    servingDescription: "1 serving (300g)",
  },
  {
    canonical: "red curry",
    category: "curry",
    typicalServingGrams: 300,
    caloriesPer100g: 115,
    macroPer100g: { protein: 8, carbs: 6, fat: 7 },
    aliases: ["thai red curry", "red chicken curry", "แกงแดง"],
    servingDescription: "1 serving (300g)",
  },
  {
    canonical: "massaman curry",
    category: "curry",
    typicalServingGrams: 350,
    caloriesPer100g: 130,
    macroPer100g: { protein: 8, carbs: 10, fat: 7 },
    aliases: ["massaman", "muslim curry", "แกงมัสมั่น"],
    servingDescription: "1 serving (350g)",
  },
  {
    canonical: "tom yum soup",
    category: "soup",
    typicalServingGrams: 400,
    caloriesPer100g: 35,
    macroPer100g: { protein: 3, carbs: 3, fat: 1 },
    aliases: ["tom yum", "tom yam", "ต้มยำ", "hot and sour soup"],
    servingDescription: "1 bowl (400g)",
  },
  {
    canonical: "laksa",
    category: "soup",
    typicalServingGrams: 500,
    caloriesPer100g: 80,
    macroPer100g: { protein: 4, carbs: 8, fat: 3 },
    aliases: ["curry laksa", "coconut laksa", "singapore laksa"],
    servingDescription: "1 bowl (500g)",
  },
  {
    canonical: "bibimbap",
    category: "meal",
    typicalServingGrams: 400,
    caloriesPer100g: 120,
    macroPer100g: { protein: 7, carbs: 16, fat: 3 },
    aliases: ["bi bim bap", "korean rice bowl", "비빔밥"],
    servingDescription: "1 bowl (400g)",
  },
  {
    canonical: "bulgogi",
    category: "meal",
    typicalServingGrams: 250,
    caloriesPer100g: 150,
    macroPer100g: { protein: 14, carbs: 8, fat: 7 },
    aliases: ["korean bbq beef", "불고기"],
    servingDescription: "1 serving (250g)",
  },
  {
    canonical: "katsu curry",
    category: "meal",
    typicalServingGrams: 400,
    caloriesPer100g: 150,
    macroPer100g: { protein: 10, carbs: 16, fat: 6 },
    aliases: ["chicken katsu", "katsu", "カツカレー", "japanese curry"],
    servingDescription: "1 plate (400g)",
  },
  {
    canonical: "nasi goreng",
    category: "meal",
    typicalServingGrams: 350,
    caloriesPer100g: 150,
    macroPer100g: { protein: 6, carbs: 20, fat: 5 },
    aliases: ["indonesian fried rice", "nasi goreng ayam"],
    servingDescription: "1 plate (350g)",
  },
  {
    canonical: "rendang",
    category: "curry",
    typicalServingGrams: 200,
    caloriesPer100g: 180,
    macroPer100g: { protein: 16, carbs: 3, fat: 12 },
    aliases: ["beef rendang", "chicken rendang"],
    servingDescription: "1 serving (200g)",
  },
  {
    canonical: "satay",
    category: "meal",
    typicalServingGrams: 200,
    caloriesPer100g: 160,
    macroPer100g: { protein: 15, carbs: 5, fat: 9 },
    aliases: ["satay chicken", "satay skewers", "chicken satay", "pork satay"],
    servingDescription: "4 skewers (200g)",
  },
  {
    canonical: "miso soup",
    category: "soup",
    typicalServingGrams: 250,
    caloriesPer100g: 20,
    macroPer100g: { protein: 2, carbs: 2, fat: 0.5 },
    aliases: ["みそ汁", "miso shiru"],
    servingDescription: "1 bowl (250g)",
  },
  {
    canonical: "donburi",
    category: "meal",
    typicalServingGrams: 400,
    caloriesPer100g: 130,
    macroPer100g: { protein: 8, carbs: 18, fat: 3 },
    aliases: ["rice bowl", "gyudon", "oyakodon", "katsudon", "丼"],
    servingDescription: "1 bowl (400g)",
  },
  {
    canonical: "char siu",
    category: "meal",
    typicalServingGrams: 250,
    caloriesPer100g: 170,
    macroPer100g: { protein: 16, carbs: 10, fat: 7 },
    aliases: ["chinese bbq pork", "叉烧", "bbq pork"],
    servingDescription: "1 serving (250g)",
  },
  {
    canonical: "kung pao chicken",
    category: "meal",
    typicalServingGrams: 300,
    caloriesPer100g: 130,
    macroPer100g: { protein: 12, carbs: 8, fat: 6 },
    aliases: ["kung po chicken", "宫保鸡丁"],
    servingDescription: "1 serving (300g)",
  },
  {
    canonical: "mapo tofu",
    category: "meal",
    typicalServingGrams: 300,
    caloriesPer100g: 90,
    macroPer100g: { protein: 6, carbs: 4, fat: 6 },
    aliases: ["麻婆豆腐", "spicy tofu"],
    servingDescription: "1 serving (300g)",
  },

  // ─── Indian / South Asian ────────────────────────
  {
    canonical: "chicken korma",
    category: "curry",
    typicalServingGrams: 300,
    caloriesPer100g: 150,
    macroPer100g: { protein: 10, carbs: 6, fat: 10 },
    aliases: ["korma", "lamb korma", "veg korma"],
    servingDescription: "1 serving (300g)",
  },
  {
    canonical: "palak paneer",
    category: "curry",
    typicalServingGrams: 250,
    caloriesPer100g: 110,
    macroPer100g: { protein: 6, carbs: 4, fat: 8 },
    aliases: ["saag paneer", "spinach paneer", "paneer saag"],
    servingDescription: "1 serving (250g)",
  },
  {
    canonical: "chana masala",
    category: "curry",
    typicalServingGrams: 250,
    caloriesPer100g: 100,
    macroPer100g: { protein: 5, carbs: 13, fat: 3 },
    aliases: ["chole", "chickpea curry", "chhole masala"],
    servingDescription: "1 serving (250g)",
  },
  {
    canonical: "tandoori chicken",
    category: "meal",
    typicalServingGrams: 200,
    caloriesPer100g: 140,
    macroPer100g: { protein: 18, carbs: 3, fat: 6 },
    aliases: ["tandoori", "tandoori wings", "tandoori tikka"],
    servingDescription: "1 serving (200g)",
  },
  {
    canonical: "vindaloo",
    category: "curry",
    typicalServingGrams: 300,
    caloriesPer100g: 120,
    macroPer100g: { protein: 10, carbs: 5, fat: 7 },
    aliases: ["chicken vindaloo", "pork vindaloo", "lamb vindaloo"],
    servingDescription: "1 serving (300g)",
  },
  {
    canonical: "madras",
    category: "curry",
    typicalServingGrams: 300,
    caloriesPer100g: 115,
    macroPer100g: { protein: 10, carbs: 5, fat: 6 },
    aliases: ["chicken madras", "lamb madras"],
    servingDescription: "1 serving (300g)",
  },
  {
    canonical: "roti",
    category: "side",
    typicalServingGrams: 60,
    caloriesPer100g: 300,
    macroPer100g: { protein: 9, carbs: 50, fat: 8 },
    aliases: ["chapati", "roti canai", "paratha", "flatbread"],
    servingDescription: "1 piece (60g)",
  },
  {
    canonical: "dosa",
    category: "meal",
    typicalServingGrams: 150,
    caloriesPer100g: 130,
    macroPer100g: { protein: 4, carbs: 20, fat: 4 },
    aliases: ["masala dosa", "plain dosa", "mysore dosa"],
    servingDescription: "1 dosa (150g)",
  },

  // ─── Mediterranean ───────────────────────────────
  {
    canonical: "falafel",
    category: "meal",
    typicalServingGrams: 120,
    caloriesPer100g: 330,
    macroPer100g: { protein: 13, carbs: 32, fat: 18 },
    aliases: ["falafel balls", "felafel"],
    servingDescription: "5 balls (120g)",
  },
  {
    canonical: "hummus plate",
    category: "meal",
    typicalServingGrams: 200,
    caloriesPer100g: 170,
    macroPer100g: { protein: 8, carbs: 14, fat: 10 },
    aliases: ["hummus with pita", "houmous", "hommus"],
    servingDescription: "1 plate (200g)",
  },
  {
    canonical: "spanakopita",
    category: "side",
    typicalServingGrams: 130,
    caloriesPer100g: 220,
    macroPer100g: { protein: 7, carbs: 18, fat: 13 },
    aliases: ["spinach pie", "greek spinach pie"],
    servingDescription: "1 piece (130g)",
  },
  {
    canonical: "greek salad",
    category: "salad",
    typicalServingGrams: 250,
    caloriesPer100g: 70,
    macroPer100g: { protein: 3, carbs: 4, fat: 5 },
    aliases: ["horiatiki", "village salad"],
    servingDescription: "1 serving (250g)",
  },
  {
    canonical: "gyros",
    category: "meal",
    typicalServingGrams: 300,
    caloriesPer100g: 150,
    macroPer100g: { protein: 10, carbs: 14, fat: 7 },
    aliases: ["gyro", "greek gyro", "lamb gyro", "chicken gyro"],
    servingDescription: "1 wrap (300g)",
  },
  {
    canonical: "souvlaki",
    category: "meal",
    typicalServingGrams: 200,
    caloriesPer100g: 150,
    macroPer100g: { protein: 16, carbs: 4, fat: 8 },
    aliases: ["souvlakia", "greek skewers", "chicken souvlaki"],
    servingDescription: "2 skewers (200g)",
  },

  // ─── Latin American ──────────────────────────────
  {
    canonical: "enchiladas",
    category: "meal",
    typicalServingGrams: 300,
    caloriesPer100g: 150,
    macroPer100g: { protein: 8, carbs: 15, fat: 7 },
    aliases: [
      "enchilada",
      "chicken enchilada",
      "cheese enchilada",
      "beef enchilada",
    ],
    servingDescription: "2 enchiladas (300g)",
  },
  {
    canonical: "tamales",
    category: "meal",
    typicalServingGrams: 200,
    caloriesPer100g: 180,
    macroPer100g: { protein: 7, carbs: 20, fat: 8 },
    aliases: ["tamale", "tamal"],
    servingDescription: "2 tamales (200g)",
  },
  {
    canonical: "pupusa",
    category: "meal",
    typicalServingGrams: 200,
    caloriesPer100g: 210,
    macroPer100g: { protein: 7, carbs: 26, fat: 9 },
    aliases: ["pupusas", "salvadoran pupusa"],
    servingDescription: "2 pupusas (200g)",
  },
  {
    canonical: "chimichanga",
    category: "meal",
    typicalServingGrams: 250,
    caloriesPer100g: 200,
    macroPer100g: { protein: 9, carbs: 20, fat: 10 },
    aliases: ["chimichangas", "fried burrito"],
    servingDescription: "1 chimichanga (250g)",
  },

  // ─── African ──────────────────────────────────────
  {
    canonical: "piri piri chicken",
    category: "meal",
    typicalServingGrams: 250,
    caloriesPer100g: 160,
    macroPer100g: { protein: 20, carbs: 2, fat: 8 },
    aliases: ["peri peri chicken", "nandos", "nando's", "peri peri"],
    servingDescription: "1 serving (250g)",
  },
  {
    canonical: "fufu",
    category: "side",
    typicalServingGrams: 200,
    caloriesPer100g: 160,
    macroPer100g: { protein: 1, carbs: 38, fat: 0.5 },
    aliases: ["foufou", "foutou", "pounded yam"],
    servingDescription: "1 serving (200g)",
  },
  {
    canonical: "egusi soup",
    category: "soup",
    typicalServingGrams: 300,
    caloriesPer100g: 110,
    macroPer100g: { protein: 6, carbs: 5, fat: 8 },
    aliases: ["egusi", "melon seed soup"],
    servingDescription: "1 bowl (300g)",
  },

  // ─── European ─────────────────────────────────────
  {
    canonical: "risotto",
    category: "meal",
    typicalServingGrams: 300,
    caloriesPer100g: 140,
    macroPer100g: { protein: 5, carbs: 20, fat: 4 },
    aliases: [
      "mushroom risotto",
      "seafood risotto",
      "chicken risotto",
      "truffle risotto",
    ],
    servingDescription: "1 plate (300g)",
  },
  {
    canonical: "shepherd's pie",
    category: "meal",
    typicalServingGrams: 300,
    caloriesPer100g: 120,
    macroPer100g: { protein: 8, carbs: 10, fat: 5 },
    aliases: ["shepherds pie", "cottage pie", "hachis parmentier"],
    servingDescription: "1 portion (300g)",
  },
  {
    canonical: "bangers and mash",
    category: "meal",
    typicalServingGrams: 350,
    caloriesPer100g: 130,
    macroPer100g: { protein: 7, carbs: 12, fat: 6 },
    aliases: ["sausage and mash", "bangers n mash"],
    servingDescription: "1 plate (350g)",
  },
  {
    canonical: "fish pie",
    category: "meal",
    typicalServingGrams: 300,
    caloriesPer100g: 110,
    macroPer100g: { protein: 8, carbs: 10, fat: 4 },
    aliases: ["fisherman's pie"],
    servingDescription: "1 portion (300g)",
  },
  {
    canonical: "coq au vin",
    category: "stew",
    typicalServingGrams: 350,
    caloriesPer100g: 110,
    macroPer100g: { protein: 10, carbs: 3, fat: 6 },
    aliases: ["chicken in wine", "french chicken stew"],
    servingDescription: "1 serving (350g)",
  },
  {
    canonical: "quiche",
    category: "meal",
    typicalServingGrams: 170,
    caloriesPer100g: 230,
    macroPer100g: { protein: 10, carbs: 16, fat: 15 },
    aliases: ["quiche lorraine", "quiche florentine", "egg pie"],
    servingDescription: "1 slice (170g)",
  },
  {
    canonical: "pierogi ruskie",
    category: "meal",
    typicalServingGrams: 200,
    caloriesPer100g: 200,
    macroPer100g: { protein: 6, carbs: 28, fat: 7 },
    aliases: ["potato pierogi", "cheese pierogi"],
    servingDescription: "6 pieces (200g)",
  },
  {
    canonical: "bratwurst",
    category: "meal",
    typicalServingGrams: 150,
    caloriesPer100g: 280,
    macroPer100g: { protein: 12, carbs: 2, fat: 25 },
    aliases: ["brat", "german sausage", "wurst", "currywurst"],
    servingDescription: "1 sausage (150g)",
  },
];

// ─── Lookup Index ───────────────────────────────────────────────────────────

/** Build a lookup map: alias → template for O(1) access */
const TEMPLATE_INDEX = new Map<string, RecipeTemplate>();

for (const template of RECIPE_TEMPLATES) {
  // Index by canonical name
  TEMPLATE_INDEX.set(template.canonical.toLowerCase(), template);
  // Index by all aliases
  for (const alias of template.aliases) {
    TEMPLATE_INDEX.set(alias.toLowerCase(), template);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Look up a recipe template by name or alias.
 * Returns null if no template matches.
 */
export function lookupRecipeTemplate(query: string): RecipeTemplate | null {
  const normalized = query.toLowerCase().trim();

  // 1. Exact match
  const exact = TEMPLATE_INDEX.get(normalized);
  if (exact) return exact;

  // 2. Check if query CONTAINS a template name/alias
  for (const [key, template] of TEMPLATE_INDEX) {
    if (normalized.includes(key) && key.length >= 4) {
      return template;
    }
  }

  // 3. Check if a template name/alias contains the query
  if (normalized.length >= 4) {
    for (const [key, template] of TEMPLATE_INDEX) {
      if (key.includes(normalized) && key.length - normalized.length <= 5) {
        return template;
      }
    }
  }

  return null;
}

/**
 * Build a FoodMatch from a recipe template.
 * Used when API lookups fail for regional dishes.
 */
export function buildRecipeMatch(
  template: RecipeTemplate,
  displayName: string
): {
  source: "recipe-template";
  sourceId: string;
  name: string;
  nutrients: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  servingSize: number;
  servingUnit: string;
  servingDescription: string;
  matchScore: number;
} {
  const servingGrams = template.typicalServingGrams;
  const multiplier = servingGrams / 100;

  return {
    source: "recipe-template",
    sourceId: `recipe_${template.canonical.replace(/\s+/g, "_")}`,
    name: displayName || template.canonical,
    nutrients: {
      calories: Math.round(template.caloriesPer100g * multiplier),
      protein: Math.round(template.macroPer100g.protein * multiplier * 10) / 10,
      carbs: Math.round(template.macroPer100g.carbs * multiplier * 10) / 10,
      fat: Math.round(template.macroPer100g.fat * multiplier * 10) / 10,
    },
    servingSize: servingGrams,
    servingUnit: "g",
    servingDescription: template.servingDescription,
    matchScore: 0.7,
  };
}

/** Get all recipe templates — for tests */
export function getAllRecipeTemplates(): RecipeTemplate[] {
  return [...RECIPE_TEMPLATES];
}
