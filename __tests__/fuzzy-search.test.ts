/**
 * Fuzzy/Trigram Search Tests
 *
 * TDD tests for R2: Add pg_trgm-based fuzzy search as a fallback
 * when full-text search returns no results. Catches typos like
 * "mccains" → "McCain's", "warburtins" → "Warburtons".
 */

// ── Module-level mock ───────────────────────────────────────────────────────

// ── Import ──────────────────────────────────────────────────────────────────

import { searchDataset } from "../src/features/nutrition/matching/dataset-lookup.service";

const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockClient = {
  from: mockFrom,
  rpc: mockRpc,
};

jest.mock("../src/lib/supabase/client", () => ({
  getSupabaseClient: jest.fn(() => mockClient),
}));

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeRow(name: string, brand?: string) {
  return {
    source_id: `test-${name}`,
    name,
    brand: brand ?? null,
    category: null,
    calories_per_100g: 200,
    protein_per_100g: 10,
    carbs_per_100g: 25,
    fat_per_100g: 8,
    fiber_per_100g: null,
    sugar_per_100g: null,
    sodium_per_100g: null,
    serving_size_g: 100,
    serving_desc: "100g",
    household_serving: null,
    data_quality: null,
    dataset: "off",
    similarity_score: 0.6,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("Fuzzy/Trigram Search (R2)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("falls back to trigram RPC when FTS returns no results", async () => {
    // FTS returns nothing
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        textSearch: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    // Trigram RPC returns a result
    mockRpc.mockResolvedValueOnce({
      data: [makeRow("McCain's Thin & Crispy Chips", "McCain's")],
      error: null,
    });

    const results = await searchDataset("mccains chips", 5);

    expect(mockRpc).toHaveBeenCalledWith("search_nutrition_fuzzy", {
      search_query: "mccains chips",
      result_limit: 5,
    });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].name).toBe("McCain's Thin & Crispy Chips");
  });

  it("does NOT call trigram RPC when FTS finds results", async () => {
    // FTS returns results
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        textSearch: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({
            data: [makeRow("Chicken Breast")],
            error: null,
          }),
        }),
      }),
    });

    const results = await searchDataset("chicken breast", 5);

    expect(mockRpc).not.toHaveBeenCalledWith(
      "search_nutrition_fuzzy",
      expect.anything()
    );
    expect(results.length).toBe(1);
  });

  it("returns fuzzy results with lower match scores than FTS", async () => {
    // FTS returns nothing
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        textSearch: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    // Trigram RPC returns results with similarity scores
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          ...makeRow("Warburtons Toastie White Bread", "Warburtons"),
          similarity_score: 0.5,
        },
      ],
      error: null,
    });

    const results = await searchDataset("warburtins bread", 5);

    expect(results.length).toBe(1);
    // Fuzzy match scores should be < 0.9 (FTS exacts are 0.92-0.98)
    expect(results[0].matchScore).toBeLessThan(0.9);
  });

  it("returns empty array when both FTS and trigram return nothing", async () => {
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnValue({
        textSearch: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    mockRpc.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const results = await searchDataset("xyznonexistent", 5);

    expect(results).toEqual([]);
  });
});
