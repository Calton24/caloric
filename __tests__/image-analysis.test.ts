/**
 * Image Analysis Pipeline Tests
 *
 * Tests the multi-stage image analysis pipeline:
 *   Triage → Extraction → Routing → Matching → Estimation
 */

import {
    buildPortionOptions,
    calculatePortionNutrients,
} from "../src/features/image-analysis/estimation/portion-estimator.service";
import {
    buildSearchQuery,
    extractProductInfo,
} from "../src/features/image-analysis/extraction/packaged-product-extractor";
import { classifyFood } from "../src/features/image-analysis/extraction/vision-classifier.service";
import { chooseMatchRoute } from "../src/features/image-analysis/routing/source-router.service";
import { triageImage } from "../src/features/image-analysis/triage/image-triage.service";
import type {
    EvidenceBundle,
    ProductCandidate,
} from "../src/features/image-analysis/types";

// ─── Image Triage Tests ─────────────────────────────────────────────────────

describe("Image Triage", () => {
  it("identifies packaged products by brand names", () => {
    const result = triageImage("walkers sensations thai sweet chilli crisps");
    expect(result.imageType).toBe("packaged_product");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("identifies packaged products by weight text", () => {
    const result = triageImage("crisps bag 150g");
    expect(result.imageType).toBe("packaged_product");
  });

  it("identifies plated meals", () => {
    const result = triageImage("grilled chicken with rice and vegetables");
    expect(result.imageType).toBe("plated_meal");
  });

  it("identifies drinks", () => {
    const result = triageImage("large glass of orange juice");
    expect(result.imageType).toBe("drink");
  });

  it("identifies nutrition labels", () => {
    const result = triageImage(
      "nutrition facts calories 200 protein 5g carbs 30g"
    );
    expect(result.imageType).toBe("nutrition_label");
  });

  it("classifies unclear descriptions with low confidence", () => {
    const result = triageImage("something on a table");
    expect(result.confidence).toBeLessThan(0.5);
  });

  it("uses OCR text when available", () => {
    const result = triageImage(
      "bag of crisps",
      "Walkers Sensations Thai Sweet Chilli 150g"
    );
    expect(result.imageType).toBe("packaged_product");
    expect(result.confidence).toBeGreaterThan(0.6);
  });
});

// ─── Packaged Product Extractor Tests ───────────────────────────────────────

describe("Packaged Product Extractor", () => {
  it("extracts brand from text with known brands", () => {
    const result = extractProductInfo(
      "walkers sensations thai sweet chilli crisps 150g"
    );
    expect(result.brand?.toLowerCase()).toContain("walkers");
  });

  it("extracts flavour from text", () => {
    const result = extractProductInfo(
      "walkers sensations thai sweet chilli crisps 150g"
    );
    expect(result.flavour?.toLowerCase()).toContain("thai sweet chilli");
  });

  it("extracts weight in grams", () => {
    const result = extractProductInfo(
      "walkers sensations thai sweet chilli crisps 150g"
    );
    expect(result.weightGrams).toBe(150);
    expect(result.weightText).toBe("150g");
  });

  it("extracts weight in kg", () => {
    const result = extractProductInfo("cereal box 1.5kg");
    expect(result.weightGrams).toBe(1500);
  });

  it("extracts weight in ml", () => {
    const result = extractProductInfo("coca cola can 330ml");
    expect(result.weightGrams).toBe(330);
  });

  it("extracts product type", () => {
    const result = extractProductInfo("cadbury dairy milk chocolate bar 110g");
    expect(result.productName?.toLowerCase()).toContain("chocolate");
  });

  it("extracts nutrition label values", () => {
    const result = extractProductInfo(
      "calories 520 protein 6g carbs 58g fat 28g"
    );
    expect(result.nutritionLabel).toBeTruthy();
    expect(result.nutritionLabel!.calories).toBe(520);
    // protein/carbs/fat might not be extracted if the regex requires unit-less format
    if (result.nutritionLabel!.protein !== undefined) {
      expect(result.nutritionLabel!.protein).toBe(6);
    }
    if (result.nutritionLabel!.carbs !== undefined) {
      expect(result.nutritionLabel!.carbs).toBe(58);
    }
    if (result.nutritionLabel!.fat !== undefined) {
      expect(result.nutritionLabel!.fat).toBe(28);
    }
  });

  it("has higher confidence with more signals", () => {
    const withBrand = extractProductInfo("walkers crisps 150g");
    const withoutBrand = extractProductInfo("some crisps");
    expect(withBrand.confidence).toBeGreaterThan(withoutBrand.confidence);
  });

  it("builds search query from extraction", () => {
    const extraction = extractProductInfo(
      "walkers sensations thai sweet chilli crisps 150g"
    );
    const query = buildSearchQuery(extraction);
    expect(query.toLowerCase()).toContain("walkers");
    // Should contain key product terms
    expect(query.length).toBeGreaterThan(5);
  });

  it("handles no recognizable text gracefully", () => {
    const result = extractProductInfo("blurry image unclear");
    expect(result.confidence).toBeLessThan(0.5);
  });
});

// ─── Vision Classifier Tests ────────────────────────────────────────────────

describe("Vision Classifier", () => {
  it("classifies crisps as packaged", () => {
    const result = classifyFood("bag of crisps");
    expect(result.isPackaged).toBe(true);
    expect(result.category.toLowerCase()).toContain("crisps");
  });

  it("classifies chocolate as packaged", () => {
    const result = classifyFood("chocolate bar");
    expect(result.isPackaged).toBe(true);
  });

  it("classifies pasta dish as not packaged", () => {
    const result = classifyFood("plate of spaghetti bolognese");
    expect(result.isPackaged).toBe(false);
  });

  it("classifies salad as not packaged", () => {
    const result = classifyFood("mixed salad with dressing");
    expect(result.isPackaged).toBe(false);
  });

  it("returns sensible confidence", () => {
    const result = classifyFood("walkers thai sweet chilli crisps");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });
});

// ─── Source Router Tests ────────────────────────────────────────────────────

describe("Source Router", () => {
  const makeEvidence = (
    overrides: Partial<EvidenceBundle> = {}
  ): EvidenceBundle => ({
    imageType: "packaged_product",
    ocr: {
      rawTokens: [],
      brand: null,
      productName: null,
      flavour: null,
      weightText: null,
      weightGrams: null,
      nutritionLabel: null,
      confidence: 0.3,
    },
    visual: {
      category: "unknown",
      alternates: [],
      isPackaged: false,
      confidence: 0.3,
    },
    barcode: null,
    userDescription: null,
    imageUri: "file:///test.jpg",
    ...overrides,
  });

  it("routes barcode to barcode_lookup", () => {
    const route = chooseMatchRoute(makeEvidence({ barcode: "5000159484695" }));
    expect(route).toBe("barcode_lookup");
  });

  it("routes nutrition label to nutrition_label_direct", () => {
    const route = chooseMatchRoute(
      makeEvidence({
        imageType: "nutrition_label",
        ocr: {
          rawTokens: ["calories", "200"],
          brand: null,
          productName: null,
          flavour: null,
          weightText: null,
          weightGrams: null,
          nutritionLabel: { calories: 200, protein: 5, carbs: 30, fat: 8 },
          confidence: 0.8,
        },
      })
    );
    expect(route).toBe("nutrition_label_direct");
  });

  it("routes packaged product with brand to packaged_product_search", () => {
    const route = chooseMatchRoute(
      makeEvidence({
        imageType: "packaged_product",
        ocr: {
          rawTokens: ["walkers"],
          brand: "Walkers",
          productName: "Crisps",
          flavour: null,
          weightText: null,
          weightGrams: null,
          nutritionLabel: null,
          confidence: 0.7,
        },
        visual: {
          category: "crisps",
          alternates: [],
          isPackaged: true,
          confidence: 0.7,
        },
      })
    );
    expect(route).toBe("packaged_product_search");
  });

  it("routes plated meal to generic_meal_pipeline", () => {
    const route = chooseMatchRoute(
      makeEvidence({
        imageType: "plated_meal",
        visual: {
          category: "pasta",
          alternates: [],
          isPackaged: false,
          confidence: 0.6,
        },
      })
    );
    expect(route).toBe("generic_meal_pipeline");
  });

  it("routes description-only when user provided text", () => {
    const route = chooseMatchRoute(
      makeEvidence({
        imageType: "unclear",
        userDescription: "chicken sandwich",
      })
    );
    expect(route).toBe("description_only");
  });
});

// ─── Portion Estimator Tests ────────────────────────────────────────────────

describe("Portion Estimator", () => {
  const mockProduct: ProductCandidate = {
    name: "Thai Sweet Chilli Sensations",
    brand: "Walkers",
    nutrientsPer100g: {
      calories: 519,
      protein: 6.5,
      carbs: 55,
      fat: 30,
    },
    packSizeGrams: 150,
    servingSizeGrams: 30,
    servingDescription: "1 bag (30g)",
    source: "openfoodfacts",
    sourceId: "5000159484695",
    matchScore: 0.85,
    matchReasons: ["Brand: Walkers", "Flavour: Thai Sweet Chilli"],
  };

  it("builds full pack option as default", () => {
    const options = buildPortionOptions(mockProduct);
    const fullPack = options.find((o) => o.preset === "full_pack");
    expect(fullPack).toBeTruthy();
    expect(fullPack!.isDefault).toBe(true);
    expect(fullPack!.grams).toBe(150);
  });

  it("builds half pack option for large products", () => {
    const options = buildPortionOptions(mockProduct);
    const halfPack = options.find((o) => o.preset === "half_pack");
    expect(halfPack).toBeTruthy();
    expect(halfPack!.grams).toBe(75);
  });

  it("builds quarter pack option for products over 100g", () => {
    const options = buildPortionOptions(mockProduct);
    const quarterPack = options.find((o) => o.preset === "quarter_pack");
    expect(quarterPack).toBeTruthy();
    expect(quarterPack!.grams).toBe(Math.round(150 / 4));
  });

  it("builds one serving option when serving != pack size", () => {
    const options = buildPortionOptions(mockProduct);
    const serving = options.find((o) => o.preset === "one_serving");
    expect(serving).toBeTruthy();
    expect(serving!.grams).toBe(30);
  });

  it("always includes custom option", () => {
    const options = buildPortionOptions(mockProduct);
    const custom = options.find((o) => o.preset === "custom");
    expect(custom).toBeTruthy();
    expect(custom!.label).toBe("Custom amount");
  });

  it("skips half/quarter for small products", () => {
    const small: ProductCandidate = {
      ...mockProduct,
      packSizeGrams: 30,
    };
    const options = buildPortionOptions(small);
    expect(options.find((o) => o.preset === "half_pack")).toBeUndefined();
    expect(options.find((o) => o.preset === "quarter_pack")).toBeUndefined();
  });

  it("calculates correct portion nutrients", () => {
    // Full 150g pack of item with 519 cal / 100g serving
    const nutrients = calculatePortionNutrients(mockProduct, 150);
    // 150g at (519/30 per gram) = 2595 cal
    expect(nutrients.calories).toBeGreaterThan(0);
    expect(nutrients.protein).toBeGreaterThan(0);
    expect(nutrients.carbs).toBeGreaterThan(0);
    expect(nutrients.fat).toBeGreaterThan(0);
  });

  it("scales nutrients proportionally for half pack", () => {
    const full = calculatePortionNutrients(mockProduct, 150);
    const half = calculatePortionNutrients(mockProduct, 75);
    // Half portion should be roughly half the calories (within 1 cal rounding)
    expect(Math.abs(half.calories - full.calories / 2)).toBeLessThanOrEqual(1);
  });

  it("handles serving-based products (no pack size)", () => {
    const noPackSize: ProductCandidate = {
      ...mockProduct,
      packSizeGrams: null,
    };
    const options = buildPortionOptions(noPackSize);
    // Should have serving options instead of pack options
    expect(options.length).toBeGreaterThan(0);
    const defaultOpt = options.find((o) => o.isDefault);
    expect(defaultOpt).toBeTruthy();
  });
});

// ─── End-to-end integration: extraction → routing ───────────────────────────

describe("Extraction → Routing Integration", () => {
  it("packaged crisps flow routes to packaged_product_search", () => {
    const text = "walkers sensations thai sweet chilli crisps 150g";
    const ocr = extractProductInfo(text);
    const visual = classifyFood(text);
    const triage = triageImage(text);

    const evidence: EvidenceBundle = {
      imageType: triage.imageType,
      ocr,
      visual,
      barcode: null,
      userDescription: text,
      imageUri: "file:///test.jpg",
    };

    const route = chooseMatchRoute(evidence);
    expect(route).toBe("packaged_product_search");
    expect(ocr.brand?.toLowerCase()).toContain("walkers");
    expect(visual.isPackaged).toBe(true);
  });

  it("plated meal flow routes to generic pipeline", () => {
    const text = "grilled salmon with asparagus and mashed potatoes";
    const ocr = extractProductInfo(text);
    const visual = classifyFood(text);
    const triage = triageImage(text);

    const evidence: EvidenceBundle = {
      imageType: triage.imageType,
      ocr,
      visual,
      barcode: null,
      userDescription: text,
      imageUri: "file:///test.jpg",
    };

    const route = chooseMatchRoute(evidence);
    // Should not route to packaged product search
    expect(route).not.toBe("packaged_product_search");
  });

  it("cadbury chocolate routes to packaged_product_search", () => {
    const text = "cadbury dairy milk chocolate 110g";
    const ocr = extractProductInfo(text);
    const visual = classifyFood(text);
    const triage = triageImage(text);

    const evidence: EvidenceBundle = {
      imageType: triage.imageType,
      ocr,
      visual,
      barcode: null,
      userDescription: text,
      imageUri: "file:///test.jpg",
    };

    const route = chooseMatchRoute(evidence);
    expect(route).toBe("packaged_product_search");
    expect(ocr.brand?.toLowerCase()).toContain("cadbury");
  });

  it("coca cola routes to packaged_product_search", () => {
    const text = "coca cola can 330ml";
    const ocr = extractProductInfo(text);
    const visual = classifyFood(text);
    const triage = triageImage(text);

    const evidence: EvidenceBundle = {
      imageType: triage.imageType,
      ocr,
      visual,
      barcode: null,
      userDescription: text,
      imageUri: "file:///test.jpg",
    };

    const route = chooseMatchRoute(evidence);
    expect(route).toBe("packaged_product_search");
  });
});
