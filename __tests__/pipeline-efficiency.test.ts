/**
 * Pipeline Efficiency Tests
 *
 * Verify that the nutrition pipeline skips unnecessary LLM calls
 * when the caller signals that LLM parsing is redundant.
 *
 * Key scenarios:
 *   - Camera fallback paths skip LLM (already ran or not needed)
 *   - Text/voice paths still use LLM when available
 *   - Barcode scans never touch the pipeline at all
 */

import { parseNutritionInput } from "../src/features/nutrition/parsing/nutrition-parser.service";

// Mock the local LLM service
const mockParseWithLocalLlm = jest.fn();
jest.mock("../src/features/nutrition/parsing/local-llm.service", () => ({
  parseWithLocalLlm: (...args: unknown[]) => mockParseWithLocalLlm(...args),
}));

describe("Pipeline Efficiency — skipLlm option", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: LLM returns a successful result
    mockParseWithLocalLlm.mockResolvedValue({
      success: true,
      items: [
        {
          name: "chicken",
          quantity: 1,
          unit: "serving",
          confidence: 0.9,
          rawFragment: "chicken",
        },
      ],
    });
  });

  it("calls LLM by default (no skipLlm)", async () => {
    const result = await parseNutritionInput("chicken breast", "text");

    expect(mockParseWithLocalLlm).toHaveBeenCalledTimes(1);
    expect(result.parseMethod).toBe("local-llm");
  });

  it("skips LLM when skipLlm: true and uses regex instead", async () => {
    const result = await parseNutritionInput("chicken breast", "image", {
      skipLlm: true,
    });

    expect(mockParseWithLocalLlm).not.toHaveBeenCalled();
    expect(result.parseMethod).toBe("regex");
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0].name).toContain("chicken");
  });

  it("skips LLM for ML Kit label input (camera fallback)", async () => {
    const result = await parseNutritionInput(
      "ice cream, chocolate, plate",
      "image",
      { skipLlm: true }
    );

    expect(mockParseWithLocalLlm).not.toHaveBeenCalled();
    expect(result.parseMethod).toBe("regex");
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("skips LLM for pre-captioned input (LLM already ran in captioning)", async () => {
    const result = await parseNutritionInput("2 eggs and toast", "image", {
      skipLlm: true,
    });

    expect(mockParseWithLocalLlm).not.toHaveBeenCalled();
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("still calls LLM for text input (user typed, no prior LLM)", async () => {
    const result = await parseNutritionInput(
      "grilled salmon with rice",
      "text"
    );

    expect(mockParseWithLocalLlm).toHaveBeenCalledTimes(1);
    expect(result.parseMethod).toBe("local-llm");
  });

  it("still calls LLM for voice input", async () => {
    await parseNutritionInput("I had a chicken sandwich", "voice");

    expect(mockParseWithLocalLlm).toHaveBeenCalledTimes(1);
  });

  it("falls back to regex when LLM fails (no skipLlm)", async () => {
    mockParseWithLocalLlm.mockResolvedValue({
      success: false,
      items: [],
      error: "Model not loaded",
    });

    const result = await parseNutritionInput("banana", "text");

    expect(mockParseWithLocalLlm).toHaveBeenCalledTimes(1);
    expect(result.parseMethod).toBe("regex");
    expect(result.items[0].name).toBe("banana");
  });

  it("returns empty items for empty input regardless of skipLlm", async () => {
    const result = await parseNutritionInput("", "text", { skipLlm: true });

    expect(mockParseWithLocalLlm).not.toHaveBeenCalled();
    expect(result.items).toHaveLength(0);
    expect(result.parseMethod).toBe("fallback");
  });
});
