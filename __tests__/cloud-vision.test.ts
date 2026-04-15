/**
 * Cloud Vision Fallback Tests
 *
 * TDD tests for R1: Wire GPT-4o-mini meal analysis into the camera pipeline
 * as a fallback for plated meals when local LLM is unavailable.
 *
 * The existing `analyzeMealImage` service (Edge Function → gpt-4o-mini)
 * should be invoked between "local LLM" and "ML Kit labels" stages
 * in `startFromImage`.
 */

// ── Module-level mock factories ─────────────────────────────────────────────

// ── Imports ─────────────────────────────────────────────────────────────────

import { renderHook } from "@testing-library/react-native";
import { useLoggingFlow } from "../src/features/nutrition/use-logging-flow";

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), dismissAll: jest.fn(), back: jest.fn() },
}));

jest.mock("../src/lib/supabase/client", () => ({
  getSupabaseClient: jest.fn(),
}));

jest.mock(
  "../src/features/image-analysis/ocr/text-recognition.service",
  () => ({
    extractTextFromImage: jest.fn(),
  })
);

jest.mock("../src/features/image-analysis/ocr/image-labeling.service", () => ({
  labelFoodImage: jest.fn(),
}));

jest.mock("../src/features/nutrition/parsing/local-llm.service", () => ({
  isLocalLlmReady: jest.fn(),
  parseImageWithLocalLlm: jest.fn(),
}));

jest.mock("../src/features/nutrition/image/image-captioning.service", () => ({
  captionFoodImage: jest.fn(),
}));

jest.mock("../src/features/image-analysis/pipeline", () => ({
  analyzeImage: jest.fn(),
}));

jest.mock("../src/features/nutrition/nutrition-pipeline", () => ({
  runNutritionPipeline: jest.fn(),
  mealEstimateToDraft: jest.fn(),
}));

jest.mock("../src/features/nutrition/memory/food-memory.service", () => ({
  rebuildFoodMemory: jest.fn(),
}));

jest.mock("../src/features/nutrition/matching/dataset-lookup.service", () => ({
  lookupBarcode: jest.fn(),
}));

jest.mock("../src/features/nutrition/matching/openfoodfacts.service", () => ({
  lookupBarcode: jest.fn(),
}));

jest.mock("../src/features/nutrition/nutrition-parser.service", () => ({
  parseMealInput: jest.fn(),
}));

jest.mock(
  "../src/features/nutrition/validation/food-validator.service",
  () => ({
    validateFoodResult: jest.fn(),
  })
);

const mockSetDraft = jest.fn();

jest.mock("../src/features/nutrition/nutrition.draft.store", () => ({
  useNutritionDraftStore: jest.fn(),
}));

jest.mock("../src/features/nutrition/nutrition.store", () => ({
  useNutritionStore: jest.fn(),
}));

jest.mock("../src/features/nutrition/ontology/food-emoji", () => ({
  getFoodEmoji: jest.fn(),
}));

jest.mock("../src/features/nutrition/nutrition.helpers", () => ({
  buildMealEntryFromDraft: jest.fn(),
}));

jest.mock("../src/features/meal-analysis/meal-analysis.service", () => ({
  analyzeMealImage: jest.fn(),
  MealAnalysisError: class MealAnalysisError extends Error {
    code: string;
    constructor(msg: string, code: string) {
      super(msg);
      this.code = code;
    }
  },
}));

// ── Re-apply implementations after resetMocks strips them ───────────────────

function applyDefaultMocks() {
  const {
    useNutritionDraftStore,
  } = require("../src/features/nutrition/nutrition.draft.store");
  useNutritionDraftStore.mockImplementation((selector: any) => {
    const store = {
      draft: null,
      setDraft: mockSetDraft,
      updateDraft: jest.fn(),
      clearDraft: jest.fn(),
    };
    return selector(store);
  });

  const {
    useNutritionStore,
  } = require("../src/features/nutrition/nutrition.store");
  useNutritionStore.mockImplementation((selector: any) => {
    const store = { meals: [], addMeal: jest.fn() };
    return selector(store);
  });

  const {
    extractTextFromImage,
  } = require("../src/features/image-analysis/ocr/text-recognition.service");
  extractTextFromImage.mockResolvedValue(null);

  const { analyzeImage } = require("../src/features/image-analysis/pipeline");
  analyzeImage.mockResolvedValue(null);

  const {
    isLocalLlmReady,
  } = require("../src/features/nutrition/parsing/local-llm.service");
  isLocalLlmReady.mockReturnValue(false);

  const {
    captionFoodImage,
  } = require("../src/features/nutrition/image/image-captioning.service");
  captionFoodImage.mockResolvedValue({
    success: false,
    items: [],
    method: "fallback-prompt",
  });

  const {
    labelFoodImage,
  } = require("../src/features/image-analysis/ocr/image-labeling.service");
  labelFoodImage.mockResolvedValue("");

  const {
    runNutritionPipeline,
    mealEstimateToDraft,
  } = require("../src/features/nutrition/nutrition-pipeline");
  runNutritionPipeline.mockResolvedValue({
    items: [
      {
        parsed: {
          name: "chicken",
          quantity: 1,
          unit: "serving",
          confidence: 0.8,
        },
        selectedMatch: {
          source: "local",
          name: "chicken",
          nutrients: { calories: 230, protein: 31, carbs: 0, fat: 10 },
        },
        matchConfidence: 0.8,
      },
    ],
    totalCalories: 230,
  });
  mealEstimateToDraft.mockImplementation((est: any) => ({
    title: est?.items?.[0]?.parsed?.name || "meal",
    source: "text",
    rawInput: "chicken",
    calories: 230,
    protein: 31,
    carbs: 0,
    fat: 10,
    confidence: 0.8,
    parseMethod: "pipeline",
  }));

  const {
    validateFoodResult,
  } = require("../src/features/nutrition/validation/food-validator.service");
  validateFoodResult.mockReturnValue({
    valid: true,
    confidenceMultiplier: 0.9,
    issues: [],
  });

  const {
    getFoodEmoji,
  } = require("../src/features/nutrition/ontology/food-emoji");
  getFoodEmoji.mockReturnValue("🍽️");
}

// ── Cloud vision result factory ─────────────────────────────────────────────

function makeCloudVisionResult(overrides?: Record<string, any>) {
  return {
    sessionId: "test-session",
    decomposition: {
      mealSummary: "grilled chicken with rice",
      containerType: "plate",
      foods: [
        {
          label: "grilled chicken",
          portion: { grams: 150 },
          confidence: 0.85,
          relativeArea: 0.4,
        },
        {
          label: "white rice",
          portion: { grams: 200 },
          confidence: 0.9,
          relativeArea: 0.4,
        },
      ],
      sceneConfidence: 0.87,
    },
    items: [
      {
        detected: {
          label: "grilled chicken",
          portion: { grams: 150 },
          confidence: 0.85,
        },
        resolvedName: "chicken",
        nutrients: { calories: 250, protein: 38, carbs: 0, fat: 10 },
        confidence: { overall: 0.85 },
        needsReview: false,
      },
      {
        detected: {
          label: "white rice",
          portion: { grams: 200 },
          confidence: 0.9,
        },
        resolvedName: "rice",
        nutrients: { calories: 260, protein: 5, carbs: 57, fat: 1 },
        confidence: { overall: 0.9 },
        needsReview: false,
      },
    ],
    totals: { calories: 510, protein: 43, carbs: 57, fat: 11 },
    confidenceBand: "high",
    overallConfidence: 0.87,
    modelLatencyMs: 1500,
    totalLatencyMs: 2000,
    imageUri: "file:///test/image.jpg",
    caveats: [],
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

function getAnalyzeMock() {
  const {
    analyzeMealImage,
  } = require("../src/features/meal-analysis/meal-analysis.service");
  return analyzeMealImage as jest.Mock;
}

describe("Cloud Vision Fallback (R1)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    applyDefaultMocks();
  });

  it("calls analyzeMealImage when image pipeline returns null and local LLM is not ready", async () => {
    getAnalyzeMock().mockResolvedValueOnce(makeCloudVisionResult());

    const { result } = renderHook(() => useLoggingFlow());
    const success = await result.current.startFromImage(
      "file:///test/image.jpg",
      "chicken and rice"
    );

    expect(getAnalyzeMock()).toHaveBeenCalledWith(
      "file:///test/image.jpg",
      "chicken and rice"
    );
    expect(success).toBe(true);
    expect(mockSetDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "camera",
        calories: 510,
        protein: 43,
        carbs: 57,
        fat: 11,
      })
    );
  });

  it("falls through to ML Kit labels when cloud vision fails", async () => {
    getAnalyzeMock().mockRejectedValueOnce(new Error("Network error"));

    const {
      labelFoodImage,
    } = require("../src/features/image-analysis/ocr/image-labeling.service");
    labelFoodImage.mockResolvedValueOnce("chicken, rice, plate");

    const { result } = renderHook(() => useLoggingFlow());
    const success = await result.current.startFromImage(
      "file:///test/image.jpg"
    );

    expect(getAnalyzeMock()).toHaveBeenCalled();
    expect(success).toBe(true);
  });

  it("falls through to ML Kit when cloud vision returns no items", async () => {
    getAnalyzeMock().mockResolvedValueOnce(
      makeCloudVisionResult({
        items: [],
        totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        overallConfidence: 0.2,
      })
    );

    const {
      labelFoodImage,
    } = require("../src/features/image-analysis/ocr/image-labeling.service");
    labelFoodImage.mockResolvedValueOnce("food, plate");

    const { result } = renderHook(() => useLoggingFlow());
    const success = await result.current.startFromImage(
      "file:///test/blurry.jpg"
    );

    expect(getAnalyzeMock()).toHaveBeenCalled();
    expect(success).toBe(true);
  });

  it("does NOT call cloud vision when local LLM is ready", async () => {
    const {
      isLocalLlmReady,
    } = require("../src/features/nutrition/parsing/local-llm.service");
    isLocalLlmReady.mockReturnValue(true);

    const {
      captionFoodImage,
    } = require("../src/features/nutrition/image/image-captioning.service");
    captionFoodImage.mockResolvedValueOnce({
      success: true,
      items: [
        {
          name: "chicken",
          quantity: 1,
          unit: "serving",
          confidence: 0.8,
          preparation: "grilled",
          rawFragment: "grilled chicken",
        },
      ],
      method: "local-llm",
    });

    const { result } = renderHook(() => useLoggingFlow());
    await result.current.startFromImage("file:///test/image.jpg", "chicken");

    expect(getAnalyzeMock()).not.toHaveBeenCalled();
  });

  it("sets source as 'camera' and parseMethod containing 'cloud-vision' in draft", async () => {
    getAnalyzeMock().mockResolvedValueOnce(
      makeCloudVisionResult({
        items: [
          {
            detected: {
              label: "banana",
              portion: { grams: 120 },
              confidence: 0.95,
            },
            resolvedName: "banana",
            nutrients: { calories: 105, protein: 1, carbs: 27, fat: 0 },
            confidence: { overall: 0.95 },
            needsReview: false,
          },
        ],
        totals: { calories: 105, protein: 1, carbs: 27, fat: 0 },
        overallConfidence: 0.95,
      })
    );

    const { result } = renderHook(() => useLoggingFlow());
    await result.current.startFromImage("file:///test/banana.jpg");

    expect(mockSetDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "camera",
        parseMethod: expect.stringContaining("cloud-vision"),
      })
    );
  });
});
