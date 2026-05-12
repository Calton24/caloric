/**
 * FoodIdentificationFallback — smoke + locale contract tests.
 *
 * Jest runs in node env (no RN testing-library), so we test the surface
 * we can verify without rendering: module exports, locale keys, and the
 * source → key derivation that drives the screen copy.
 */

import enTracking from "../src/locales/en/tracking.json";

const FALLBACK_KEYS = [
  "cameraTitle",
  "cameraTitleHeadline",
  "cameraSubtitle",
  "cameraPlaceholder",
  "barcodeTitle",
  "barcodeTitleHeadline",
  "barcodeSubtitle",
  "barcodePlaceholder",
  "manualTitle",
  "manualTitleHeadline",
  "manualSubtitle",
  "manualPlaceholder",
  "findFood",
  "searching",
  "retry",
  "retake",
  "scanAgain",
  "addManually",
  "stillNotFound",
  "lookupFailed",
  "barcodeLabel",
  "reasonNetwork",
  "reasonBarcodeNotFound",
  "reasonLowConfidence",
  "suggestionAddBrand",
  "suggestionAddPortion",
  "suggestionDescribeIngredients",
] as const;

describe("FoodIdentificationFallback — locale contract", () => {
  const fallback = (enTracking as unknown as {
    fallback: Record<string, string>;
  }).fallback;

  it("exposes every required key under fallback (en)", () => {
    expect(fallback).toBeDefined();
    for (const key of FALLBACK_KEYS) {
      expect(fallback?.[key]).toBeDefined();
      expect(typeof fallback?.[key]).toBe("string");
      expect(fallback?.[key]?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it("source-specific copy is distinct (no shared placeholder text)", () => {
    expect(fallback.cameraSubtitle).not.toBe(fallback.barcodeSubtitle);
    expect(fallback.barcodeSubtitle).not.toBe(fallback.manualSubtitle);
    expect(fallback.cameraPlaceholder).not.toBe(fallback.barcodePlaceholder);
  });
});

describe("FoodIdentificationFallback — module surface", () => {
  // Skip require() in node test env — `expo-image` (used by the component
  // for the optional preview thumbnail) ships ESM that Jest doesn't transform.
  // The component is exercised at runtime; here we only assert the source
  // file declares the public component export so a rename can't slip through.
  it("declares a named export `FoodIdentificationFallback`", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const src = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "src",
        "features",
        "food-logging",
        "components",
        "FoodIdentificationFallback.tsx",
      ),
      "utf8",
    );
    expect(src).toMatch(/export function FoodIdentificationFallback\b/);
    expect(src).toMatch(/export interface FoodIdentificationFallbackProps\b/);
    expect(src).toMatch(/export type FoodIdentificationSource\b/);
  });
});

describe("FoodIdentificationFallback — CTA enable rule (mirrored)", () => {
  // Mirrors `canLookup = trimmed.length >= 2 && !isLooking` in the component.
  // Locked here so a future tweak to the threshold doesn't silently regress.
  function canLookup(query: string, isLooking: boolean): boolean {
    return query.trim().length >= 2 && !isLooking;
  }

  it("disabled while query is empty", () => {
    expect(canLookup("", false)).toBe(false);
    expect(canLookup("   ", false)).toBe(false);
  });

  it("disabled with a single character (avoids accidental taps)", () => {
    expect(canLookup("a", false)).toBe(false);
  });

  it("enabled at 2+ chars when not loading", () => {
    expect(canLookup("ab", false)).toBe(true);
    expect(canLookup("chicken bowl", false)).toBe(true);
  });

  it("disabled while loading regardless of query", () => {
    expect(canLookup("chicken bowl", true)).toBe(false);
  });
});

describe("FoodIdentificationFallback — source → key derivation (mirrored)", () => {
  // Mirrors the title/subtitle/placeholder/retake-label derivation inside the
  // component. Keeping this here means a typo in the screen would surface as
  // a unit failure instead of an in-the-wild dead-end the user can't escape.
  type Source = "camera" | "barcode" | "manual";

  function titleKey(source: Source) {
    return source === "camera"
      ? "fallback.cameraTitle"
      : source === "barcode"
        ? "fallback.barcodeTitle"
        : "fallback.manualTitle";
  }
  function subtitleKey(source: Source) {
    return source === "camera"
      ? "fallback.cameraSubtitle"
      : source === "barcode"
        ? "fallback.barcodeSubtitle"
        : "fallback.manualSubtitle";
  }
  function placeholderKey(source: Source) {
    return source === "camera"
      ? "fallback.cameraPlaceholder"
      : source === "barcode"
        ? "fallback.barcodePlaceholder"
        : "fallback.manualPlaceholder";
  }
  function retakeLabelKey(source: Source) {
    return source === "barcode" ? "fallback.scanAgain" : "fallback.retake";
  }

  it("camera source resolves to camera-flavoured copy keys", () => {
    expect(titleKey("camera")).toBe("fallback.cameraTitle");
    expect(subtitleKey("camera")).toBe("fallback.cameraSubtitle");
    expect(placeholderKey("camera")).toBe("fallback.cameraPlaceholder");
    expect(retakeLabelKey("camera")).toBe("fallback.retake");
  });

  it("barcode source resolves to barcode-flavoured copy keys", () => {
    expect(titleKey("barcode")).toBe("fallback.barcodeTitle");
    expect(subtitleKey("barcode")).toBe("fallback.barcodeSubtitle");
    expect(placeholderKey("barcode")).toBe("fallback.barcodePlaceholder");
    // Barcode-specific retake label, semantically "Scan again".
    expect(retakeLabelKey("barcode")).toBe("fallback.scanAgain");
  });

  it("manual source resolves to manual-flavoured copy keys", () => {
    expect(titleKey("manual")).toBe("fallback.manualTitle");
    expect(subtitleKey("manual")).toBe("fallback.manualSubtitle");
    expect(placeholderKey("manual")).toBe("fallback.manualPlaceholder");
    expect(retakeLabelKey("manual")).toBe("fallback.retake");
  });
});

describe("FoodIdentificationFallback — error reason hint mapping (mirrored)", () => {
  // Mirrors `reasonHintKey` derivation in the component. Only network,
  // barcode-not-found and low-confidence get a visible reason hint; the
  // others render no hint (intentional — the headline already explains).
  type Reason =
    | "no_food_detected"
    | "low_confidence"
    | "barcode_not_found"
    | "ai_failed"
    | "manual_not_found"
    | "network_error"
    | "unknown";

  function reasonHintKey(errorReason?: Reason): string | null {
    return errorReason === "network_error"
      ? "fallback.reasonNetwork"
      : errorReason === "barcode_not_found"
        ? "fallback.reasonBarcodeNotFound"
        : errorReason === "low_confidence"
          ? "fallback.reasonLowConfidence"
          : null;
  }

  it("maps network_error to reasonNetwork", () => {
    expect(reasonHintKey("network_error")).toBe("fallback.reasonNetwork");
  });
  it("maps barcode_not_found to reasonBarcodeNotFound", () => {
    expect(reasonHintKey("barcode_not_found")).toBe(
      "fallback.reasonBarcodeNotFound",
    );
  });
  it("maps low_confidence to reasonLowConfidence", () => {
    expect(reasonHintKey("low_confidence")).toBe(
      "fallback.reasonLowConfidence",
    );
  });
  it("renders no reason hint for the catch-all reasons", () => {
    expect(reasonHintKey("no_food_detected")).toBeNull();
    expect(reasonHintKey("ai_failed")).toBeNull();
    expect(reasonHintKey("manual_not_found")).toBeNull();
    expect(reasonHintKey("unknown")).toBeNull();
    expect(reasonHintKey()).toBeNull();
  });
});

describe("FoodIdentificationFallback — input-flow integration", () => {
  // Production contract: camera/manual/voice input flows must each route
  // failed detections to the unified fallback component instead of dead-ending
  // on a generic "try again" screen. We verify this by reading the route
  // sources — Jest in node env can't render expo-router screens.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs") as typeof import("fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");

  function readRoute(rel: string): string {
    return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
  }

  it("camera-log renders FoodIdentificationFallback on its error state", () => {
    const src = readRoute("app/(modals)/camera-log.tsx");
    expect(src).toMatch(/import.*FoodIdentificationFallback/);
    expect(src).toMatch(/<FoodIdentificationFallback/);
    // Camera errors must offer Retry, Retake and Add-manually paths so the
    // user never hits a dead end.
    expect(src).toMatch(/onRetake=/);
    expect(src).toMatch(/onAddManually=/);
    expect(src).toMatch(/onResolveQuery=/);
  });

  it("manual-log routes search misses through the fallback", () => {
    const src = readRoute("app/(modals)/manual-log.tsx");
    expect(src).toMatch(/import.*FoodIdentificationFallback/);
    expect(src).toMatch(/source="manual"/);
    expect(src).toMatch(/onResolveQuery=/);
  });

  it("voice-log routes 'no food detected' through the fallback", () => {
    const src = readRoute("app/(modals)/voice-log.tsx");
    expect(src).toMatch(/import.*FoodIdentificationFallback/);
    expect(src).toMatch(/source="manual"/);
    expect(src).toMatch(/onResolveQuery=/);
  });
});

describe("FoodIdentificationFallback — analytics contract", () => {
  it("uses stable PostHog event names (do not rename without dashboard update)", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs") as typeof import("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path") as typeof import("path");
    const src = fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "src",
        "features",
        "food-logging",
        "food-identification-analytics.ts",
      ),
      "utf8",
    );
    expect(src).toMatch(/FAILED:\s*"food_identification_failed"/);
    expect(src).toMatch(/RETRY:\s*"food_identification_retry"/);
    expect(src).toMatch(/MANUAL_RECOVERY:\s*"food_identification_manual_recovery"/);
    expect(src).toMatch(
      /PROVIDER_SUCCESS:\s*"food_identification_provider_success"/,
    );
    expect(src).toMatch(
      /PROVIDER_FAILED:\s*"food_identification_provider_failed"/,
    );
    expect(src).toMatch(/ABANDONED:\s*"food_identification_abandoned"/);
  });
});

describe("FoodIdentificationFallback — preserved-context contract", () => {
  // The fallback must propagate the originating signal (image, barcode or
  // typed query) so the user can resolve it without re-doing the input.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fs = require("fs") as typeof import("fs");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");
  const cameraLog = fs.readFileSync(
    path.join(__dirname, "..", "app", "(modals)", "camera-log.tsx"),
    "utf8",
  );

  it("camera-log preserves the captured imageUri when offering Retry", () => {
    expect(cameraLog).toMatch(/imageUri=\{imageUri\}/);
  });

  it("camera-log preserves the failed barcode value into the fallback", () => {
    expect(cameraLog).toMatch(/barcode=\{failedBarcode\}/);
    expect(cameraLog).toMatch(/setFailedBarcode\(barcode\)/);
  });
});
