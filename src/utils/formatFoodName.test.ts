import { formatFoodName } from "./formatFoodName";

describe("formatFoodName", () => {
  it("title-cases ALL CAPS protein names", () => {
    expect(formatFoodName("CHICKEN BREAST")).toBe("Chicken Breast");
  });

  it("title-cases ALL CAPS branded barcode-style names", () => {
    expect(formatFoodName("HEINZ — HEINZ KETCHUP")).toBe("Heinz — Heinz Ketchup");
  });

  it("preserves known uppercase size/region tokens", () => {
    expect(formatFoodName("protein bar xl")).toBe("Protein Bar XL");
  });

  it("lowercases small words in the middle", () => {
    expect(formatFoodName("PASTA WITH TOMATO SAUCE")).toBe(
      "Pasta with Tomato Sauce"
    );
  });

  it("replaces ASCII ellipsis with typographic ellipsis", () => {
    expect(formatFoodName("YOGURT WITH...")).toBe("Yogurt with…");
  });
});
